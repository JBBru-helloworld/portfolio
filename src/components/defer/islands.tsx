"use client";

/*
 * The site's deferred islands (Phase 6), all in one module so every page knows them: the root layout's
 * IslandPreloader fetches their code in idle time on any page, ready for a client-side return home.
 * Each keeps the same props as the component it wraps (see defer.tsx).
 */
import { deferred, deferredIdle } from "./defer";

// The islands' styles load with the page, never with their code: the server HTML they keep in place must be
// styled from the first paint (in development a lazy chunk brings its CSS only when it loads, so the corner
// sign's logo painted full size and the page was measured a screen too tall).
import "@/components/journey/JourneySection.module.css";
import "@/components/work/Emblem.module.css";
import "@/components/work/FlightPoster.module.css";
import "@/components/work/FeaturedFlights.module.css";
import "@/components/work/AllFlights.module.css";
import "@/components/stack/SeatMap.module.css";
import "@/components/logbook/Logbook.module.css";
import "@/components/departures/DeparturesBoard.module.css";
import "@/components/dutyfree/DutyFree.module.css";
import "@/components/sound/SoundToggle.module.css";
import "@/components/nav/SiteNav.module.css";

export { IslandPreloader } from "./defer";

export const JourneySection = deferred(() => import("@/components/journey/JourneySection").then((m) => m.JourneySection), "journey");
export const FeaturedFlights = deferred(() => import("@/components/work/FeaturedFlights").then((m) => m.FeaturedFlights), "work");
export const AllFlights = deferred(() => import("@/components/work/AllFlights").then((m) => m.AllFlights), "work");
export const SeatMap = deferred(() => import("@/components/stack/SeatMap").then((m) => m.SeatMap), "stack");
export const LogbookReveal = deferred(() => import("@/components/reveal/RevealGroup").then((m) => m.RevealGroup), "experience");
export const PhotoStack = deferred(() => import("@/components/logbook/PhotoStack").then((m) => m.PhotoStack), "experience");
export const ViewFlight = deferred(() => import("@/components/logbook/ViewFlight").then((m) => m.ViewFlight), "experience");
export const DutyFreeReveal = deferred(() => import("@/components/reveal/RevealGroup").then((m) => m.RevealGroup), "contact");
export const EmailProduct = deferred(() => import("@/components/dutyfree/EmailProduct").then((m) => m.EmailProduct), "contact");
// The corner sign is hidden until the landing has passed: it hydrates in idle time.
export const SiteNav = deferredIdle(() => import("@/components/nav/SiteNav").then((m) => m.SiteNav));
