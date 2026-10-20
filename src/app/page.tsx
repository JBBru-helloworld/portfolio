import { WindowScene } from "@/components/scene/WindowScene";
import { getSceneData } from "@/components/scene/scene-data";
import { SkipIntro } from "@/components/scroll/SkipIntro";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { landing, profile } from "@/content";

export default function Home() {
  const scene = getSceneData();
  return (
    <main>
      <SkipIntro targetId={landing.placeholders[0].id} label={landing.skipIntro} />
      <SmoothScroll />
      <WindowScene
        data={scene}
        name={profile.name}
        role={profile.roleLines.default}
        sceneLabel={landing.sceneLabel}
        scrollCue={landing.scrollCue}
      />

      {/* Temporary placeholders so there is something to scroll into; replaced in later phases. */}
      {landing.placeholders.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          tabIndex={-1}
          className="flex min-h-[100svh] items-center border-t border-graphite-2 px-4 sm:px-8"
        >
          <h2 id={`${section.id}-heading`} className="mx-auto w-full max-w-6xl text-3xl font-medium text-paper-muted">
            {section.title}
          </h2>
        </section>
      ))}
    </main>
  );
}
