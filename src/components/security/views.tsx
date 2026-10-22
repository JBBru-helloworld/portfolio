/*
 * The scanner's static parts, shared by the server and the scanner itself: the queue, the belt, the housing,
 * the note, and the whole scanner at rest (ScannerShell).
 *
 * The server renders ScannerShell in place of the scanner until its code has loaded (ScannerLoader), with
 * the same markup and styles as the loaded scanner at rest, so loading it never changes the page's height:
 * a glide from the board past this section, or a restore further down, lands where it should.
 *
 * No hooks and no "use client": on the server these render to HTML only.
 */
import type { CSSProperties } from "react";
import { securityCheck } from "@/content/security-check";
import type { GridVerdict } from "@/lib/security-check-grid";
import { dollars } from "./format";
import { LuggageTag } from "./LuggageTag";
import styles from "./SecurityCheck.module.css";

const { scanner, ui } = securityCheck;
const VERDICTS: GridVerdict[] = ["CLEARED", "SCREENING", "STOPPED"];

export interface QueueActions {
  preset: (id: string) => void;
  pack: () => void;
  random: () => void;
  prepareRandom: () => void;
}

/** The queue: the passengers as luggage tags on a rail, then Pack your own bag and Random passenger. */
export function QueueView({ activeKey, packing, actions }: { activeKey: string | null; packing: boolean; actions?: QueueActions }) {
  return (
    <div className={styles.queueWrap}>
      <ul className={styles.queue} aria-label={ui.queueLabel}>
        {scanner.presets.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={styles.queueTag}
              aria-label={`${ui.passengerPrefix}${p.name}`}
              aria-pressed={activeKey === p.id}
              onClick={actions ? () => actions.preset(p.id) : undefined}
            >
              <span className={styles.queueLine} aria-hidden="true">
                JB AIR
              </span>
              <span className={styles.queueName}>{p.name}</span>
              <span className={styles.queueValue} aria-hidden="true">
                {dollars(Number(p.inputs.amount))}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={`${styles.queueTag} ${styles.queueAction}`} aria-pressed={packing} onClick={actions?.pack}>
            <span className={styles.queueName}>{ui.pack}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`${styles.queueTag} ${styles.queueAction}`}
            aria-pressed={activeKey === "random"}
            onPointerEnter={actions?.prepareRandom}
            onFocus={actions?.prepareRandom}
            onPointerDown={actions?.prepareRandom}
            onClick={actions?.random}
          >
            <span className={styles.queueName}>{ui.random}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

/** The conveyor belt: a dark ribbed belt between rails, over rollers. */
export function Belt() {
  return (
    <div className={styles.belt}>
      <div className={styles.beltSurface} />
      <div className={styles.rollers} />
    </div>
  );
}

const strips = (
  <>
    {[0, 1, 2, 3, 4].map((s) => (
      <span key={s} className={styles.strip} style={{ "--s": s } as CSSProperties} />
    ))}
  </>
);

/** The scanner housing: the lamp panel, two mouths with curtain strips, the casing and its vent lights. */
export function Housing({ lit }: { lit?: GridVerdict }) {
  return (
    <div className={styles.housing}>
      <div className={styles.panel}>
        {VERDICTS.map((v) => (
          <span key={v} className={styles.lamp} data-lamp={v} data-lit={lit === v ? "" : undefined}>
            <i />
            {v}
          </span>
        ))}
      </div>
      <div className={`${styles.mouth} ${styles.mouthIn}`}>{strips}</div>
      <div className={styles.tunnel} />
      <div className={styles.vents}>
        {Array.from({ length: 12 }, (_, v) => (
          <span key={v} className={styles.vent} style={{ "--v": v } as CSSProperties} />
        ))}
      </div>
      <div className={`${styles.mouth} ${styles.mouthOut}`}>{strips}</div>
    </div>
  );
}

export interface NoteLinks {
  projectHref: string;
  projectFlight: string;
  repoUrl: string;
}

/** The note under the report: synthetic passengers, real results, the validation set, and the links. */
export function Note({ projectHref, projectFlight, repoUrl }: NoteLinks) {
  return (
    <div className={styles.note}>
      <p>{securityCheck.note}</p>
      <p>
        {securityCheck.percentileNote} {ui.validation}
      </p>
      <p className={styles.noteLinks}>
        <a href={projectHref}>{projectFlight} · Payments fraud detection</a>
        <a href={repoUrl} target="_blank" rel="noopener noreferrer">
          {ui.repo}
        </a>
      </p>
    </div>
  );
}

/** The scanner at rest, as the server renders it before the scanner's code loads. */
export function ScannerShell(links: NoteLinks) {
  return (
    <div className={`${styles.scanner} ${styles.shell}`} data-phase="idle">
      <QueueView activeKey={null} packing={false} />
      <div className={styles.layout}>
        <div className={styles.stageCol}>
          <div className={styles.monitor}>
            <div className={styles.screen}>
              <p className={styles.ready} aria-hidden="true">
                {ui.ready}
              </p>
            </div>
          </div>
          <div className={styles.stage} aria-hidden="true">
            <Belt />
            <Housing />
          </div>
          <div className={styles.nextRow} />
        </div>
        <div className={styles.reportCol}>
          <LuggageTag tagNo="A 203 000" caption={ui.prompt} />
          <Note {...links} />
        </div>
      </div>
    </div>
  );
}
