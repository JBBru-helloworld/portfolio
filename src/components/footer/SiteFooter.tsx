import { footer, work } from "@/content";
import { BackToWindow } from "./BackToWindow";
import styles from "./SiteFooter.module.css";

/** The quiet foot of every page: the copyright, how it was built, the Skiper UI credit, and back to the window. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.meta}>
        <p className={styles.line}>{footer.copyright}</p>
        <p className={styles.line}>{footer.built}</p>
        <p className={styles.line}>
          <a href={work.credit.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {work.credit.label}
          </a>
        </p>
      </div>
      <BackToWindow className={`${styles.link} ${styles.back}`}>{footer.backToWindow}</BackToWindow>
    </footer>
  );
}
