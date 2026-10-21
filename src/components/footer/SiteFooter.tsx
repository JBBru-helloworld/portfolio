import { profile, work } from "@/content";
import styles from "./SiteFooter.module.css";

/** The site's foot: the name and the required Skiper UI credit (Featured flights is based on Skiper UI 52). */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.name}>{profile.name}</p>
      <p className={styles.credit}>
        <a href={work.credit.url} target="_blank" rel="noopener">
          {work.credit.label}
        </a>
      </p>
    </footer>
  );
}
