import type { Credential, DateRange, Destination, ExperienceItem } from "@/content";
import { credentials, experience, links, logbook, projects } from "@/content";
import resume from "@/content/resume-media.json";
import { LogbookReveal as RevealGroup, PhotoStack, ViewFlight } from "@/components/defer/islands";
import { prints } from "./media";
import styles from "./Logbook.module.css";

/*
 * Gate 5, "Experience", as a pilot's logbook: a dark graphite page (related to the passport page) with faint
 * ruled lines, column headers in small JetBrains Mono capitals and a hairline margin rule. A real table on
 * wide screens; on phones each entry stacks, with small column labels beside its values. Photos are taped in
 * beside their entry. Rows write in as they scroll in, once per visit. Below: ratings and endorsements.
 */

const shown = (text?: string) => !!text && !/(TODO|CHECK)\(owner\)/.test(text);
const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
/** "Oct 2026" as a sortable number. */
const when = (d: string) => {
  const [m, y] = d.split(" ");
  return Number(y) * 100 + (MONTHS[m] ?? 0);
};

function dates(d: DateRange) {
  const end = !d.end || d.end === "Present" ? logbook.present : d.end;
  return `${d.start} – ${end}`.toUpperCase();
}

/** The company's own website: its name in the logbook links there. */
function website(e: ExperienceItem) {
  return e.links.find((l) => l.kind === "live" && /^https:\/\//.test(l.url));
}

function credentialLine(c: Credential) {
  return [c.issuer, c.date].filter(shown).join(" · ");
}

export function LogbookSection({ destination }: { destination: Destination }) {
  // Newest first: by start date, then by end date.
  const entries = [...experience].sort((a, b) => when(b.dates.start) - when(a.dates.start));
  const ratings = credentials.filter((c) => shown(c.title) && (!c.detail || shown(c.detail)));
  const c = logbook.columns;

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.label} aria-hidden="true">
          {logbook.label}
        </p>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>

        <div className={styles.page}>
          <RevealGroup id="logbook" stagger={110}>
            <table className={styles.table}>
              <caption className="sr-only">{`${destination.name}, newest first`}</caption>
              <thead>
                <tr>
                  <th scope="col">{c.date}</th>
                  <th scope="col">{c.aircraft}</th>
                  <th scope="col">{c.duty}</th>
                  <th scope="col">{c.route}</th>
                  <th scope="col">{c.remarks}</th>
                  <th scope="col" className={styles.photoHead}>
                    <span className="sr-only">{logbook.photos.group}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: ExperienceItem) => {
                  const photos = prints(e);
                  const flight = e.project ? projects.find((p) => p.slug === e.project) : undefined;
                  return (
                    <tr key={e.slug} id={`log-${e.slug}`} className={styles.entry} data-reveal="" data-has-photos={photos.length ? "" : undefined}>
                      <td className={styles.date} data-label={c.date}>
                        {dates(e.dates)}
                      </td>
                      <td className={styles.aircraft} data-label={c.aircraft}>
                        {website(e) ? (
                          <a
                            className={styles.website}
                            href={website(e)!.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${e.organisation}, website (opens in a new tab)`}
                          >
                            {e.organisation}
                          </a>
                        ) : (
                          e.organisation
                        )}
                      </td>
                      <td className={styles.duty} data-label={c.duty}>
                        {e.role}
                      </td>
                      {/* Without a known location the cell stays empty, and (on phones) unlabelled. */}
                      <td className={styles.route} data-label={shown(e.location) ? c.route : undefined}>
                        {shown(e.location) ? e.location : null}
                      </td>
                      <td className={styles.remarks} data-label={c.remarks}>
                        <ul>
                          {e.remarks.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        {flight ? (
                          <ViewFlight slug={flight.slug} label={logbook.viewFlight} name={`${logbook.viewFlight.replace(/\s*→$/, "")}: ${flight.flight}, ${flight.name}`} />
                        ) : null}
                      </td>
                      <td className={styles.photos}>
                        {photos.length ? (
                          <PhotoStack prints={photos} label={`${logbook.photos.group}: ${e.organisation}`} copy={logbook.photos} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </RevealGroup>
        </div>

        <div className={styles.ratings}>
          <div className={styles.ratingsHead}>
            <h3 className={styles.ratingsTitle}>{logbook.ratingsTitle}</h3>
            {/* The same file as Duty free's Resume, and like it, absent until a clean resume is built. */}
            {resume.available ? (
              <a className={styles.resumeLink} href={links.resume.url} target="_blank" rel="noopener" aria-label={logbook.resumeLink.ariaLabel}>
                {logbook.resumeLink.label}
              </a>
            ) : null}
          </div>
          <ul className={styles.ratingsList}>
            {ratings.map((r) => (
              <li key={r.title}>
                <span className={styles.ratingName}>{r.title}</span>
                {credentialLine(r) ? <span className={styles.ratingMeta}>{credentialLine(r)}</span> : null}
                {r.detail ? <span className={styles.ratingDetail}>{r.detail}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
