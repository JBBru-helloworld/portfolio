/*
 * Fly-through frames: loaded once the intro is over and the browser is idle, decoded to ImageBitmaps,
 * kept in memory, and drawn to a full-screen canvas with "cover" scaling.
 */

const CONCURRENCY = 6;

export interface FlyLoadStats {
  startedAt: number;
  finishedAt: number | null;
  bytes: number;
  loaded: number;
  total: number;
}

export class FlyFrames {
  readonly frames: (ImageBitmap | null)[];
  still: ImageBitmap | null = null;
  readonly stats: FlyLoadStats;
  private readonly abort = new AbortController();
  private started = false;

  constructor(
    private readonly urls: string[],
    private readonly stillUrl: string,
    private readonly onReady: () => void,
  ) {
    this.frames = urls.map(() => null);
    this.stats = { startedAt: 0, finishedAt: null, bytes: 0, loaded: 0, total: urls.length };
  }

  private async fetchBitmap(url: string): Promise<ImageBitmap | null> {
    try {
      const res = await fetch(url, { signal: this.abort.signal });
      if (!res.ok) return null;
      const blob = await res.blob();
      this.stats.bytes += blob.size;
      return await createImageBitmap(blob);
    } catch {
      return null; // aborted or undecodable: the nearest loaded frame stands in
    }
  }

  /** Starts loading (once): the whiteout still first, then every frame in order, a few at a time. */
  load(): void {
    if (this.started) return;
    this.started = true;
    this.stats.startedAt = performance.now();
    void (async () => {
      this.still = await this.fetchBitmap(this.stillUrl);
      this.onReady();
      let next = 0;
      const worker = async () => {
        while (next < this.urls.length && !this.abort.signal.aborted) {
          const i = next++;
          const bmp = await this.fetchBitmap(this.urls[i]);
          if (bmp) {
            this.frames[i] = bmp;
            this.stats.loaded++;
            this.onReady();
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      this.stats.finishedAt = performance.now();
    })();
  }

  /** The requested frame, or the nearest one that has loaded, or null. */
  nearest(index: number): ImageBitmap | null {
    for (let d = 0; d < this.frames.length; d++) {
      const a = this.frames[index - d];
      if (a) return a;
      const b = this.frames[index + d];
      if (b) return b;
    }
    return null;
  }

  dispose(): void {
    this.abort.abort();
    for (const f of this.frames) f?.close();
    this.still?.close();
  }
}

/** Draws a bitmap to fill the canvas ("cover"), centred. */
export function drawCover(ctx: CanvasRenderingContext2D, bmp: ImageBitmap, w: number, h: number): void {
  const s = Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * s;
  const dh = bmp.height * s;
  ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
