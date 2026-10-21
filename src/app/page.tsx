import { DeparturesBoard } from "@/components/departures/DeparturesBoard";
import { SiteNav } from "@/components/nav/SiteNav";
import { WindowScene } from "@/components/scene/WindowScene";
import { getSceneData } from "@/components/scene/scene-data";
import { JourneySection } from "@/components/journey/JourneySection";
import { DestinationSection } from "@/components/sections/DestinationSection";
import { WorkSection } from "@/components/work/WorkSection";
import { StackSection } from "@/components/stack/StackSection";
import { LogbookSection } from "@/components/logbook/LogbookSection";
import { DutyFreeSection } from "@/components/dutyfree/DutyFreeSection";
import { HomeEntry } from "@/components/work/HomeEntry";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SkipIntro } from "@/components/scroll/SkipIntro";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { departures, destinations, journey, journeyPage, landing, profile } from "@/content";

export default function Home() {
  const scene = getSceneData();
  // Only what the page shows reaches the client (owner notes stay on the server).
  const journeyEntries = journey.map(({ country, ink, years, label, line, period, stamp }) => ({
    country,
    ink,
    years,
    label,
    line,
    period,
    stamp,
  }));
  return (
    <>
      <HomeEntry />
      <SkipIntro targetId="departures" label={landing.skipIntro} />
      <SiteNav name={profile.name} board={departures} destinations={destinations} />
      <main>
        <SmoothScroll />
        <WindowScene
          data={scene}
          name={profile.name}
          role={profile.roleLines.default}
          sceneLabel={landing.sceneLabel}
          scrollCue={landing.scrollCue}
        />

        <DeparturesBoard board={departures} destinations={destinations} />

        {/* The board's destinations, in page order (placeholders until each section is built). */}
        {destinations.map((destination) =>
          destination.id === "journey" ? (
            <JourneySection key={destination.id} destination={destination} page={journeyPage} entries={journeyEntries} />
          ) : destination.id === "work" ? (
            <WorkSection key={destination.id} destination={destination} />
          ) : destination.id === "stack" ? (
            <StackSection key={destination.id} destination={destination} />
          ) : destination.id === "experience" ? (
            <LogbookSection key={destination.id} destination={destination} />
          ) : destination.id === "contact" ? (
            <DutyFreeSection key={destination.id} destination={destination} />
          ) : (
            <DestinationSection key={destination.id} destination={destination} />
          ),
        )}
      </main>
      <SiteFooter />
    </>
  );
}
