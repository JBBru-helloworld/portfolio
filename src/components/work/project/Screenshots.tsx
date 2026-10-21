"use client";

/*
 * The screenshots, in colour with captions. Each opens a simple full-screen view (a modal <dialog>: Escape,
 * the close button or a click outside the image closes it, and focus returns to the screenshot).
 */
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ProjectPicture } from "../ProjectPicture";
import type { Picture } from "../media";
import styles from "./ProjectPage.module.css";

interface Shot {
  picture: Picture;
  alt: string;
  caption: string;
}

export function Screenshots({ shots, enlarge, close }: { shots: Shot[]; enlarge: string; close: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const show = (i: number) => {
    setOpen(i);
    window.__lenis?.stop();
    dialog.current?.showModal();
  };
  const onClose = () => {
    setOpen(null);
    window.__lenis?.start();
  };
  const shot = open === null ? null : shots[open];

  return (
    <>
      <ul className={styles.shots}>
        {shots.map((s, i) => (
          <li key={i}>
            <figure className={styles.shot}>
              <button type="button" className={styles.shotButton} onClick={() => show(i)} aria-label={`${enlarge}: ${s.alt}`}>
                <ProjectPicture
                  picture={s.picture}
                  alt=""
                  sizes="(min-width: 1120px) 68rem, calc(100vw - 2rem)"
                  className={styles.shotPicture}
                  imgClassName={styles.shotImg}
                />
              </button>
              <figcaption className={styles.caption}>{s.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className={styles.lightbox}
        aria-label={shot?.alt}
        onClose={onClose}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        {shot ? (
          <>
            <ProjectPicture picture={shot.picture} alt={shot.alt} sizes="100vw" className={styles.lightboxPicture} imgClassName={styles.lightboxImg} />
            <p className={styles.lightboxCaption}>{shot.caption}</p>
            <button type="button" className={styles.lightboxClose} onClick={() => dialog.current?.close()} aria-label={close}>
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}
