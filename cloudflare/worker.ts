/*
 * Custom Worker entry: wraps the OpenNext handler and answers byte-range requests for the scene videos.
 *
 * Cloudflare's static-assets binding returns the whole file and ignores Range. Safari (iPhone, iPad and
 * Mac) will not play a video unless the server answers Range with 206 Partial Content, so requests for
 * /scene/clouds-v2/* run through this Worker first (wrangler.jsonc: assets.run_worker_first) and are
 * sliced here. Everything else goes straight to OpenNext.
 * See https://opennext.js.org/cloudflare/howtos/custom-worker
 */
// `.open-next/worker.js` is generated at build time by `opennextjs-cloudflare build`; it may or may not exist
// when type-checking, so @ts-ignore (not @ts-expect-error) as in the OpenNext docs.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as openNext } from "../.open-next/worker.js";

interface Env {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
}

const VIDEO = /^\/scene\/clouds-v2\/[^/]+\.(?:mp4|webm)$/;

/** Parses a single "bytes=start-end" range. Returns null for absent or multi-range headers. */
function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null; // multi-range or malformed: fall back to the whole file
  const [, a, b] = m;
  if (a === "" && b === "") return "invalid";
  let start: number;
  let end: number;
  if (a === "") {
    // suffix range: the last N bytes
    const n = Number(b);
    if (n === 0) return "invalid";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(a);
    end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

async function serveVideo(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: "GET" }));
  if (!asset.ok) return asset;

  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const headers = new Headers(asset.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.delete("Content-Encoding");

  const range = parseRange(request.headers.get("Range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const head = request.method === "HEAD";
  if (!range) {
    headers.set("Content-Length", String(size));
    return new Response(head ? null : body, { status: 200, headers });
  }
  const { start, end } = range;
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(head ? null : body.slice(start, end + 1), { status: 206, headers });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && VIDEO.test(url.pathname)) {
      return serveVideo(request, env);
    }
    return openNext.fetch(request, env, ctx);
  },
};

export default worker;
