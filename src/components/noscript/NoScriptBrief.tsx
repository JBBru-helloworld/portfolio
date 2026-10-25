import { dutyFree, links, noScript, projects } from "@/content";
import resume from "@/content/resume-media.json";
import styles from "./NoScriptBrief.module.css";

/*
 * The short version of the site, after the departures board, for visitors without JavaScript (Phase 6). The
 * sections below the board hydrate lazily, and React streams the large ones as hidden HTML that only a script
 * reveals, so without JavaScript they never appear. This block lists what matters as plain links: every
 * project page (they render in full without JavaScript), the resume once it is published, LinkedIn, GitHub
 * and the email written out as in Duty free (the address is never whole in the HTML).
 */
export function NoScriptBrief() {
  return (
    <noscript>
      <section className={styles.brief} aria-labelledby="no-script-line">
        <div className={styles.inner}>
          <p className={styles.label}>{noScript.label}</p>
          <p id="no-script-line" className={styles.line}>
            {noScript.line}
          </p>
          <div className={styles.columns}>
            <div>
              <h2 className={styles.heading}>{noScript.flights}</h2>
              <ul className={styles.list}>
                {projects.map((p) => (
                  <li key={p.slug}>
                    <a href={`/work/${p.slug}`} className={styles.link}>
                      <span className={styles.code}>{p.flight}</span> {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={styles.heading}>{noScript.contact}</h2>
              <ul className={styles.list}>
                {resume.available ? (
                  <li>
                    <a href={links.resume.url} className={styles.link}>
                      {links.resume.label}
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href={links.linkedin.url} className={styles.link} rel="noopener noreferrer">
                    {links.linkedin.label}
                  </a>
                </li>
                <li>
                  <a href={links.github.url} className={styles.link} rel="noopener noreferrer">
                    {links.github.label}
                  </a>
                </li>
                <li className={styles.email}>
                  <span className={styles.code}>{noScript.email}</span> {dutyFree.emailFallback}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </noscript>
  );
}
