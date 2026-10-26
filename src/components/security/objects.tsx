/*
 * The X-ray objects, one per reason behind the model's decision (the groups set in Phase 5a): drawn as
 * line drawings in the X-ray's style, in currentColor (amber when the reason raised the risk, pale grey
 * when it lowered it). The same drawings are the report's list icons.
 */
import type { ReactElement } from "react";

const DRAWINGS: Record<string, ReactElement> = {
  // A till receipt with a torn foot and printed lines.
  receipt: (
    <>
      <path d="M14 6 H34 V40 L31 38 L28 40 L25 38 L22 40 L19 38 L16 40 L14 38 Z" />
      <path d="M18 13 H30 M18 18 H27 M18 23 H30 M18 28 H24" className="fine" />
      <path d="M26 32 H30" />
    </>
  ),
  // An alarm clock: the face, two bells and the hands.
  clock: (
    <>
      <circle cx="24" cy="26" r="14" />
      <path d="M24 17 V26 L30 29" />
      <path d="M11 13 A6 6 0 0 1 18 9 M37 13 A6 6 0 0 0 30 9" />
      <path d="M15 38 L12 42 M33 38 L36 42" className="fine" />
    </>
  ),
  // A stack of three cards, the top one with a chip and a stripe of digits.
  cards: (
    <>
      <rect x="10" y="20" width="30" height="19" rx="2.5" />
      <path d="M13 16 H39 A3 3 0 0 1 42 19 V33" className="fine" />
      <path d="M16 12 H41 A3 3 0 0 1 44 15 V28" className="fine" />
      <rect x="14" y="25" width="6" height="5" rx="1" />
      <path d="M14 34 H22 M25 34 H30" className="fine" />
    </>
  ),
  // A phone: the body, the screen and the button.
  phone: (
    <>
      <rect x="15" y="6" width="18" height="36" rx="3.5" />
      <path d="M18 11 H30 V33 H18 Z" className="fine" />
      <circle cx="24" cy="37.5" r="1.6" />
    </>
  ),
  // A compass: the case, the ring and the needle.
  compass: (
    <>
      <circle cx="24" cy="25" r="15" />
      <circle cx="24" cy="25" r="11" className="fine" />
      <path d="M24 8 V5 M21 5 H27" />
      <path d="M28 21 L20 29 M28 21 L22.5 23.5 L20 29 L25.5 26.5 Z" />
    </>
  ),
  // An envelope with its flap.
  envelope: (
    <>
      <rect x="7" y="13" width="34" height="23" rx="2" />
      <path d="M7 15 L24 27 L41 15" />
      <path d="M7 34 L19 24 M41 34 L29 24" className="fine" />
    </>
  ),
  // A sealed box: every other, anonymised signal.
  other: (
    <>
      <path d="M8 17 L24 10 L40 17 V34 L24 41 L8 34 Z" />
      <path d="M8 17 L24 24 L40 17 M24 24 V41" className="fine" />
      <path d="M16 13.5 L32 20.5 V26" />
    </>
  ),
};

export function ObjectDrawing({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {DRAWINGS[id] ?? DRAWINGS.other}
    </svg>
  );
}
