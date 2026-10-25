import type { ReactNode } from "react";
import type { Destination } from "@/content";
import { dutyFree, links } from "@/content";
import resume from "@/content/resume-media.json";
import { DutyFreeReveal as RevealGroup, EmailProduct } from "@/components/defer/islands";
import { GITHUB_MARK, INSTAGRAM_MARK, LINKEDIN_MARK, MARK_VIEWBOX, X_MARK } from "./marks";
import styles from "./DutyFree.module.css";

/*
 * Gate 6, "Contact", as Duty free: the last stop before the gate. Softly lit shelves in the site's greys, and
 * a product per link (six with the resume: three a shelf on wide screens, two on phones), drawn as monochrome hairline objects, each with a shelf-edge tag (the name and
 * the action, no prices). The whole product and its tag are one link; on hover or focus the product lifts
 * and the action turns amber. The resume shows only once `pnpm resume:build` has published a clean one.
 * The products settle onto the shelves as the section scrolls in, once per visit.
 */

/** The resume: a folded document in a small carrier bag. */
const Bag = () => (
  <svg viewBox="0 0 120 120" className={styles.svg}>
    <path d="M44 34 L52 18 L80 22 L74 40" className={styles.paper} />
    <path d="M52 18 L62 26 L80 22" className={styles.line} />
    <path d="M58 30 L72 32 M56 35 L68 36.5" className={styles.faint} />
    <path d="M26 46 H94 L88 104 H32 Z" className={styles.body} />
    <path d="M44 46 C44 30 76 30 76 46" className={styles.line} />
    <path d="M26 46 H94" className={styles.highlight} />
  </svg>
);

/** The email: an envelope. */
const Envelope = () => (
  <svg viewBox="0 0 120 120" className={styles.svg}>
    <rect x="18" y="38" width="84" height="56" rx="3" className={styles.body} />
    <path d="M18 41 L60 72 L102 41" className={styles.line} />
    <path d="M18 92 L48 64 M102 92 L72 64" className={styles.faint} />
    <path d="M20 38 H100" className={styles.highlight} />
  </svg>
);

/** A boxed item with a brand's mark on its front face. */
const Box = ({ mark }: { mark: string }) => (
  <svg viewBox="0 0 120 120" className={styles.svg}>
    <path d="M30 36 L44 26 H96 L82 36 Z" className={styles.top} />
    <path d="M82 36 L96 26 V90 L82 100 Z" className={styles.side} />
    <rect x="30" y="36" width="52" height="64" className={styles.body} />
    <path d="M30 36 H82" className={styles.highlight} />
    <svg x="44" y="56" width="24" height="24" viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}>
      <path d={mark} className={styles.mark} />
    </svg>
  </svg>
);

interface Product {
  key: string;
  href: string;
  name: string;
  tag: string;
  action: string;
  object: ReactNode;
  download?: boolean;
}

export function DutyFreeSection({ destination }: { destination: Destination }) {
  const p = dutyFree.products;
  const products: Product[] = [
    ...(resume.available
      ? [{ key: "resume", href: links.resume.url, name: p.resume.name, tag: p.resume.tag, action: p.resume.action, object: <Bag />, download: true }]
      : []),
    { key: "linkedin", href: links.linkedin.url, name: p.linkedin.name, tag: p.linkedin.tag, action: p.linkedin.action, object: <Box mark={LINKEDIN_MARK} /> },
    { key: "github", href: links.github.url, name: p.github.name, tag: p.github.tag, action: p.github.action, object: <Box mark={GITHUB_MARK} /> },
    { key: "instagram", href: links.instagram.url, name: p.instagram.name, tag: p.instagram.tag, action: p.instagram.action, object: <Box mark={INSTAGRAM_MARK} /> },
    { key: "x", href: links.x.url, name: p.x.name, tag: p.x.tag, action: p.x.action, object: <Box mark={X_MARK} /> },
  ];
  // The email sits second (after the resume, when there is one).
  const emailAt = resume.available ? 1 : 0;

  const bays: ReactNode[] = products.map((x) => (
    <li key={x.key} className={styles.bay} data-reveal="">
      <a
        className={styles.product}
        href={x.href}
        target="_blank"
        rel="noopener noreferrer"
        download={x.download ? "joshua-bonham-resume.pdf" : undefined}
        aria-label={`${x.name} (opens in a new tab)`}
      >
        <span className={styles.object} aria-hidden="true">
          {x.object}
        </span>
        <span className={styles.tag} aria-hidden="true">
          <span className={styles.tagName}>{x.tag}</span>{" "}
          <span className={styles.tagAction}>{x.action}</span>
        </span>
      </a>
    </li>
  ));
  bays.splice(
    emailAt,
    0,
    <li key="email" className={styles.bay} data-reveal="">
      <EmailProduct user={links.email.user} domain={links.email.domain} copy={dutyFree} object={<Envelope />} />
    </li>,
  );

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.label} aria-hidden="true">
          {dutyFree.label}
        </p>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <p className={styles.intro}>{dutyFree.line}</p>
        <RevealGroup id="duty-free" stagger={120} rise={-14}>
          <ul className={styles.shelves}>{bays}</ul>
        </RevealGroup>
      </div>
    </section>
  );
}
