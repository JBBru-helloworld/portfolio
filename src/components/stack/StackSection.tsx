import type { Destination } from "@/content";
import { experience, projects, seatMap, stack, stackId, zones } from "@/content";
import type { ProjectRef, SeatData } from "./SeatMap";
import { SeatMap } from "@/components/defer/islands";
import styles from "./StackSection.module.css";

/**
 * Gate 4, "Tech stack": the seat map. Builds, for every technology, the projects that use it (site order)
 * and the roles where it was used (Experience), so only what the cabin and its cards show reach the client.
 */
export function StackSection({ destination }: { destination: Destination }) {
  const seats: SeatData[] = stack.map((e) => ({
    id: e.id,
    symbol: e.symbol,
    name: e.name,
    zone: zones.find((z) => z.name === e.zone)!,
    usedFor: e.usedFor,
    projects: projects.filter((p) => p.stack.includes(e.id)).map((p) => p.slug),
    alsoAt: experience.filter((x) => x.stack.some((name) => stackId(name) === e.id)).map((x) => x.organisation),
  }));
  const refs: ProjectRef[] = projects.map((p) => ({
    slug: p.slug,
    flight: p.flight,
    name: p.name,
    emblem: p.emblem,
    stack: p.stack,
    featured: p.featured,
  }));

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.label} aria-hidden="true">
          {seatMap.label}
        </p>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <p className={styles.intro}>{seatMap.intro}</p>
        <SeatMap seats={seats} zones={zones} projects={refs} copy={seatMap} />
      </div>
    </section>
  );
}
