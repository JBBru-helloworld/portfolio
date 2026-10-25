import type { Destination } from "@/content";
import { projects, stackById, work } from "@/content";
import type { ManifestFlight } from "./AllFlights";
import type { FeaturedFlight } from "./FeaturedFlights";
import { AllFlights, FeaturedFlights } from "@/components/defer/islands";
import { mainPicture } from "./media";
import { yearOf } from "./format";
import styles from "./WorkSection.module.css";

/**
 * Gate 2, "Selected work": the six featured flights as an expanding gallery, then All flights, a compact
 * manifest naming every other project. Only what each shows reaches the client.
 */
export function WorkSection({ destination }: { destination: Destination }) {
  const featured: FeaturedFlight[] = projects
    .filter((p) => p.featured)
    .map((p) => ({
      slug: p.slug,
      flight: p.flight,
      name: p.name,
      summary: p.summary,
      emblem: p.emblem,
      image: mainPicture(p),
    }));
  const manifest: ManifestFlight[] = projects
    .filter((p) => !p.featured)
    .map((p) => ({
      slug: p.slug,
      flight: p.flight,
      name: p.name,
      year: yearOf(p.date),
      stack: p.stack.slice(0, 3).map((id) => stackById.get(id)?.name ?? id),
      summary: p.summary,
      emblem: p.emblem,
    }));

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <FeaturedFlights flights={featured} label={work.featuredLabel} viewLabel={work.viewFlight} />
        <AllFlights flights={manifest} label={work.allFlights} />
      </div>
    </section>
  );
}
