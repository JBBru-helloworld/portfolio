"use client";

import { useLayoutEffect, useRef } from "react";
import { HERO_NAME, landed } from "../flight-nav";
import { ProjectPicture } from "../ProjectPicture";
import type { Picture } from "../media";
import styles from "./ProjectPage.module.css";

/**
 * The page's header image, in colour. It carries the view-transition name the gallery strip had, so the
 * strip grows into it; the transition waits (briefly) for it to decode before capturing the new page.
 */
export function ProjectHero({ picture, alt, caption }: { picture: Picture; alt: string; caption?: string }) {
  const img = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const el = img.current;
    if (!el || el.complete) return landed();
    el.decode().then(landed, landed);
  }, []);
  return (
    <figure className={styles.hero}>
      <div className={styles.heroFrame} style={{ viewTransitionName: HERO_NAME, aspectRatio: `${picture.width} / ${picture.height}` }}>
        <ProjectPicture
          picture={picture}
          alt={alt}
          sizes="(min-width: 1120px) 68rem, calc(100vw - 2rem)"
          priority
          className={styles.heroPicture}
          imgClassName={styles.heroImg}
          imgRef={img}
        />
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
