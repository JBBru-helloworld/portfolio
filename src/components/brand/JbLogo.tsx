/*
 * The JB monogram (the owner's logo, assets/brand/jb-logo.svg), optimised: one filled outline in
 * currentColor, so it takes the link's colour (paper, amber on hover and focus). The same drawing is saved
 * as src/components/brand/jb-logo.svg for the favicon and icons (Phase 6).
 */
export function JbLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1158 747" className={className} aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M 950.7 331.4 L 949.3 331.4 C 1007.1 303.1 1047.1 243.7 1047.1 175.1 C 1047.1 79.1 969.1 1 873.1 1 L 269.2 1 C 264.2 1 260.3 4.9 260.3 9.9 C 260.3 14.9 264.2 18.8 269.2 18.8 L 565.2 18.8 L 565.2 453.5 C 565.2 604.3 442.6 727 291.8 727 C 141 727 18.3 604.4 18.3 453.5 C 18.3 448.6 14.4 444.6 9.4 444.6 C 4.4 444.6 0.6 448.7 0.6 453.5 C 0.6 614.1 131.3 744.8 291.9 744.8 C 452.4 744.8 583.2 614.1 583.2 453.5 L 583.2 349.2 L 950.7 349.2 C 1054.8 349.2 1139.6 434 1139.6 538.1 C 1139.6 642.2 1054.8 727 950.7 727 L 574.3 727 C 569.3 727 565.3 730.9 565.3 735.9 C 565.3 740.9 569.3 744.8 574.3 744.8 L 950.7 744.8 C 1064.7 744.8 1157.4 652.1 1157.4 538.1 C 1157.4 424.2 1064.6 331.4 950.7 331.4 Z M 583.2 18.8 L 873.1 18.8 C 959.2 18.8 1029.3 88.9 1029.3 175.1 C 1029.3 261.3 959.2 331.4 873.1 331.4 L 583.2 331.4 Z M 583.2 18.8" />
    </svg>
  );
}
