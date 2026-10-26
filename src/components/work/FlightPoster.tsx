import type { Project } from "@/content";
import { Emblem } from "./Emblem";
import styles from "./FlightPoster.module.css";

/**
 * Shown where a project has no screenshot: a quiet poster in the site's greys with its emblem, flight code
 * and name, so a strip or page header never looks broken. Decorative (the name is real text elsewhere).
 */
export function FlightPoster({ project, className }: { project: Pick<Project, "flight" | "name" | "emblem">; className?: string }) {
  return (
    <div className={`${styles.poster}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <Emblem emblem={project.emblem} size={88} className={styles.emblem} />
      <p className={styles.code}>{project.flight}</p>
      <p className={styles.name}>{project.name}</p>
    </div>
  );
}
