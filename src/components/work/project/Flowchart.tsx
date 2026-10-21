"use client";

/*
 * A project's flowchart (Touch 'n Go's data requests and AI workflows, Plandora's evaluation pipeline), in
 * the site's style: hairline boxes and arrows, JetBrains Mono labels, monochrome, amber only on the outcome.
 * Generic labels only (no internal systems, teams or people).
 *
 * A flow (src/content/types.ts, FlowCopy) is steps in order, optionally forking into a pair of steps side
 * by side and joining again, with an optional outcome. Two drawings of it: left to right on wide screens
 * (box widths fit their labels; the drawing scales to the column), top to bottom on phones (CSS picks one).
 * The arrows draw in, step by step, as it scrolls into view; under reduced motion (and without JavaScript)
 * it is simply drawn. Screen readers get the steps as an ordered list and the description instead.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { FlowCopy, FlowNode } from "@/content";
import styles from "./Flowchart.module.css";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const step = (i: number) => ({ "--i": i }) as CSSProperties;
/** JetBrains Mono's advance is 0.6em. */
const textWidth = (n: FlowNode, size: number) => Math.max(n.title.length, (n.note?.length ?? 0) * 0.8) * size * 0.6;

function Node({ box, node, i, size }: { box: Box; node: FlowNode; i: number; size: number }) {
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  return (
    <g className={styles.node} style={step(i)}>
      <rect x={x} y={y} width={w} height={h} rx={6} className={styles.box} />
      <text
        x={cx}
        y={node.note ? y + h / 2 - size * 0.25 : y + h / 2 + size * 0.36}
        textAnchor="middle"
        className={styles.title}
        style={{ fontSize: size }}
      >
        {node.title}
      </text>
      {node.note ? (
        <text x={cx} y={y + h / 2 + size * 1.1} textAnchor="middle" className={styles.note} style={{ fontSize: size * 0.8 }}>
          {node.note}
        </text>
      ) : null}
    </g>
  );
}

/** A connector that draws in, with its arrowhead (pointing right or down) appearing as it arrives. */
function Arrow({ d, to, dir, i, amber }: { d: string; to: [number, number]; dir: "right" | "down"; i: number; amber?: boolean }) {
  const [x, y] = to;
  const head = dir === "right" ? `M${x - 7} ${y - 4} L${x} ${y} L${x - 7} ${y + 4}` : `M${x - 4} ${y - 7} L${x} ${y} L${x + 4} ${y - 7}`;
  return (
    <g className={`${styles.arrow}${amber ? ` ${styles.amber}` : ""}`} style={step(i)}>
      <path d={d} pathLength={1} className={styles.line} />
      <path d={head} className={styles.head} />
    </g>
  );
}

/** Left to right: each step in its own column, the pair stacked in one column. */
function Wide({ f }: { f: FlowCopy }) {
  const s = 15;
  const gap = 48;
  const pad = 32;
  const width = (n: FlowNode) => Math.max(120, textWidth(n, s) + pad);
  const tall = (n: FlowNode) => (n.note ? 80 : 60);
  const pairH = 76;
  const mid = f.pair ? 150 : 50;
  const out: ReactNode[] = [];
  let x = 0;
  let i = 0;
  let prevRight: number | null = null;
  let fromPair: [number, number] | null = null; // the pair's centre lines, while joining
  let last: Box | null = null;

  const single = (n: FlowNode, key: string) => {
    const box = { x, y: mid - tall(n) / 2, w: width(n), h: tall(n) };
    if (fromPair) {
      const [lc, rc] = fromPair;
      const bend = x - gap / 2;
      out.push(<Arrow key={`${key}-a1`} d={`M${x - gap} ${lc} H${bend} V${mid} H${x - 2}`} to={[x - 1, mid]} dir="right" i={i} />);
      out.push(<Arrow key={`${key}-a2`} d={`M${x - gap} ${rc} H${bend} V${mid} H${x - 2}`} to={[x - 1, mid]} dir="right" i={i} />);
      i++;
      fromPair = null;
    } else if (prevRight !== null) {
      out.push(<Arrow key={`${key}-a`} d={`M${prevRight} ${mid} H${x - 2}`} to={[x - 1, mid]} dir="right" i={i++} />);
    }
    out.push(<Node key={key} box={box} node={n} i={i++} size={s} />);
    prevRight = x + box.w;
    x += box.w + gap;
    last = box;
  };

  f.before.forEach((n, k) => single(n, `b${k}`));
  if (f.pair) {
    const w = Math.max(width(f.pair[0]), width(f.pair[1]));
    const top = { x, y: 30, w, h: pairH };
    const bottom = { x, y: 194, w, h: pairH };
    const lc = top.y + pairH / 2;
    const rc = bottom.y + pairH / 2;
    const bend = x - gap / 2;
    out.push(<Arrow key="p-a1" d={`M${prevRight} ${mid} H${bend} V${lc} H${x - 2}`} to={[x - 1, lc]} dir="right" i={i} />);
    out.push(<Arrow key="p-a2" d={`M${prevRight} ${mid} H${bend} V${rc} H${x - 2}`} to={[x - 1, rc]} dir="right" i={i} />);
    i++;
    out.push(<Node key="p0" box={top} node={f.pair[0]} i={i} size={s} />);
    out.push(<Node key="p1" box={bottom} node={f.pair[1]} i={i++} size={s} />);
    prevRight = x + w;
    fromPair = [lc, rc];
    x += w + gap;
    last = bottom;
  }
  (f.after ?? []).forEach((n, k) => single(n, `a${k}`));

  const total = x - gap;
  const end = last as Box | null;
  let height = f.pair ? 300 : 100;
  if (f.outcome && end) {
    const ex = end.x + end.w / 2;
    const bottom = end.y + end.h;
    out.push(<Arrow key="o-a" d={`M${ex} ${bottom} V${bottom + 34}`} to={[ex, bottom + 35]} dir="down" i={i++} amber />);
    out.push(
      <text key="o" x={total} y={bottom + 60} textAnchor="end" className={styles.outcome} style={{ ...step(i), fontSize: s }}>
        {f.outcome}
      </text>,
    );
    height = Math.max(height, bottom + 72);
  }
  return (
    // At most its natural size (one unit a pixel), so every chart's labels are the same size on wide screens.
    <svg viewBox={`0 0 ${total} ${height}`} className={styles.wide} style={{ maxWidth: total }} aria-hidden="true" focusable="false">
      {out}
    </svg>
  );
}

/** Top to bottom, for phones: one step per row, the pair side by side. */
function Tall({ f }: { f: FlowCopy }) {
  const s = 14;
  const W = 360;
  const cx = W / 2;
  const gap = 40;
  const tall = (n: FlowNode) => (n.note ? 76 : 56);
  const width = (n: FlowNode) => Math.min(W - 40, Math.max(170, textWidth(n, s) + 32));
  const out: ReactNode[] = [];
  let y = 0;
  let i = 0;
  let prevBottom: number | null = null;
  let fromPair = false;
  let last: Box | null = null;

  const single = (n: FlowNode, key: string) => {
    const w = width(n);
    const box = { x: cx - w / 2, y, w, h: tall(n) };
    if (fromPair) {
      const merge = y - 30;
      out.push(<Arrow key={`${key}-a1`} d={`M85 ${y - 60} V${merge} H${cx} V${y - 2}`} to={[cx, y - 1]} dir="down" i={i} />);
      out.push(<Arrow key={`${key}-a2`} d={`M275 ${y - 60} V${merge} H${cx} V${y - 2}`} to={[cx, y - 1]} dir="down" i={i} />);
      i++;
      fromPair = false;
    } else if (prevBottom !== null) {
      out.push(<Arrow key={`${key}-a`} d={`M${cx} ${prevBottom} V${y - 2}`} to={[cx, y - 1]} dir="down" i={i++} />);
    }
    out.push(<Node key={key} box={box} node={n} i={i++} size={s} />);
    prevBottom = y + box.h;
    y += box.h + gap;
    last = box;
  };

  f.before.forEach((n, k) => single(n, `b${k}`));
  if (f.pair) {
    y += 20; // room to fork
    const fork = y - 30;
    out.push(<Arrow key="p-a1" d={`M${cx} ${prevBottom} V${fork} H85 V${y - 2}`} to={[85, y - 1]} dir="down" i={i} />);
    out.push(<Arrow key="p-a2" d={`M${cx} ${prevBottom} V${fork} H275 V${y - 2}`} to={[275, y - 1]} dir="down" i={i} />);
    i++;
    const left = { x: 0, y, w: 170, h: 76 };
    const right = { x: 190, y, w: 170, h: 76 };
    out.push(<Node key="p0" box={left} node={f.pair[0]} i={i} size={s * 0.92} />);
    out.push(<Node key="p1" box={right} node={f.pair[1]} i={i++} size={s * 0.92} />);
    prevBottom = y + 76;
    y += 76 + 60;
    fromPair = true;
    last = right;
  }
  (f.after ?? []).forEach((n, k) => single(n, `a${k}`));

  const end = last as Box | null;
  let height = (prevBottom ?? 0) + 2;
  if (f.outcome && end && !fromPair) {
    const bottom = end.y + end.h;
    out.push(<Arrow key="o-a" d={`M${cx} ${bottom} V${bottom + 32}`} to={[cx, bottom + 33]} dir="down" i={i++} amber />);
    out.push(
      <text key="o" x={cx} y={bottom + 56} textAnchor="middle" className={styles.outcome} style={{ ...step(i), fontSize: s }}>
        {f.outcome}
      </text>,
    );
    height = bottom + 64;
  }
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={styles.tall} aria-hidden="true" focusable="false">
      {out}
    </svg>
  );
}

const say = (n: FlowNode) => (n.note ? `${n.title}, ${n.note}` : n.title);

export function Flowchart({ flow }: { flow: FlowCopy }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-drawn", "");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.setAttribute("data-drawn", "");
        io.disconnect();
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const steps = [
    ...flow.before.map(say),
    ...(flow.pair ? [`${say(flow.pair[0])}; ${say(flow.pair[1])}`] : []),
    ...(flow.after ?? []).map(say),
  ];
  if (flow.outcome) steps[steps.length - 1] += `: ${flow.outcome}`;
  return (
    <figure ref={ref} className={styles.flow}>
      <Wide f={flow} />
      <Tall f={flow} />
      <ol className="sr-only">
        {steps.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <figcaption className={styles.caption}>
        {flow.caption}
        <span className="sr-only"> {flow.description}</span>
      </figcaption>
    </figure>
  );
}
