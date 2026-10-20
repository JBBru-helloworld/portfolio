import type { Destination } from "@/content";

/**
 * One of the site's sections (a destination on the departures board). A placeholder heading until the
 * section is built in a later phase; the id is the anchor the board and the corner navigation glide to.
 */
export function DestinationSection({ destination }: { destination: Destination }) {
  return (
    <section
      id={destination.id}
      aria-labelledby={`${destination.id}-heading`}
      tabIndex={-1}
      className="flex min-h-[100svh] items-center border-t border-graphite-2 px-4 outline-none sm:px-8"
    >
      <h2 id={`${destination.id}-heading`} className="mx-auto w-full max-w-6xl text-3xl font-medium text-paper-muted">
        {destination.name}
      </h2>
    </section>
  );
}
