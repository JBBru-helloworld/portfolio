// Temporary page: design-system specimen (Phase 1c) and a plain render of all content (Phase 1d).
// Replaced in Phase 2.
import {
  credentials,
  departures,
  experience,
  journey,
  links,
  profile,
  projects,
  stack,
  stackCategories,
} from "@/content";
import type { DateRange, Link } from "@/content";

const range = (d: DateRange) => (d.end ? `${d.start} to ${d.end}` : d.start);

function LinkList({ items }: { items: Link[] }) {
  if (!items.length) return null;
  return (
    <ul>
      {items.map((l) => (
        <li key={l.label + l.url}>
          {l.label} ({l.kind}): {l.url.startsWith("TODO") ? l.url : <a href={l.url}>{l.url}</a>}
        </li>
      ))}
    </ul>
  );
}

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
      <section aria-labelledby="content-heading" className="flex flex-col gap-6 border-t border-graphite-2 pt-16">
        <h2 id="content-heading" className="text-3xl font-medium">
          Content (plain render)
        </h2>

        <h3>Profile</h3>
        <ul>
          <li>Name: {profile.name}</li>
          <li>Role (default): {profile.roleLines.default}</li>
          <li>Role (point of view): {profile.roleLines.pointOfView}</li>
          <li>Role (board): {profile.roleLines.board}</li>
          <li>Bio: {profile.bio}</li>
          <li>Languages: {profile.languages.map((l) => l.name).join(", ")}</li>
        </ul>

        <h3>Links</h3>
        <LinkList items={Object.values(links)} />

        <h3>Departures</h3>
        <p>
          {departures.header.label} · {departures.header.name} · {departures.header.role}
        </p>
        <ul>
          {departures.rows.map((r) => (
            <li key={r.code}>
              {r.code} · {r.destination} · {r.status}
            </li>
          ))}
        </ul>

        <h3>Journey</h3>
        <ul>
          {journey.map((j) => (
            <li key={j.country}>
              {j.label} ({j.ink}, {range(j.years)}): {j.line}
            </li>
          ))}
        </ul>

        <h3>Experience</h3>
        <ul>
          {experience.map((e) => (
            <li key={e.slug}>
              {e.role}, {e.organisation} ({range(e.dates)}
              {e.location ? `, ${e.location}` : ""}): {e.summary}
              <ul>
                {e.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <LinkList items={e.links} />
            </li>
          ))}
        </ul>

        {(["featured", "also-built", "archive"] as const).map((status) => (
          <div key={status}>
            <h3>Projects: {status}</h3>
            <ul>
              {projects
                .filter((p) => p.status === status)
                .map((p) => (
                  <li key={p.slug}>
                    {p.title} ({range(p.date)}
                    {p.context ? `, ${p.context}` : ""}
                    {p.role ? `, ${p.role}` : ""}): {p.summary}
                    <br />
                    Stack: {p.stack.join(", ") || "none listed"}
                    {p.caseStudyAngle ? (
                      <>
                        <br />
                        Case study angle: {p.caseStudyAngle}
                      </>
                    ) : null}
                    <LinkList items={p.links} />
                  </li>
                ))}
            </ul>
          </div>
        ))}

        <h3>Periodic table ({stack.length} elements)</h3>
        {stackCategories.map((c) => (
          <div key={c}>
            <h4>
              {c} ({stack.filter((e) => e.category === c).length})
            </h4>
            <ul>
              {stack
                .filter((e) => e.category === c)
                .map((e) => (
                  <li key={e.symbol}>
                    {e.number} {e.symbol} {e.name}: {e.usedFor}
                  </li>
                ))}
            </ul>
          </div>
        ))}

        <h3>Credentials</h3>
        <ul>
          {credentials.map((c) => (
            <li key={c.title}>
              {c.title}
              {c.issuer ? `, ${c.issuer}` : ""}
              {c.date ? ` (${c.date})` : ""}
              {c.detail ? `: ${c.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
