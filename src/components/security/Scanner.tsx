"use client";

/*
 * The Security check's scanner: the queue of passengers (luggage tags), the conveyor belt and the X-ray
 * scanner, its monitor, and the screening report. Loaded on its own only when the section is near
 * (ScannerLoader).
 *
 * Every result is the fraud model's real, precomputed output: the six passengers' from the content, packed
 * bags and random passengers' from the grid (src/lib/security-check.ts), one chunk per lookup.
 *
 * The sequence (about 4 s): the bag drops onto the belt, rides into the scanner (the curtains part), the
 * monitor's scan line reveals the X-ray, the objects appear largest first, the verdict lamp lights and the
 * tag is stamped, and the bag rides out. It is driven by a few timers that set a phase; everything moving is
 * a CSS transform or opacity. A new passenger interrupts at any moment. Under reduced motion nothing moves:
 * the X-ray cross-fades in, the objects appear together and the verdict shows at once.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Select } from "radix-ui";
import { securityCheck } from "@/content/security-check";
import bagsManifest from "@/content/security-check-bags.json";
import { loadStamp, stamp as thunk } from "@/lib/sound";
import { gridHeader, hourBand, securityCheckGrid } from "@/lib/security-check";
import { drawChunk, type GridBag, type GridResult } from "@/lib/security-check-grid";
import {
  announcement,
  BAG_IDS,
  dollars,
  riskier,
  RANDOM_NAMES,
  scoreParts,
  sharePercent,
  tagFields,
  timeBand,
  type BagId,
  type BagInputs,
} from "./format";
import { glideToY } from "@/components/nav/site-state";
import { LuggageTag } from "./LuggageTag";
import { Belt, Housing, Note, QueueView, type QueueActions } from "./views";
import { ObjectDrawing } from "./objects";
import { pack } from "./packing";
import styles from "./SecurityCheck.module.css";

// Re-rendered only when their props change, not on every phase of the scan.
const Queue = memo(QueueView);
const Tag = memo(LuggageTag);

type Phase = "idle" | "drop" | "ride" | "scan" | "objects" | "verdict" | "exit" | "done" | "error";

/** When each phase starts, in ms from the press. */
const TIMES = { ride: 300, scan: 1400, objects: 2500, verdict: 3100, exit: 3300, done: 4000 };
const REDUCED = { ride: 0, scan: 0, objects: 150, verdict: 150, exit: 150, done: 150 };
const STAMP_PRESS_MS = 180;
const PACKED_KEY = "jbbru:packed-bag";

interface BagInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  aspect: number;
  widths: number[];
  shadow: { top: number; height: number };
  packing: [number, number][];
}
const BAGS = Object.fromEntries((bagsManifest.bags as BagInfo[]).map((b) => [b.id, b])) as Record<BagId, BagInfo>;

interface Passenger {
  key: string;
  name: string;
  bag: BagId;
  inputs: BagInputs;
  band: number;
  tagNo: string;
}

interface Run {
  n: number;
  passenger: Passenger;
  result: Promise<GridResult>;
}

interface Packed {
  name: string;
  amountStep: number;
  hourBand: number;
  choices: Record<string, string>;
  bag: BagId;
}

const { scanner, ui } = securityCheck;
const header = gridHeader;
const OBJECT_LABEL = Object.fromEntries(scanner.objects.map((o) => [o.id, o.label]));
const choiceOptions = Object.fromEntries(header.choices.map((c) => [c.id, c.values]));
const inputLabel = Object.fromEntries(scanner.inputs.map((i) => [i.id, i.label]));

const presets: (Passenger & { result: GridResult })[] = scanner.presets.map((p, i) => {
  const { amount, hour, ...choices } = p.inputs as Record<string, string | number>;
  return {
    key: p.id,
    name: p.name,
    bag: BAG_IDS[i % BAG_IDS.length],
    inputs: { amount: Number(amount), hour: Number(hour), choices: choices as Record<string, string> },
    band: hourBand(header, Number(hour)),
    tagNo: `A 203 ${String(41 + i * 7).padStart(3, "0")}`,
    result: p.result as GridResult,
  };
});

const DEFAULT_PACKED: Packed = {
  name: "You",
  amountStep: 3,
  hourBand: 2,
  choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[0]])),
  bag: "tan-suitcase",
};

function readPacked(): Packed {
  try {
    const raw = window.sessionStorage.getItem(PACKED_KEY);
    if (!raw) return DEFAULT_PACKED;
    const p = JSON.parse(raw) as Packed;
    // Only values the grid holds are restored.
    const ok =
      typeof p.name === "string" &&
      p.amountStep >= 0 &&
      p.amountStep < header.amount.length &&
      p.hourBand >= 0 &&
      p.hourBand < header.hour.length &&
      header.choices.every((c) => c.values.includes(p.choices?.[c.id])) &&
      BAG_IDS.includes(p.bag);
    return ok ? { ...p, name: p.name.slice(0, 24) } : DEFAULT_PACKED;
  } catch {
    return DEFAULT_PACKED;
  }
}

function packedPassenger(p: Packed, n: number): Passenger {
  return {
    key: "packed",
    name: p.name.trim() || "You",
    bag: p.bag,
    inputs: { amount: header.amount[p.amountStep], hour: header.hour[p.hourBand].hour, choices: p.choices },
    band: p.hourBand,
    tagNo: `A 203 ${String(200 + (n % 700)).padStart(3, "0")}`,
  };
}

function bagSrc(id: string, kind: "photo" | "xray", format: "avif" | "webp", widths: number[]) {
  return widths.map((w) => `/security-check/bags/${id}-${kind}-${w}.${format} ${w}w`).join(", ");
}

function BagPicture({ id, kind, sizes, className }: { id: BagId; kind: "photo" | "xray"; sizes: string; className?: string }) {
  const bag = BAGS[id];
  return (
    <picture>
      <source type="image/avif" srcSet={bagSrc(id, kind, "avif", bag.widths)} sizes={sizes} />
      <img
        className={className}
        src={`/security-check/bags/${id}-${kind}-${bag.widths[1]}.webp`}
        srcSet={bagSrc(id, kind, "webp", bag.widths)}
        sizes={sizes}
        width={bag.width}
        height={bag.height}
        alt=""
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

const PHASE_ORDER: Phase[] = ["idle", "drop", "ride", "scan", "objects", "verdict", "exit", "done"];
const reached = (phase: Phase, target: Phase) => phase !== "error" && PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);

interface Props {
  projectHref: string;
  projectFlight: string;
  repoUrl: string;
}

export default function Scanner({ projectHref, projectFlight, repoUrl }: Props) {
  const [run, setRun] = useState<Run | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GridResult | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [packing, setPacking] = useState(false);
  const [packed, setPacked] = useState<Packed>(DEFAULT_PACKED);
  const [said, setSaid] = useState("");
  const runs = useRef(0);
  const draw = useRef<ReturnType<typeof drawChunk> | null>(null);
  const randomNames = useRef(0);
  const prefetchTimer = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageColRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  /**
   * When a scan starts, the stage (queue, monitor, scanner, belt and tag) should be in view: if it is not,
   * glide it there, just under the fixed header. Measured once, at the press, before anything moves.
   */
  const bringIntoView = useCallback(() => {
    const root = rootRef.current;
    const col = stageColRef.current;
    if (!root || !col) return;
    const header = 96;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    // Desktop: from the queue to the bottom of the monitor and belt column or the tag. Phones: the belt and
    // the monitor, which is all a phone screen can hold.
    const top = desktop ? root.getBoundingClientRect().top : col.getBoundingClientRect().top;
    const bottom = desktop ? Math.max(col.getBoundingClientRect().bottom, tagRef.current?.getBoundingClientRect().bottom ?? 0) : col.getBoundingClientRect().bottom;
    if (top >= header - 4 && bottom <= window.innerHeight + 2) return;
    glideToY(window.scrollY + top - header);
  }, []);

  // The last packed bag of this visit, and the stamp's thunk ready for the verdict.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restored from sessionStorage after hydration
    setPacked(readPacked());
    void loadStamp();
  }, []);

  // Once the scanner is here, warm the images a scan shows (the stamps and every bag's photo and X-ray) in idle
  // time, so their first download and decode do not land in the middle of a sequence.
  useEffect(() => {
    const warm = () => {
      for (const v of ["cleared", "screening", "stopped"]) void Object.assign(new Image(), { src: `/security-check/stamp-${v}.webp` }).decode().catch(() => undefined);
      for (const id of BAG_IDS)
        for (const kind of ["photo", "xray"] as const) {
          const img = new Image();
          img.sizes = kind === "photo" ? "(min-width: 1024px) 200px, 30vw" : "(min-width: 1024px) 360px, 60vw";
          img.srcset = bagSrc(id, kind, "avif", BAGS[id].widths);
          void img.decode().catch(() => undefined);
        }
    };
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    const handle = idle(warm);
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle);
  }, []);

  const start = useCallback((passenger: Passenger, result: Promise<GridResult>) => {
    runs.current += 1;
    setActive(null);
    setResult(null);
    setPacking(false);
    setRun({ n: runs.current, passenger, result });
    setPhase("drop");
    bringIntoView();
  }, [bringIntoView]);

  // The sequence for the current run.
  useEffect(() => {
    if (!run) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = reduced ? REDUCED : TIMES;
    const timers: number[] = [];
    let cancelled = false;
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    at(t.ride, () => setPhase("ride"));
    at(t.scan, () => setPhase("scan"));
    at(t.objects, () => {
      // The result is ready well before this (content, or one cached chunk); if not, the scan waits for it.
      run.result.then(
        (r) => {
          if (cancelled) return;
          setResult(r);
          setPhase("objects");
          at(t.verdict - t.objects, () => {
            setPhase("verdict");
            setSaid(announcement(r));
          });
          at(t.verdict - t.objects + (reduced ? 0 : STAMP_PRESS_MS), () => thunk());
          at(t.exit - t.objects, () => setPhase("exit"));
          at(t.done - t.objects, () => setPhase("done"));
        },
        () => !cancelled && setPhase("error"),
      );
    });
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [run]);

  const sendPreset = (p: (typeof presets)[number]) => start(p, Promise.resolve(p.result));

  const rand = Math.random;
  const prepareRandom = () => {
    if (draw.current) return;
    draw.current = drawChunk(header, rand);
    securityCheckGrid().prefetchChunk(draw.current.chunk);
  };

  const sendRandom = async () => {
    prepareRandom();
    const d = draw.current!;
    draw.current = null;
    const n = runs.current + 1;
    const name = RANDOM_NAMES[randomNames.current++ % RANDOM_NAMES.length];
    const bag = BAG_IDS[Math.floor(rand() * BAG_IDS.length)];
    let cell: { bag: GridBag; result: GridResult };
    try {
      cell = await securityCheckGrid().random(d, rand);
    } catch {
      start(
        { key: "random", name, bag, inputs: { amount: header.amount[0], hour: header.hour[0].hour, choices: DEFAULT_PACKED.choices }, band: 0, tagNo: "A 203 000" },
        Promise.reject(new Error("grid chunk unavailable")),
      );
      return;
    }
    const { bag: g } = cell;
    start(
      {
        key: "random",
        name,
        bag,
        inputs: { amount: header.amount[g.amountStep], hour: header.hour[g.hourBand].hour, choices: g.choices },
        band: g.hourBand,
        tagNo: `A 203 ${String(500 + (n % 400)).padStart(3, "0")}`,
      },
      Promise.resolve(cell.result),
    );
  };

  // The chunk is prefetched once the visitor touches the amount or time (see updatePacked).
  const openPacking = () => setPacking(true);

  const updatePacked = (next: Partial<Packed>) => {
    const p = { ...packed, ...next };
    setPacked(p);
    try {
      window.sessionStorage.setItem(PACKED_KEY, JSON.stringify(p));
    } catch {
      // Storage unavailable: the bag is still packed for this visit.
    }
    // Prefetch the bag's chunk once the sliders settle, so dragging across steps downloads only the one.
    if (next.amountStep !== undefined || next.hourBand !== undefined) {
      window.clearTimeout(prefetchTimer.current);
      prefetchTimer.current = window.setTimeout(() => securityCheckGrid().prefetch(p.amountStep, p.hourBand), 300);
    }
  };

  const sendPacked = (e: FormEvent) => {
    e.preventDefault();
    const cell: GridBag = { amountStep: packed.amountStep, hourBand: packed.hourBand, choices: packed.choices };
    start(packedPassenger(packed, runs.current + 1), securityCheckGrid().lookup(cell));
  };

  const next = () => {
    const i = presets.findIndex((p) => p.key === run?.passenger.key);
    sendPreset(presets[(i + 1) % presets.length]);
  };

  // Stable actions for the memoised queue, always calling the latest handlers.
  const latest = useRef({ sendPreset, openPacking, sendRandom, prepareRandom });
  useLayoutEffect(() => {
    latest.current = { sendPreset, openPacking, sendRandom, prepareRandom };
  });
  const actions = useMemo<QueueActions>(
    () => ({
      preset: (id) => latest.current.sendPreset(presets.find((p) => p.key === id)!),
      pack: () => latest.current.openPacking(),
      random: () => void latest.current.sendRandom(),
      prepareRandom: () => latest.current.prepareRandom(),
    }),
    [],
  );

  const passenger = run?.passenger ?? null;
  const bag = passenger ? BAGS[passenger.bag] : null;
  const fields = useMemo(() => (passenger ? tagFields(header, passenger.name, passenger.inputs, passenger.band) : undefined), [passenger]);
  const verdictShown = result !== null && reached(phase, "verdict");
  const landing = phase === "verdict";
  const stamp = useMemo(() => (verdictShown ? { verdict: result!.verdict, landing } : null), [verdictShown, result, landing]);

  const placed = useMemo(() => (result && bag ? pack(result.objects, bag.packing, bag.aspect) : []), [result, bag]);
  const maxShare = result ? Math.max(...result.objects.map((o) => o.share)) : 1;

  const xrayBox: CSSProperties | undefined = bag ? { width: `${(76 * bag.aspect) / 1.6}%`, height: "76%" } : undefined;

  return (
    <div ref={rootRef} className={styles.scanner} data-phase={phase} data-verdict={verdictShown ? result!.verdict : undefined} data-ready="">
      <Queue activeKey={run?.passenger.key ?? null} packing={packing} actions={actions} />

      <div className={styles.layout}>
        <div ref={stageColRef} className={styles.stageCol}>
          {/* The monitor. */}
          <div className={styles.monitor}>
            <div className={styles.screen}>
              {phase === "idle" || phase === "drop" || phase === "ride" ? (
                <p className={styles.ready} aria-hidden="true">
                  {phase === "idle" ? ui.ready : ui.incoming}
                </p>
              ) : null}
              {phase === "error" ? (
                <p className={styles.screenError} role="alert">
                  {ui.error}
                </p>
              ) : null}
              {run && bag && phase !== "error" ? (
                <div key={run.n} className={styles.xrayBox} style={xrayBox}>
                  <div className={styles.reveal}>
                    <div className={styles.revealInner}>
                      <BagPicture id={run.passenger.bag} kind="xray" sizes="(min-width: 1024px) 360px, 60vw" className={styles.xrayImg} />
                    </div>
                    <span className={styles.scanLine} aria-hidden="true" />
                  </div>
                  {result && reached(phase, "objects")
                    ? placed.map((p) => {
                        const o = result.objects.find((x) => x.id === p.id)!;
                        const rank = result.objects.indexOf(o);
                        const strength = 0.55 + 0.45 * (o.share / maxShare);
                        const open = active === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={styles.object}
                            data-object={o.id}
                            data-share={o.share}
                            data-direction={o.direction}
                            data-open={open ? "" : undefined}
                            style={
                              {
                                left: `${p.x * 100}%`,
                                top: `${p.y * 100}%`,
                                width: `${p.size * 100}%`,
                                "--i": rank,
                                "--strength": strength,
                              } as CSSProperties
                            }
                            aria-label={`${OBJECT_LABEL[o.id]}: ${o.line} ${sharePercent(o.share)}`}
                            aria-expanded={open}
                            onPointerEnter={(e) => e.pointerType === "mouse" && setActive(o.id)}
                            onPointerLeave={(e) => e.pointerType === "mouse" && setActive((a) => (a === o.id ? null : a))}
                            onFocus={() => setActive(o.id)}
                            onBlur={() => setActive((a) => (a === o.id ? null : a))}
                            onClick={() => setActive((a) => (a === o.id ? null : o.id))}
                          >
                            <ObjectDrawing id={o.id} className={styles.objectSvg} />
                          </button>
                        );
                      })
                    : null}
                  {result && active
                    ? (() => {
                        const p = placed.find((x) => x.id === active);
                        const o = result.objects.find((x) => x.id === active);
                        if (!p || !o) return null;
                        const side = p.x < 0.3 ? "start" : p.x > 0.7 ? "end" : "middle";
                        return (
                          <p
                            className={styles.objectLabel}
                            data-side={side}
                            style={{ left: `${p.x * 100}%`, top: `${(p.y - (p.size * bag.aspect) / 2) * 100}%` }}
                            aria-hidden="true"
                          >
                            {o.line} <span className={styles.objectShare}>{sharePercent(o.share)}</span>
                          </p>
                        );
                      })()
                    : null}
                </div>
              ) : null}
              {verdictShown ? (
                <div className={styles.screenVerdict} aria-hidden="true">
                  <span className={styles.screenWord}>{result!.verdict}</span>
                  <span className={styles.screenRisk}>RISKIER THAN {riskier(result!.percentile)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* The belt and the scanner (decorative: the report carries the meaning). */}
          <div className={styles.stage} aria-hidden="true">
            <Belt />
            {run && bag ? (
              <div
                key={run.n}
                className={styles.bag}
                style={{ "--aspect": bag.aspect, "--shadow-top": bag.shadow.top, "--shadow-h": bag.shadow.height } as CSSProperties}
              >
                <div className={styles.bagDrop}>
                  <picture>
                    <img className={styles.bagShadow} src={`/security-check/bags/${run.passenger.bag}-shadow.webp`} alt="" draggable={false} />
                  </picture>
                  <BagPicture id={run.passenger.bag} kind="photo" sizes="(min-width: 1024px) 200px, 30vw" className={styles.bagFaded} />
                  <div className={styles.bagColour}>
                    <BagPicture id={run.passenger.bag} kind="photo" sizes="(min-width: 1024px) 200px, 30vw" className={styles.bagImg} />
                  </div>
                  <span className={styles.miniTag}>
                    {verdictShown ? <span className={styles.miniStamp} data-verdict={result!.verdict} /> : null}
                  </span>
                </div>
              </div>
            ) : null}
            <Housing lit={verdictShown ? result!.verdict : undefined} />
          </div>

          <div className={styles.nextRow}>
            {phase === "done" ? (
              <button type="button" className={styles.next} onClick={next}>
                {ui.next}
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.reportCol}>
          {packing ? (
            <form className={styles.packForm} onSubmit={sendPacked} aria-label={ui.packCaption}>
              <LuggageTag tagNo="A 203 ···" caption={ui.packCaption} className={styles.tagEditable}>
                <div className={styles.tagFields}>
                  <label className={styles.tagField}>
                    <span>Passenger</span>
                    <input
                      className={styles.typed}
                      value={packed.name}
                      maxLength={24}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => updatePacked({ name: e.target.value })}
                    />
                  </label>
                  <Choice id="distance" label="From → to" value={packed.choices.distance} onChange={(v) => updatePacked({ choices: { ...packed.choices, distance: v } })} />
                  <label className={styles.tagField}>
                    <span>Value</span>
                    <span className={styles.slider}>
                      <input
                        type="range"
                        min={0}
                        max={header.amount.length - 1}
                        step={1}
                        value={packed.amountStep}
                        aria-valuetext={dollars(header.amount[packed.amountStep])}
                        onChange={(e) => updatePacked({ amountStep: Number(e.target.value) })}
                      />
                      <output className={styles.typedOut}>{dollars(header.amount[packed.amountStep])}</output>
                    </span>
                  </label>
                  <div className={styles.tagField}>
                    <span>Class</span>
                    <span className={styles.pair}>
                      <Choice id="network" label={inputLabel.network} bare value={packed.choices.network} onChange={(v) => updatePacked({ choices: { ...packed.choices, network: v } })} />
                      <Choice id="card_type" label={inputLabel.card_type} bare value={packed.choices.card_type} onChange={(v) => updatePacked({ choices: { ...packed.choices, card_type: v } })} />
                    </span>
                  </div>
                  <label className={styles.tagField}>
                    <span>Time</span>
                    <span className={styles.slider}>
                      <input
                        type="range"
                        min={0}
                        max={header.hour.length - 1}
                        step={1}
                        value={packed.hourBand}
                        aria-valuetext={timeBand(packed.hourBand)}
                        onChange={(e) => updatePacked({ hourBand: Number(e.target.value) })}
                      />
                      <output className={styles.typedOut}>{timeBand(packed.hourBand)}</output>
                    </span>
                  </label>
                  <Choice id="device" label="Device" value={packed.choices.device} onChange={(v) => updatePacked({ choices: { ...packed.choices, device: v } })} />
                  <Choice id="email" label="Email" value={packed.choices.email} onChange={(v) => updatePacked({ choices: { ...packed.choices, email: v } })} />
                  <Choice id="product" label="Product" value={packed.choices.product} onChange={(v) => updatePacked({ choices: { ...packed.choices, product: v } })} />
                </div>
              </LuggageTag>
              <fieldset className={styles.bagChoice}>
                <legend>{ui.bagLegend}</legend>
                {BAG_IDS.map((id) => (
                  <label key={id} className={styles.bagThumb}>
                    <input type="radio" name="bag" value={id} checked={packed.bag === id} onChange={() => updatePacked({ bag: id })} />
                    <BagPicture id={id} kind="photo" sizes="96px" />
                    <span className="sr-only">{BAGS[id].name}</span>
                  </label>
                ))}
              </fieldset>
              <p className={styles.packNote}>{ui.packNote}</p>
              <button type="submit" className={styles.send}>
                {ui.send}
              </button>
            </form>
          ) : (
            <Tag
              ref={tagRef}
              fields={fields}
              tagNo={passenger?.tagNo ?? "A 203 000"}
              caption={passenger ? undefined : ui.prompt}
              stamp={stamp}
            />
          )}

          {verdictShown && !packing ? <Report result={result!} /> : null}

          <Note projectHref={projectHref} projectFlight={projectFlight} repoUrl={repoUrl} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

/** The screening report, as text (rendered once per verdict). */
const Report = memo(function Report({ result }: { result: GridResult }) {
  return (
  <section className={styles.report} aria-label={ui.reportLabel} data-percentile={result.percentile} data-score={result.score}>
                <div className={styles.reportHead}>
                  <p className={styles.reportVerdict} data-verdict={result.verdict}>
                    {result.verdict}
                  </p>
                  <p className={styles.precomputed}>{securityCheck.precomputedLabel}</p>
                </div>
                <p className={styles.reportRisk}>{ui.riskier.replace("{percent}", riskier(result.percentile))}</p>
                <Bar percentile={result.percentile} />
                <p className={styles.reportScore}>
                  {securityCheck.scoreLabel}{" "}
                  <span className={styles.mono}>
                    {(() => {
                      const [m, e] = scoreParts(result.score);
                      return (
                        <>
                          {m} × 10<sup>{e}</sup>
                        </>
                      );
                    })()}
                  </span>
                  {" · "}percentile {result.percentile}
                </p>
                <ol className={styles.reasons}>
                  {result.objects.map((o) => (
                    <li key={o.id} className={styles.reason} data-object={o.id} data-share={o.share} data-direction={o.direction}>
                      <ObjectDrawing id={o.id} className={styles.reasonIcon} />
                      <span className={styles.reasonLine}>{o.line}</span>
                      <span className={styles.reasonShare}>
                        {o.direction === "raised" ? "Raised" : "Lowered"} · {sharePercent(o.share)}
                      </span>
                    </li>
                  ))}
                </ol>
            <p className={styles.reportNote}>{ui.productNote}</p>
              </section>
  );
});

const optionText = (id: string, v: string) => (id === "product" ? `TYPE ${v}` : v === "american express" ? "AMEX" : v.toUpperCase());

/**
 * A categorical field: a menu designed as part of the tag (typed values on the same aged card, an ink tick on
 * the chosen one), with the keyboard and typeahead of a native select. Only the grid's values.
 */
function Choice({ id, label, value, onChange, bare }: { id: string; label: string; value: string; onChange: (v: string) => void; bare?: boolean }) {
  const select = (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={styles.typedSelect} aria-label={label}>
        <Select.Value />
        <Select.Icon className={styles.selectIcon} aria-hidden="true">
          ▾
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={styles.menu} position="popper" sideOffset={4} align="start">
          <Select.Viewport className={styles.menuViewport}>
            {choiceOptions[id].map((v) => (
              <Select.Item key={v} value={v} className={styles.menuItem}>
                <Select.ItemText>{optionText(id, v)}</Select.ItemText>
                <Select.ItemIndicator className={styles.menuTick}>✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
  if (bare) return select;
  return (
    <div className={styles.tagField}>
      <span aria-hidden="true">{label}</span>
      {select}
    </div>
  );
}

/**
 * The percentile bar, zoomed where the verdicts are decided: 0 to 80 compressed into the first quarter (with
 * a break mark), 80 to 100 across the rest. The ticks are the real values (0, 80, the band edges, 100), and
 * each verdict is named under its own segment.
 */
const BREAK = 80;
const BREAK_AT = 25;
const along = (p: number) => (p <= BREAK ? (p / BREAK) * BREAK_AT : BREAK_AT + ((p - BREAK) / (100 - BREAK)) * (100 - BREAK_AT));

function Bar({ percentile }: { percentile: number }) {
  const s = scanner.bands.screening.percentile;
  const t = scanner.bands.stopped.percentile;
  const [xs, xt] = [along(s), along(t)];
  return (
    <div className={styles.bar} aria-hidden="true">
      <div className={styles.barTrack}>
        <span className={styles.barBand} data-band="CLEARED" style={{ left: 0, width: `${xs}%` }} />
        <span className={styles.barBand} data-band="SCREENING" style={{ left: `${xs}%`, width: `${xt - xs}%` }} />
        <span className={styles.barBand} data-band="STOPPED" style={{ left: `${xt}%`, width: `${100 - xt}%` }} />
        <span className={styles.barBreak} style={{ left: `${BREAK_AT}%` }} />
        <span className={styles.barMark} style={{ left: `${along(percentile)}%` }} />
      </div>
      <div className={styles.barTicks}>
        <span data-align="start" style={{ left: 0 }}>
          0
        </span>
        <span style={{ left: `${BREAK_AT}%` }}>{BREAK}</span>
        <span style={{ left: `${xs}%` }}>{s}</span>
        <span style={{ left: `${xt}%` }}>{t}</span>
        <span data-align="end" style={{ left: "100%" }}>
          100
        </span>
      </div>
      <div className={styles.barNames}>
        <span data-align="start" style={{ left: 0 }}>
          CLEARED
        </span>
        <span style={{ left: `${(xs + xt) / 2}%` }}>SCREENING</span>
        <span data-align="end" style={{ left: "100%" }}>
          STOPPED
        </span>
      </div>
    </div>
  );
}
