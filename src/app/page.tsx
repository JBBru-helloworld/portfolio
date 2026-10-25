import { DeparturesBoard } from "@/components/departures/DeparturesBoard";
import { NoScriptBrief } from "@/components/noscript/NoScriptBrief";
import { JourneySection, SiteNav } from "@/components/defer/islands";
import { WindowScene } from "@/components/scene/WindowScene";
import { getSceneData } from "@/components/scene/scene-data";
import { DestinationSection } from "@/components/sections/DestinationSection";
import { WorkSection } from "@/components/work/WorkSection";
import { StackSection } from "@/components/stack/StackSection";
import { LogbookSection } from "@/components/logbook/LogbookSection";
import { DutyFreeSection } from "@/components/dutyfree/DutyFreeSection";
import { SecurityCheckSection } from "@/components/security/SecurityCheckSection";
import { HomeEntry } from "@/components/work/HomeEntry";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SkipIntro } from "@/components/scroll/SkipIntro";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { departures, destinations, journey, journeyPage, landing, links, passport, profile } from "@/content";
import { siteUrl } from "@/lib/site";

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
  // Structured data: who the site is about (no email, phone or location).
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.roleLines.default,
    url: `${siteUrl}/`,
    sameAs: [links.github.url, links.linkedin.url, links.instagram.url, links.x.url],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
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
          flightDeck={landing.flightDeck}
          passenger={landing.passenger}
        />

        <DeparturesBoard board={departures} destinations={destinations} />
        <NoScriptBrief />

        {/* The board's destinations, in page order (placeholders until each section is built). */}
        {destinations.map((destination) =>
          destination.id === "journey" ? (
            <JourneySection key={destination.id} destination={destination} page={journeyPage} entries={journeyEntries} passport={passport} />
          ) : destination.id === "work" ? (
            <WorkSection key={destination.id} destination={destination} />
          ) : destination.id === "security-check" ? (
            <SecurityCheckSection key={destination.id} destination={destination} />
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
