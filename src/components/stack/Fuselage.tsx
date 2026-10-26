/*
 * The aircraft under the seat map: a clean, top-down fuselage in graphite hairlines. A rounded nose with
 * the cockpit glazing, the wings at mid-cabin, the tailplane, the forward and aft galleys and lavatories,
 * and, before each zone, a band with its label (between zones, an exit row with chevrons at the doors).
 *
 * The shape is drawn once in (across, along) units and transposed for the horizontal drawing; labels are
 * placed separately in each, so text is never mirrored. Decorative: aria-hidden (the seats are the content).
 */
import type { ReactNode } from "react";
import { FUSELAGE, NOSE, TAIL, WALL, WING, type Layout } from "./seat-layout";
import styles from "./SeatMap.module.css";

/** The airframe in (x = across, y = along) units, the fuselage starting `off` units across. */
function Airframe({ layout, off, ext }: { layout: Layout; off: number; ext: number }) {
  const a0 = off;
  const a1 = off + FUSELAGE;
  const ac = off + FUSELAGE / 2;
  const { cabinEnd, length } = layout;
  // A pointed ogive nose, and a long tail cone tapering to a narrow tip.
  const body = [
    `M${a0} ${NOSE}`,
    `C${a0} ${NOSE * 0.5} ${ac - 34} ${NOSE * 0.08} ${ac} 0`,
    `C${ac + 34} ${NOSE * 0.08} ${a1} ${NOSE * 0.5} ${a1} ${NOSE}`,
    `L${a1} ${cabinEnd}`,
    `C${a1} ${cabinEnd + TAIL * 0.45} ${ac + 30} ${length - 46} ${ac + 7} ${length - 2}`,
    `L${ac - 7} ${length - 2}`,
    `C${ac - 30} ${length - 46} ${a0} ${cabinEnd + TAIL * 0.45} ${a0} ${cabinEnd}`,
    "Z",
  ].join(" ");
  // Wings, swept back from mid-cabin; on the standing plane only a stub shows beside the cabin.
  const mid = (layout.cabinStart + layout.cabinEnd) / 2;
  const root = mid - 70;
  const sweep = Math.max(ext * 0.9, 10);
  const wing = (side: 1 | -1) => {
    const edge = side > 0 ? a1 : a0;
    const tip = edge + side * ext;
    return `M${edge} ${root} L${tip} ${root + sweep} L${tip} ${root + sweep + 54} L${edge} ${root + 210} Z`;
  };
  // Tailplane: swept back from the tail cone, near the tip.
  const stab = (side: 1 | -1) => {
    const y = length - 150;
    const edge = side > 0 ? ac + 52 : ac - 52;
    const span = Math.max(ext * 0.78, 10);
    const tip = edge + side * span;
    return `M${edge} ${y} L${tip} ${y + span * 0.7 + 10} L${tip} ${y + span * 0.7 + 42} L${edge} ${y + 92} Z`;
  };
  // The fin, seen from above: a slim blade along the centreline of the tail cone.
  const fin = `M${ac} ${length - 196} L${ac + 5} ${length - 120} L${ac + 3} ${length - 14} L${ac - 3} ${length - 14} L${ac - 5} ${length - 120} Z`;
  const engine = (side: 1 | -1) => {
    if (ext < 60) return null;
    const x = (side > 0 ? a1 : a0) + side * ext * 0.48 - 13;
    return <rect x={x} y={root - 4} width={26} height={78} rx={12} className={styles.frameLine} />;
  };
  const exitChevrons = layout.bands
    .filter((b) => b.exit)
    .map((b) => {
      const y = (b.from + b.to) / 2;
      return (
        <g key={b.zone.letter} className={styles.frameMuted}>
          <path d={`M${a0 + 9} ${y - 5} L${a0 + 4} ${y} L${a0 + 9} ${y + 5}`} />
          <path d={`M${a1 - 9} ${y - 5} L${a1 - 4} ${y} L${a1 - 9} ${y + 5}`} />
        </g>
      );
    });
  const divider = layout.bands
    .filter((b) => b.exit)
    .map((b) => <line key={b.zone.letter} x1={a0 + WALL} x2={a1 - WALL} y1={b.from + 4} y2={b.from + 4} className={styles.frameMuted} />);
  // Galleys and lavatories: small hairline blocks against the walls, fore and aft.
  const fwd = layout.forwardGalley + 4;
  const aft = layout.aftGalley + 6;
  return (
    <g>
      <path d={wing(1)} className={styles.frameLine} />
      <path d={wing(-1)} className={styles.frameLine} />
      {engine(1)}
      {engine(-1)}
      <path d={stab(1)} className={styles.frameLine} />
      <path d={stab(-1)} className={styles.frameLine} />
      <path d={body} className={styles.frameBody} />
      <path d={fin} className={styles.frameLine} />
      {/* Cockpit glazing */}
      <path d={`M${ac - 40} ${NOSE * 0.5} Q${ac} ${NOSE * 0.36} ${ac + 40} ${NOSE * 0.5}`} className={styles.frameLine} />
      <path d={`M${ac - 52} ${NOSE * 0.62} Q${ac} ${NOSE * 0.48} ${ac + 52} ${NOSE * 0.62}`} className={styles.frameMuted} />
      <rect x={a0 + WALL} y={fwd} width={52} height={20} rx={3} className={styles.frameMuted} />
      <rect x={a1 - WALL - 40} y={fwd} width={40} height={20} rx={3} className={styles.frameMuted} />
      <rect x={a0 + WALL} y={aft} width={40} height={20} rx={3} className={styles.frameMuted} />
      <rect x={a1 - WALL - 52} y={aft} width={52} height={20} rx={3} className={styles.frameMuted} />
      {divider}
      {exitChevrons}
    </g>
  );
}

/** Labels in screen space, for either drawing. `pos` maps (across, along) to the drawing's (x, y). */
function Labels({ layout, off, pos, wide }: { layout: Layout; off: number; pos: (a: number, l: number) => [number, number]; wide: boolean }) {
  const a0 = off;
  const a1 = off + FUSELAGE;
  const ac = off + FUSELAGE / 2;
  // Galley (G) and lavatory (L) markers, fore and aft.
  const out: ReactNode[] = [];
  const mark = (key: string, a: number, l: number, text: string) => {
    const [x, y] = pos(a, l);
    out.push(
      <text key={key} x={x} y={y} className={styles.marker} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>,
    );
  };
  const fwd = layout.forwardGalley + 14;
  const aft = layout.aftGalley + 16;
  mark("g1", a0 + WALL + 26, fwd, "G");
  mark("l1", a1 - WALL - 20, fwd, "L");
  mark("l2", a0 + WALL + 20, aft, "L");
  mark("g2", a1 - WALL - 26, aft, "G");
  for (const b of layout.bands) {
    const [x, y] = pos(ac, (b.from + b.to) / 2 + 2);
    out.push(
      <text
        key={b.zone.letter}
        x={x}
        y={y}
        className={styles.zoneLabel}
        textAnchor="middle"
        dominantBaseline="central"
        transform={wide ? `rotate(-90 ${x} ${y})` : undefined}
      >
        {`ZONE ${b.zone.letter} · ${b.zone.name.toUpperCase()}`}
      </text>,
    );
  }
  return <g>{out}</g>;
}

export function Fuselage({ layout }: { layout: Layout }) {
  const wideH = FUSELAGE + 2 * WING.wide;
  const tallW = FUSELAGE + 2 * WING.tall;
  return (
    <>
      <svg viewBox={`0 0 ${layout.length} ${wideH}`} className={`${styles.fuselage} ${styles.wideOnly}`} aria-hidden="true" focusable="false">
        <g transform="matrix(0 1 1 0 0 0)">
          <Airframe layout={layout} off={WING.wide} ext={WING.wide - 8} />
        </g>
        <Labels layout={layout} off={WING.wide} pos={(a, l) => [l, a]} wide />
      </svg>
      <svg viewBox={`0 0 ${tallW} ${layout.length}`} className={`${styles.fuselage} ${styles.tallOnly}`} aria-hidden="true" focusable="false">
        <Airframe layout={layout} off={WING.tall} ext={WING.tall} />
        <Labels layout={layout} off={WING.tall} pos={(a, l) => [a, l]} wide={false} />
      </svg>
    </>
  );
}
