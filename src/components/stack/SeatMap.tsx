"use client";

/*
 * Gate 4, "Tech stack", as an aircraft seat map. Every technology is a seat showing its symbol; zones are
 * categories (never levels), front to back. Wide landscape screens show the plane lying down, nose on the
 * left; phones and portrait screens show it standing, nose at the top (the media query below, mirrored in
 * the CSS module).
 *
 * - Seats are buttons ("Seat 3A: Python, Languages"). The cabin is one tab stop; the arrow keys move between
 *   seats in the physical layout (a roving tabindex); Enter or Space selects; Escape closes the card and
 *   returns focus to the seat. Choosing a seat fills it amber and opens its card (beside the plane on wide
 *   screens, a bottom sheet on phones), and puts #seat-<id> in the address (replaceState).
 * - Group booking: choosing a project outlines its seats in amber and dims the rest, with a live summary.
 * - List view: the same content grouped by zone. It is what no-JavaScript visitors get (the map needs it).
 * - Entrance: once per visit, as the section comes about 40% into view, the seats appear row by row from the
 *   nose (a fade and a small rise). None under reduced motion.
 * - Links in: /#seat-<id> restores to the cabin, covered (site-state's restore centres the seat), and opens it.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Emblem as EmblemData, SeatMapCopy, Zone } from "@/content";
import { isClientNavigation, setSeat, whenRestored } from "@/components/nav/site-state";
import { Emblem } from "@/components/work/Emblem";
import { flyTo, readOrigin, rememberOrigin } from "@/components/work/flight-nav";
import { buildLayout, drawingSize, neighbour, SEAT, WING, type SeatSpot } from "./seat-layout";
import { Fuselage } from "./Fuselage";
import { GroupBooking } from "./GroupBooking";
import styles from "./SeatMap.module.css";

/** Wide screens lie the plane down. Mirrored in SeatMap.module.css. */
export const WIDE_MEDIA = "(orientation: landscape) and (min-width: 1024px) and (pointer: fine), (orientation: landscape) and (min-width: 1280px)";
const VIEW_KEY = "jbbru:stack-view";
const ENTERED_KEY = "jbbru:seatmap-entered";

export interface SeatData {
  id: string;
  symbol: string;
  name: string;
  zone: Zone;
  usedFor: string;
  /** Slugs of the projects that use it, in site order. */
  projects: string[];
  /** Roles (from Experience) where it was used, by organisation. */
  alsoAt: string[];
}

export interface ProjectRef {
  slug: string;
  flight: string;
  name: string;
  emblem: EmblemData;
  stack: string[];
  featured: boolean;
}

interface Props {
  seats: SeatData[];
  zones: Zone[];
  projects: ProjectRef[];
  copy: SeatMapCopy;
}

const store = {
  get(key: string, area: "local" | "session") {
    try {
      return (area === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string, area: "local" | "session") {
    try {
      (area === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
    } catch {
      // Storage unavailable: the preference lasts for this page only.
    }
  },
};

// The chosen view (map or list), remembered in localStorage. An external store, so the server and the first
// client render agree ("map"), and the saved choice follows straight after hydration.
type View = "map" | "list";
const viewListeners = new Set<() => void>();
let viewCache: View | null = null;
const viewStore = {
  subscribe(listener: () => void) {
    viewListeners.add(listener);
    return () => viewListeners.delete(listener);
  },
  get(): View {
    if (viewCache === null) viewCache = store.get(VIEW_KEY, "local") === "list" ? "list" : "map";
    return viewCache;
  },
  server: (): View => "map",
  set(v: View) {
    viewCache = v;
    store.set(VIEW_KEY, v, "local");
    viewListeners.forEach((l) => l());
  },
};

export function SeatMap({ seats, zones, projects, copy }: Props) {
  const router = useRouter();
  const layout = useMemo(() => buildLayout(seats.map((s) => ({ ...s, zone: s.zone.name })), zones), [seats, zones]);
  const size = drawingSize(layout);
  const byId = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
  const spotById = useMemo(() => new Map(layout.seats.map((s) => [s.id, s])), [layout]);
  const projectBySlug = useMemo(() => new Map(projects.map((p) => [p.slug, p])), [projects]);

  const [wide, setWide] = useState(false);
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get, viewStore.server);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(layout.seats[0]?.id ?? "");
  const [group, setGroup] = useState<string | null>(null);
  const cabinRef = useRef<HTMLDivElement>(null);
  const seatRefs = useRef(new Map<string, HTMLButtonElement>());

  const spot = selected ? spotById.get(selected) : undefined;
  const seat = selected ? byId.get(selected) : undefined;
  const booked = useMemo(() => new Set(group ? (projectBySlug.get(group)?.stack ?? []) : []), [group, projectBySlug]);
  const groupProject = group ? projectBySlug.get(group) : undefined;

  // Orientation, the remembered view, and the entrance (once per visit).
  useEffect(() => {
    const mq = window.matchMedia(WIDE_MEDIA);
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // The entrance is driven on the DOM (data-entered), outside React's render.
  useEffect(() => {
    const cabin = cabinRef.current;
    if (!cabin) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || store.get(ENTERED_KEY, "session")) {
      cabin.dataset.entered = "done";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Several changes can arrive in one batch: the last entry is the current state.
        const e = entries[entries.length - 1];
        if (!e.isIntersecting) return;
        io.disconnect();
        store.set(ENTERED_KEY, "1", "session");
        cabin.dataset.entered = "run";
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    io.observe(cabin);
    return () => io.disconnect();
  }, []);

  const select = useCallback(
    (id: string | null, { focus = false }: { focus?: boolean } = {}) => {
      setSelected(id);
      const s = id ? spotById.get(id) : undefined;
      setSeat(s ? { code: s.code, name: s.name.toUpperCase() } : null);
      if (id) {
        setFocusId(id);
        history.replaceState(history.state, "", `#seat-${id}`);
        if (focus) seatRefs.current.get(id)?.focus({ preventScroll: true });
      } else if (window.location.hash.startsWith("#seat-")) {
        history.replaceState(history.state, "", "#stack");
      }
    },
    [spotById],
  );

  // Links in (#seat-<id>, after the restore), and back from a project opened from a seat card.
  useEffect(() => {
    const open = (scroll: boolean) => {
      const h = window.location.hash;
      if (!h.startsWith("#seat-") || !spotById.has(h.slice(6))) return false;
      const id = h.slice(6);
      viewStore.set("map");
      select(id);
      // An in-page jump (the restore already centred the seat on a load): bring the seat to the middle.
      if (scroll) {
        requestAnimationFrame(() => {
          const r = seatRefs.current.get(id)?.getBoundingClientRect();
          if (!r) return;
          const top = r.top + window.scrollY - (window.innerHeight - r.height) / 2;
          if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
          else window.scrollTo({ top, behavior: "instant" });
        });
      }
      return true;
    };
    const onHash = () => open(true);
    const cancel = whenRestored(() => {
      if (open(false)) return;
      const origin = readOrigin();
      if (isClientNavigation() && origin?.id.startsWith("seat-") && spotById.has(origin.id.slice(5))) select(origin.id.slice(5));
    });
    window.addEventListener("hashchange", onHash);
    return () => {
      cancel();
      window.removeEventListener("hashchange", onHash);
      setSeat(null);
    };
  }, [select, spotById]);

  const chooseView = (v: View) => viewStore.set(v);

  // Phones: the card is a bottom sheet; keep the chosen seat in view above it.
  const sheetRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selected || !window.matchMedia("(max-width: 767px)").matches) return;
    const seatEl = seatRefs.current.get(selected);
    const sheet = sheetRef.current;
    if (!seatEl || !sheet) return;
    const id = requestAnimationFrame(() => {
      const gap = seatEl.getBoundingClientRect().bottom - (window.innerHeight - sheet.offsetHeight) + 16;
      if (gap > 0) window.scrollBy({ top: gap, behavior: "instant" });
    });
    return () => cancelAnimationFrame(id);
  }, [selected]);

  const onSeatKey = (e: KeyboardEvent<HTMLButtonElement>, s: SeatSpot) => {
    const map: Record<string, "fore" | "aft" | "towardsA" | "towardsF"> = wide
      ? { ArrowLeft: "fore", ArrowRight: "aft", ArrowUp: "towardsA", ArrowDown: "towardsF" }
      : { ArrowUp: "fore", ArrowDown: "aft", ArrowLeft: "towardsA", ArrowRight: "towardsF" };
    let next: SeatSpot | undefined;
    if (map[e.key]) next = neighbour(layout.seats, s, map[e.key]);
    else if (e.key === "Home") next = layout.seats[0];
    else if (e.key === "End") next = layout.seats[layout.seats.length - 1];
    else if (e.key === "Escape" && selected) {
      e.preventDefault();
      select(null);
      return;
    } else return;
    e.preventDefault();
    if (next && next.id !== s.id) {
      setFocusId(next.id);
      seatRefs.current.get(next.id)?.focus();
    }
  };

  const onSeatClick = (s: SeatSpot) => {
    select(selected === s.id ? null : s.id);
  };

  const closeCard = () => {
    const id = selected;
    select(null);
    if (id) seatRefs.current.get(id)?.focus();
  };

  const openProject = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const origin = selected ? seatRefs.current.get(selected) : null;
    if (origin) rememberOrigin(origin);
    flyTo(() => router.push(`/work/${slug}`), null);
  };

  const fromList = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    chooseView("map");
    select(id);
    requestAnimationFrame(() => {
      const el = seatRefs.current.get(id);
      el?.scrollIntoView({ block: "center", behavior: "instant" });
      el?.focus({ preventScroll: true });
    });
  };

  const count = (n: number) => `${n} ${n === 1 ? copy.projectCount.one : copy.projectCount.many}`;
  const cabinVars = {
    "--ww": size.wide.w,
    "--wh": size.wide.h,
    "--tw": size.tall.w,
    "--th": size.tall.h,
    "--seat": SEAT,
  } as CSSProperties;

  return (
    <div className={styles.map} data-view={view} data-group={group ? "" : undefined}>
      <div className={styles.controls}>
        <div className={styles.group}>
          <label id="group-booking-label" htmlFor="group-booking" className={styles.controlLabel}>
            {copy.groupBooking}
          </label>
          <GroupBooking
            projects={projects}
            value={group}
            copy={copy}
            onChange={(slug) => {
              setGroup(slug);
              if (slug) chooseView("map");
            }}
          />
          {groupProject ? (
            <p className={styles.booking}>
              <span>
                {`${booked.size} ${copy.booked} · ${groupProject.flight} ${groupProject.name}`}
              </span>
              <a href={`/work/${groupProject.slug}`} className={styles.textButton} onClick={(e) => openProject(e, groupProject.slug)}>
                {copy.viewFlight}
              </a>
              <button type="button" className={styles.textButton} onClick={() => setGroup(null)}>
                {copy.clear}
              </button>
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {groupProject
              ? `${booked.size} seats: ${[...booked].map((id) => byId.get(id)?.name).filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>
        <div className={styles.views} role="group" aria-label="View">
          {(["map", "list"] as const).map((v) => (
            <button key={v} type="button" className={styles.viewButton} aria-pressed={view === v} onClick={() => chooseView(v)}>
              {copy.views[v]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.plane}>
          <div
            ref={cabinRef}
            className={styles.cabin}
            style={cabinVars}
            role="group"
            aria-label={copy.cabinLabel}
          >
            <Fuselage layout={layout} />
            {layout.empties.map((s) => (
              <span
                key={`empty-${s.row}${s.letter}`}
                className={`${styles.seat} ${styles.empty}`}
                aria-hidden="true"
                style={
                  {
                    "--wx": s.along,
                    "--wy": WING.wide + s.across,
                    "--tx": WING.tall + s.across,
                    "--ty": s.along,
                    "--row": s.row - 1,
                  } as CSSProperties
                }
              />
            ))}
            {layout.seats.map((s) => {
              const isSelected = s.id === selected;
              return (
                <button
                  key={s.id}
                  id={`seat-${s.id}`}
                  ref={(el) => {
                    if (el) seatRefs.current.set(s.id, el);
                    else seatRefs.current.delete(s.id);
                  }}
                  type="button"
                  className={styles.seat}
                  data-restore-center=""
                  data-selected={isSelected || undefined}
                  data-booked={booked.has(s.id) || undefined}
                  tabIndex={s.id === focusId ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={`Seat ${s.code}: ${s.name}, ${s.zone.name}`}
                  onKeyDown={(e) => onSeatKey(e, s)}
                  onFocus={() => setFocusId(s.id)}
                  onClick={() => onSeatClick(s)}
                  style={
                    {
                      "--wx": s.along,
                      "--wy": WING.wide + s.across,
                      "--tx": WING.tall + s.across,
                      "--ty": s.along,
                      "--row": s.row - 1,
                    } as CSSProperties
                  }
                >
                  <span className={styles.symbol} aria-hidden="true">
                    {s.symbol}
                  </span>
                  <span className={styles.zoneLetter} aria-hidden="true">
                    {s.zone.letter}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.aside}>
          <div className={styles.legend}>
            <p className={styles.controlLabel}>{copy.legend.title}</p>
            <ul className={styles.legendList}>
              {zones.map((z) => (
                <li key={z.letter}>
                  <span className={styles.legendLetter} aria-hidden="true">
                    {z.letter}
                  </span>
                  {z.name}
                </li>
              ))}
              <li>
                <span className={`${styles.legendSwatch} ${styles.swatchSelected}`} aria-hidden="true" />
                {copy.legend.selected}
              </li>
              <li>
                <span className={`${styles.legendSwatch} ${styles.swatchEmpty}`} aria-hidden="true" />
                {copy.legend.empty}
              </li>
            </ul>
          </div>

          {seat && spot ? (
            <section
              ref={sheetRef}
              className={styles.card}
              aria-labelledby="seat-card-title"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeCard();
                }
              }}
            >
              <div className={styles.cardHead}>
                <span className={styles.cardSymbol} aria-hidden="true">
                  {spot.symbol}
                </span>
                <div>
                  <h3 id="seat-card-title" className={styles.cardName}>
                    {seat.name}
                  </h3>
                  <p className={styles.cardMeta}>
                    {`${copy.card.zone} ${spot.zone.letter} · ${spot.zone.name} · ${copy.card.seat} ${spot.code}`}
                  </p>
                </div>
                <button type="button" className={styles.close} onClick={closeCard} aria-label={copy.card.close}>
                  <X size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
              {seat.projects.length ? (
                <>
                  <p className={styles.cardLabel}>{copy.card.usedIn}</p>
                  <ul className={styles.cardProjects}>
                    {seat.projects.map((slug) => {
                      const p = projectBySlug.get(slug);
                      if (!p) return null;
                      return (
                        <li key={slug}>
                          <a href={`/work/${slug}`} className={styles.cardProject} onClick={(e) => openProject(e, slug)}>
                            <Emblem emblem={p.emblem} size={28} />
                            <span className={styles.cardProjectText}>
                              <span className={styles.cardFlight}>{p.flight}</span>
                              <span className={styles.cardProjectName}>{p.name}</span>
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
              {seat.alsoAt.length ? (
                <p className={styles.cardAlso}>
                  <span className={styles.cardLabel}>{copy.card.alsoAt}</span> {seat.alsoAt.join(", ")}
                </p>
              ) : null}
              {!seat.projects.length && !seat.alsoAt.length ? <p className={styles.cardAlso}>{seat.usedFor}</p> : null}
            </section>
          ) : null}
        </aside>
      </div>

      <div className={styles.list}>
        {zones.map((z) => (
          <section key={z.letter} aria-labelledby={`zone-${z.letter}`} className={styles.listZone}>
            <h3 id={`zone-${z.letter}`} className={styles.listHeading}>
              {`Zone ${z.letter} · ${z.name}`}
            </h3>
            <ul className={styles.listItems}>
              {layout.seats
                .filter((s) => s.zone.letter === z.letter)
                .map((s) => {
                  const n = byId.get(s.id)?.projects.length ?? 0;
                  return (
                    <li key={s.id}>
                      <a href={`#seat-${s.id}`} className={styles.listItem} onClick={(e) => fromList(e, s.id)}>
                        <span className={styles.listSymbol} aria-hidden="true">
                          {s.symbol}
                        </span>
                        <span className={styles.listName}>{s.name}</span>
                        <span className={styles.listCount}>{count(n)}</span>
                      </a>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
