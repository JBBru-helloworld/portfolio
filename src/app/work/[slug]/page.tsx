import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, FolderGit2, Globe, PenTool, Plane, PlayCircle } from "lucide-react";
import { departures, destinations, neighbours, profile, projects, stackById, work, type Link as ContentLink, type Project } from "@/content";
import { SiteNav } from "@/components/nav/SiteNav";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { Emblem } from "@/components/work/Emblem";
import { FlightPoster } from "@/components/work/FlightPoster";
import { formatDates, shown } from "@/components/work/format";
import { mainPicture, projectPictures, videoPicture } from "@/components/work/media";
import { HomeLink } from "@/components/work/project/HomeLink";
import { ProjectEntry } from "@/components/work/project/ProjectEntry";
import { ProjectHero } from "@/components/work/project/ProjectHero";
import { Screenshots } from "@/components/work/project/Screenshots";
import { Flowchart } from "@/components/work/project/Flowchart";
import { VideoFacade } from "@/components/work/project/VideoFacade";
import styles from "@/components/work/project/ProjectPage.module.css";

// One page per project (listed for the build). The Worker renders them on request, since this setup has
// no incremental cache to serve prerendered pages from; any other slug reaches notFound(): the site's 404.
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

const find = (slug: string) => projects.find((p) => p.slug === slug);

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const project = find((await params).slug);
  if (!project) return {};
  return {
    title: `${project.name} (${project.flight}) | ${profile.name}`,
    description: project.summary,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: { title: project.name, description: project.summary, type: "article", url: `/work/${project.slug}` },
  };
}

function watchUrl(v: NonNullable<Project["video"]>) {
  const q = new URLSearchParams({ v: v.id });
  if (v.list) q.set("list", v.list);
  if (v.index) q.set("index", String(v.index));
  return `https://www.youtube.com/watch?${q}`;
}

const ICONS = { live: Globe, repo: FolderGit2, design: PenTool, video: PlayCircle } as const;

function LinkButton({ link }: { link: ContentLink }) {
  const Icon = ICONS[link.kind as keyof typeof ICONS] ?? ExternalLink;
  const body = (
    <>
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      {link.label}
    </>
  );
  // A link to a home section ("/#security-check") stays on the site.
  if (link.url.startsWith("/#")) {
    return (
      <HomeLink section={link.url.slice(2)} className={styles.button}>
        {body}
      </HomeLink>
    );
  }
  return (
    <a href={link.url} className={styles.button} target="_blank" rel="noopener">
      {body}
    </a>
  );
}

export default async function ProjectPage({ params }: PageProps<"/work/[slug]">) {
  const project = find((await params).slug);
  if (!project) notFound();

  const pictures = projectPictures(project.slug);
  const main = mainPicture(project);
  const shots = pictures.slice(1).map((picture, i) => ({ picture, ...project.images[i + 1] }));
  const { previous, next } = neighbours(project.slug);
  const links: ContentLink[] = [
    ...project.links.filter((l) => shown(l.url)),
    ...(project.video ? [{ label: work.watchOnYouTube, url: watchUrl(project.video), kind: "video" as const }] : []),
  ];
  const did = project.caseStudy.did.filter(shown);
  const flows = work.flows[project.slug] ?? [];

  return (
    <>
      <ProjectEntry />
      <SiteNav
        name={profile.name}
        board={departures}
        destinations={destinations}
        flight={{ code: project.flight, sign: project.sign, name: project.name }}
      />
      <main className={styles.page}>
        <SmoothScroll />
        <article className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.flightLine}>
              <Emblem emblem={project.emblem} size={64} className={styles.emblem} />
              <p className={styles.code}>
                <span className="sr-only">Flight </span>
                {project.flight}
              </p>
            </div>
            <h1 className={styles.title}>{project.name}</h1>
            <p className={styles.meta}>
              {[
                project.role,
                // "Data Scientist Intern, Touch 'n Go Digital" already names the role.
                project.context && !project.context.startsWith(project.role) ? project.context : project.context?.split(", ").slice(1).join(", "),
                formatDates(project.date),
              ]
                .filter(shown)
                .join(" · ")}
            </p>
            <p className={styles.summary}>{project.summary}</p>
            {links.length ? (
              <ul className={styles.links}>
                {links.map((l) => (
                  <li key={l.url}>
                    <LinkButton link={l} />
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {main ? (
            <ProjectHero picture={main.picture} alt={main.alt} caption={project.images[0]?.caption} />
          ) : (
            <div className={styles.posterFrame}>
              <FlightPoster project={project} />
            </div>
          )}

          <section className={styles.block} aria-labelledby="stack-heading">
            <h2 id="stack-heading" className={styles.label}>
              {work.headings.stack}
            </h2>
            <ul className={styles.chips}>
              {project.stack.map((id) => (
                <li key={id}>
                  <HomeLink section={`seat-${id}`} className={styles.chip}>
                    {stackById.get(id)?.name ?? id}
                  </HomeLink>
                </li>
              ))}
            </ul>
          </section>

          {project.metrics.length ? (
            <section className={styles.block} aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className={styles.label}>
                {work.headings.metrics}
              </h2>
              <dl className={styles.metrics}>
                {project.metrics.map((m) => (
                  <div key={m.label} className={styles.metric}>
                    <dt className={styles.metricLabel}>{m.label}</dt>
                    <dd className={styles.metricValue}>{m.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className={styles.block} aria-labelledby="case-heading">
            <h2 id="case-heading" className={styles.label}>
              {work.headings.caseStudy}
            </h2>
            <div className={styles.case}>
              {shown(project.caseStudy.problem) ? (
                <div className={styles.caseItem}>
                  <h3 className={styles.caseHeading}>{work.headings.problem}</h3>
                  <p>{project.caseStudy.problem}</p>
                </div>
              ) : null}
              {did.length ? (
                <div className={styles.caseItem}>
                  <h3 className={styles.caseHeading}>{work.headings.did}</h3>
                  <ul className={styles.did}>
                    {did.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {shown(project.caseStudy.result) ? (
                <div className={styles.caseItem}>
                  <h3 className={styles.caseHeading}>{work.headings.result}</h3>
                  <p>{project.caseStudy.result}</p>
                </div>
              ) : null}
            </div>
          </section>

          {flows.map((flow, k) => (
            <section key={flow.heading} className={styles.block} aria-labelledby={`flow-${k}-heading`}>
              <h2 id={`flow-${k}-heading`} className={styles.label}>
                {flow.heading}
              </h2>
              <Flowchart flow={flow} />
            </section>
          ))}

          {shots.length ? (
            <section className={styles.block} aria-labelledby="shots-heading">
              <h2 id="shots-heading" className={styles.label}>
                {work.headings.screenshots}
              </h2>
              <Screenshots shots={shots} enlarge={work.enlarge} close={work.close} />
            </section>
          ) : null}

          {project.video ? (
            <section className={styles.block} aria-labelledby="video-heading">
              <h2 id="video-heading" className={styles.label}>
                {work.headings.video}
              </h2>
              <VideoFacade video={project.video} thumb={videoPicture(project.slug)} title={project.name} playLabel={work.playVideo} />
            </section>
          ) : null}

          <nav className={styles.flights} aria-label="More flights">
            <Link href={`/work/${previous.slug}`} className={`${styles.flight} ${styles.previous}`}>
              <span className={styles.flightDir}>
                <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                {work.previous}
              </span>
              <span className={styles.flightBody}>
                <Emblem emblem={previous.emblem} size={36} />
                <span>
                  <span className={styles.flightCode}>{previous.flight}</span>
                  <span className={styles.flightName}>{previous.name}</span>
                </span>
              </span>
            </Link>
            <Link href={`/work/${next.slug}`} className={`${styles.flight} ${styles.next}`}>
              <span className={styles.flightDir}>
                {work.next}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className={styles.flightBody}>
                <Emblem emblem={next.emblem} size={36} />
                <span>
                  <span className={styles.flightCode}>{next.flight}</span>
                  <span className={styles.flightName}>{next.name}</span>
                </span>
              </span>
            </Link>
            {/* scroll={false}: the home page's restore lands on the origin; Next.js's own scroll and focus
                would move it again (WebKit scrolls the focused page). */}
            <Link href="/" scroll={false} className={styles.back}>
              <Plane size={16} strokeWidth={1.5} aria-hidden="true" className={styles.backPlane} />
              {work.backToAll}
            </Link>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
