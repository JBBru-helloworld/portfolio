# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Engineering managers and recruiters** deciding, in seconds, who Joshua Bonham is, what he works on, whether there is proof, and how to reach him.
- **Technical interviewers and engineers** who read the case studies closely and will check the claims, the methods and the code.

## Product Purpose

jbbru.com is the personal portfolio of Joshua Bonham. It must communicate three things fast: the role, the proof behind it, and the way to get in touch. It also has to hold up to close reading by engineers. Success means a reviewer leaves knowing the role, having seen real work, and with a clear contact route.

## Positioning

**Software engineer, ML and data.** ML, data and AI lead; full-stack is how the work gets shipped. The site's distinguishing mechanism is demonstration over description: a live fraud-detection "security check" demo runs a real model from Joshua's own project rather than describing one.

## Operating Context

- Visitors arrive from a CV, LinkedIn, GitHub or a direct link, often on a phone first and a laptop second.
- Reviewers skim first, then some read a case study in depth, open the code, or try the demo.

## Capabilities and Constraints

- Next.js 15.5 (App Router) on Cloudflare Workers via OpenNext. Server routes are available for later features.
- Feature flags in `src/config/features.ts`: `assistant` (an AI assistant, off), `securityCheck` (the fraud demo, on).
- **Content exclusions everywhere** (copy, metadata, alt text, structured data, content files): the owner's exclusion list in the local `CLAUDE.md` ground rules is binding. Check it before writing any copy.
- UK English in all site copy. No em dashes in site copy.
- Never invent facts, numbers, dates, links or employers. Anything unverified is marked `TODO(owner)`.
- Undecided: which projects become full case studies, the headline numbers for the departures board, and the details and dates of the South Africa leg of the journey.

## Brand Commitments

- Name: Joshua Bonham; domain jbbru.com.
- The concept "Window seat", with its signature elements (the cabin-window landing, the split-flap departures board, passport stamps, a periodic table of the stack, the live fraud demo), is set by the owner. Visual specifics live in DESIGN.md.
- Voice: calm, precise and confident. Never hype.

## Evidence on Hand

- **Fraud-detection project** (real, owner's own): `github.com/JBBru-helloworld/payments-fraud-detection`, local at `../payments-fraud-detection`. LightGBM on the IEEE-CIS dataset with a chronological split; test PR-AUC 0.5879 (95% bootstrap interval 0.5673 to 0.6020) against a 3.48% fraud rate; SHAP and error analysis, a cost-based threshold and a Dockerised FastAPI service. This is the basis of the live demo. Only figures in that repo's reports may be quoted.
- **Old-site projects** (11, inventoried in `docs/AUDIT.md`), including Budget Tracker, Harvest For All, an AWS receipt pipeline, Grab Buddy (UMHackathon 2025) and Pengyou (ImagineHack 2024). Several have unresolved inconsistencies listed in the audit.
- **CV facts** listed in `docs/AUDIT.md` section 7, each pending owner confirmation.
- **Absent, must not be fabricated:** testimonials, client names, employer names beyond the confirmed record, award wins not in the record, metrics not in a source.

## Product Principles

1. **Role, proof, contact, in that order and within seconds.** Nothing (including the landing spectacle) may delay or hide them.
2. **Show, don't claim.** A working demo or a linked artefact beats an adjective.
3. **Every number has a source.** Figures come from the owner's records or project reports, or they do not appear.
4. **One signature moment.** The window landing is the spectacle; everything after it is calm, fast and easy to scan.
5. **Hold up to an engineer's reading.** Case studies state method, trade-offs and limits honestly.

## Accessibility & Inclusion

WCAG 2.2 AA. Includes contrast, full keyboard access with a visible focus ring, `prefers-reduced-motion` support (the cinematic landing must have a calm path), and content that does not depend on motion, colour or the demo to be understood.
