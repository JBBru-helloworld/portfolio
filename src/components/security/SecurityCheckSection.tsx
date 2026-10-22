import type { Destination } from "@/content";
import { projects, securityCheck } from "@/content";
import { features } from "@/config/features";
import { ScannerLoader } from "./ScannerLoader";
import { ScannerShell } from "./views";
import styles from "./SecurityCheck.module.css";

/*
 * Gate 3, the Security check: an airport X-ray scanner for the fraud model. Each transaction is a passenger's
 * bag with a luggage tag; the bag rides through the scanner, the monitor shows the objects inside (one per
 * reason behind the model's decision) and the tag is stamped CLEARED, SCREENING or STOPPED. Every result is
 * precomputed by the real model (Phase 5b); nothing is scored on a server.
 *
 * The scanner itself loads only when the section is near (ScannerLoader). Until then, without JavaScript,
 * or with the feature off, the section shows a static summary: the six passengers and their real verdicts.
 */
export function SecurityCheckSection({ destination }: { destination: Destination }) {
  const project = projects.find((p) => p.slug === securityCheck.projectSlug)!;
  const repo = project.links.find((l) => l.kind === "repo")!;
  const projectHref = `/work/${project.slug}`;

  const summary = (
    <div className={styles.summary}>
      <p className={styles.summaryLead}>
        {project.flight} · {project.name}: {securityCheck.headline}.
      </p>
      {features.securityCheck ? (
        <ul className={styles.summaryList}>
          {securityCheck.scanner.presets.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className={styles.mono}>
                {p.result.verdict} · {securityCheck.ui.riskier.replace("{percent}", `${Math.round(p.result.percentile)}%`)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.summaryNote}>{securityCheck.note}</p>
      <p className={styles.noteLinks}>
        <a href={projectHref}>{securityCheck.ui.viewFlight}</a>
        <a href={repo.url} target="_blank" rel="noopener noreferrer">
          {securityCheck.ui.repo}
        </a>
      </p>
    </div>
  );

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{securityCheck.ui.eyebrow}</p>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <p className={styles.lead}>{securityCheck.ui.lead}</p>
        {features.securityCheck ? (
          <ScannerLoader className={styles.loader} projectHref={projectHref} projectFlight={project.flight} repoUrl={repo.url}>
            <ScannerShell projectHref={projectHref} projectFlight={project.flight} repoUrl={repo.url} />
            <div className={styles.noJsSummary}>{summary}</div>
          </ScannerLoader>
        ) : (
          summary
        )}
      </div>
    </section>
  );
}
