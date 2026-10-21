"use client";

/*
 * A click-to-play YouTube facade: the video's thumbnail (self-hosted, built by projects:build) with a play
 * button. Nothing loads from YouTube until it is pressed; then the youtube-nocookie.com player replaces it
 * and starts playing.
 */
import { useState } from "react";
import { Play } from "lucide-react";
import type { ProjectVideo } from "@/content";
import { ProjectPicture } from "../ProjectPicture";
import type { Picture } from "../media";
import styles from "./ProjectPage.module.css";

export function embedUrl(v: ProjectVideo) {
  const q = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (v.list) q.set("list", v.list);
  if (v.index) q.set("index", String(v.index));
  return `https://www.youtube-nocookie.com/embed/${v.id}?${q}`;
}

export function VideoFacade({ video, thumb, title, playLabel }: { video: ProjectVideo; thumb: Picture | null; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={styles.video}>
      {playing ? (
        <iframe
          className={styles.videoFrame}
          src={embedUrl(video)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className={styles.videoButton} onClick={() => setPlaying(true)} aria-label={`${playLabel}: ${title}`}>
          {thumb ? (
            <ProjectPicture picture={thumb} alt="" sizes="(min-width: 1120px) 68rem, calc(100vw - 2rem)" className={styles.videoPicture} imgClassName={styles.videoImg} />
          ) : null}
          <span className={styles.play} aria-hidden="true">
            <Play size={22} strokeWidth={1.5} />
          </span>
        </button>
      )}
    </div>
  );
}
