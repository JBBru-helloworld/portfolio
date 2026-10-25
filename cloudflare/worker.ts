/*
 * Custom Worker entry: wraps the OpenNext handler, answers byte-range requests for the scene videos, and
 * runs the passenger counter (POST /api/passenger, a Durable Object; Phase 5d).
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
import { DurableObject } from "cloudflare:workers";
import { SECURITY_HEADERS } from "./security-headers";

interface Env {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  PASSENGER_COUNTER: DurableObjectNamespace<PassengerCounter>;
  /** The per-client rate limit. Optional: if the account cannot have it, the counter's global cap applies. */
  PASSENGER_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

// ---------- The passenger counter ----------

/**
 * One number: how many browsers have asked for a passenger number. SQLite storage (the backend the Workers
 * Free plan offers): the count, and the current minute's start and count for the fallback cap; no IP
 * addresses, user agents or anything personal.
 */
export class PassengerCounter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL)");
      ctx.storage.sql.exec("INSERT OR IGNORE INTO counter (id, value) VALUES (1, 0)");
      ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS minute (id INTEGER PRIMARY KEY CHECK (id = 1), start INTEGER NOT NULL, count INTEGER NOT NULL)");
      ctx.storage.sql.exec("INSERT OR IGNORE INTO minute (id, start, count) VALUES (1, 0, 0)");
    });
  }

  /**
   * Counts one more passenger and returns their number. With `cap` (the fallback when the per-client rate
   * limit is unavailable), at most `cap` new passengers a minute in total: past it, null. The object handles
   * one request at a time, so the check and the count cannot race.
   */
  async next(cap?: number): Promise<number | null> {
    if (cap !== undefined) {
      const now = Date.now();
      const m = this.ctx.storage.sql.exec<{ start: number; count: number }>("SELECT start, count FROM minute WHERE id = 1").one();
      const fresh = now - m.start >= 60_000;
      if (!fresh && m.count >= cap) return null;
      this.ctx.storage.sql.exec("UPDATE minute SET start = ?, count = ? WHERE id = 1", fresh ? now : m.start, fresh ? 1 : m.count + 1);
    }
    return this.ctx.storage.sql.exec<{ value: number }>("UPDATE counter SET value = value + 1 WHERE id = 1 RETURNING value").one().value;
  }
}

/** New passengers a minute, in total, when the per-client rate limit is unavailable (Phase 7a fixes). */
const GLOBAL_CAP = 30;

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|httpclient|axios|node-fetch|undici|go-http|java\/|libwww|scrapy|facebookexternalhit|embedly/i;

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });

/** The rate limiter's key: a hash of the client address, so the address itself is never passed on or kept. */
async function clientKey(request: Request): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`jbbru-passenger:${ip}`));
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * POST /api/passenger: same-origin, no body, not a bot, a few calls per client a minute. Returns
 * {"passenger": n}. Anything else is a small JSON error the page simply ignores.
 */
async function passenger(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (origin !== url.origin || (site !== null && site !== "same-origin")) return json({ error: "forbidden" }, 403);
  const length = request.headers.get("Content-Length");
  if ((length !== null && length !== "0") || request.headers.has("Transfer-Encoding")) return json({ error: "no_body_expected" }, 400);
  const ua = request.headers.get("User-Agent") ?? "";
  if (!ua || BOT.test(ua)) return json({ error: "forbidden" }, 403);
  // The per-client limit when the account has it; otherwise (missing or failing) the global cap.
  let cap: number | undefined = GLOBAL_CAP;
  if (env.PASSENGER_LIMIT) {
    try {
      const { success } = await env.PASSENGER_LIMIT.limit({ key: await clientKey(request) });
      if (!success) return json({ error: "rate_limited" }, 429);
      cap = undefined;
    } catch {
      // The binding is there but unavailable: fall back to the global cap.
    }
  }
  const counter = env.PASSENGER_COUNTER.get(env.PASSENGER_COUNTER.idFromName("passengers"));
  const n = await counter.next(cap);
  if (n === null) return json({ error: "rate_limited" }, 429);
  return json({ passenger: n }, 200);
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

// ---------- Security headers (Phase 7a) ----------

function secured(response: Response): Response {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  return out;
}

async function route(request: Request, env: Env, ctx: unknown): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/passenger") return passenger(request, env);
  if ((request.method === "GET" || request.method === "HEAD") && VIDEO.test(url.pathname)) {
    return serveVideo(request, env);
  }
  return openNext.fetch(request, env, ctx);
}

const worker = {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    return secured(await route(request, env, ctx));
  },
};

export default worker;
