// Temporary style sheet page for Phase 1c. Replaced in Phase 2.

const swatches = [
  { token: "--void", hex: "#0A0A0A", ratio: "1.00", note: "page" },
  { token: "--cabin", hex: "#141414", ratio: "1.07", note: "raised" },
  { token: "--graphite-1", hex: "#1E1E1E", ratio: "1.19", note: "hairline" },
  { token: "--graphite-2", hex: "#333333", ratio: "1.57", note: "divider" },
  { token: "--graphite-3", hex: "#636363", ratio: "3.30", note: "border" },
  { token: "--graphite-4", hex: "#8A8A8A", ratio: "5.73", note: "muted text" },
  { token: "--paper-muted", hex: "#BEBEBB", ratio: "10.63", note: "secondary" },
  { token: "--paper", hex: "#F5F5F2", ratio: "18.13", note: "text" },
  { token: "--amber", hex: "#D1A56F", ratio: "8.79", note: "accent" },
  { token: "--error", hex: "#D8796F", ratio: "6.49", note: "errors" },
  { token: "--ink-za", hex: "#59705B", ratio: "3.67", note: "stamps only" },
  { token: "--ink-mu", hex: "#94554E", ratio: "3.46", note: "stamps only" },
  { token: "--ink-my", hex: "#5B6983", ratio: "3.58", note: "stamps only" },
];

export default function StyleSheet() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-8 sm:py-24">
      <header className="flex flex-col gap-6">
        <p className="font-mono text-xs uppercase text-graphite-4">Style sheet · temporary</p>
        <h1 className="text-display font-medium text-balance">
          A calm view from the <span className="accent-serif">window</span> seat
        </h1>
        <p className="measure text-lg text-paper-muted text-pretty">
          Monochrome, cinematic and precise, with one refined amber accent kept for focus and a
          single highlight per section. Body copy sits at a comfortable measure of about sixty
          to seventy-five characters, so long case studies stay easy to read.
        </p>
        <p className="font-mono text-sm tabular-nums text-paper">
          KUL 08:45 · DEPARTED · 4.00 CGPA · 0123456789
        </p>
      </header>

      <section aria-labelledby="type-heading" className="flex flex-col gap-4">
        <h2 id="type-heading" className="text-3xl font-medium">
          Type scale
        </h2>
        <p className="text-4xl font-medium">Heading one</p>
        <p className="text-2xl font-medium">Heading three</p>
        <p className="text-xl font-medium">Heading four</p>
        <p className="measure text-base text-paper-muted">
          Body text in Instrument Sans at sixteen to seventeen pixels with generous leading.
        </p>
        <p className="text-sm text-graphite-4">Caption and meta text</p>
      </section>

      <section aria-labelledby="focus-heading" className="flex flex-col gap-4">
        <h2 id="focus-heading" className="text-3xl font-medium">
          Focus
        </h2>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            data-motion="press"
            className="rounded-md bg-paper px-5 py-2.5 text-sm font-medium text-void transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97]"
          >
            Primary action
          </button>
          <button
            type="button"
            data-motion="press"
            className="rounded-md border border-graphite-3 px-5 py-2.5 text-sm font-medium text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-graphite-1 active:scale-[0.97]"
          >
            Secondary action
          </button>
        </div>
        <p className="text-sm text-graphite-4">
          Press Tab: an amber ring appears on keyboard focus only, never on click.
        </p>
      </section>

      <section aria-labelledby="palette-heading" className="flex flex-col gap-6">
        <h2 id="palette-heading" className="text-3xl font-medium">
          Palette <span className="font-mono text-sm font-normal text-graphite-4">contrast vs --void</span>
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((s) => (
            <li key={s.token} className="flex flex-col gap-2">
              <div
                className="h-16 rounded-md border border-graphite-2"
                style={{ background: `var(${s.token})` }}
              />
              <div className="flex flex-col font-mono text-xs">
                <span className="text-paper">{s.token}</span>
                <span className="text-graphite-4">
                  {s.hex} · {s.ratio}:1 · {s.note}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
