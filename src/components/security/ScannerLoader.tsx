"use client";

/*
 * Loads the scanner (its own chunk, with the bag images) only when the Security check is near. Until then,
 * and without JavaScript, the server-rendered summary inside stays on the page.
 */
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const Scanner = lazy(() => import("./Scanner"));

interface Props {
  projectHref: string;
  projectFlight: string;
  repoUrl: string;
  /** The static summary, shown until the scanner loads. */
  children: ReactNode;
  /** The wrapper's class, from the server (importing the stylesheet here would put its class map in the home page's JavaScript). */
  className: string;
}

export function ScannerLoader({ children, className, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {near ? (
        <Suspense fallback={children}>
          <Scanner {...props} />
        </Suspense>
      ) : (
        children
      )}
    </div>
  );
}
