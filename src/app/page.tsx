import { DeparturesBoard } from "@/components/departures/DeparturesBoard";
import { SiteNav } from "@/components/nav/SiteNav";
import { WindowScene } from "@/components/scene/WindowScene";
import { getSceneData } from "@/components/scene/scene-data";
import { DestinationSection } from "@/components/sections/DestinationSection";
import { SkipIntro } from "@/components/scroll/SkipIntro";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { departures, destinations, landing, profile } from "@/content";

export default function Home() {
  const scene = getSceneData();
  return (
    <>
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
        {destinations.map((destination) => (
          <DestinationSection key={destination.id} destination={destination} />
        ))}
      </main>
    </>
  );
}
