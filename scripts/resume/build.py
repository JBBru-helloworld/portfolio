"""
The resume: `pnpm resume:build`.

Reads the owner's resume PDF from assets/resume/ (any file name; exactly one PDF), and:

  1. extracts its text (poppler's pdftotext) and FAILS, naming what it found, if it contains a phone number,
     a street address, availability or notice-period lines, visa or work-permit wording, "Singapore" (or a
     Singapore company suffix, "Pte. Ltd."), or the Sunway Tech Club outside its entry for the GenAI Study Jam
     or the portfolio workshop (the only two items the site may name it for). A failed check also removes any
     previously published resume;
  2. rewrites it with pypdf, keeping the pages and dropping the document information (author, creator and
     producer tools, dates) and the XMP metadata;
  3. writes public/resume/joshua-bonham-resume.pdf and src/content/resume-media.json ({ "available": ... }),
     which the Duty free shelf reads: without a resume, the Resume product is hidden, never a broken link.

With no PDF in assets/resume/ it skips quietly (the manifest says whether a built resume exists).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject

ROOT = Path(__file__).resolve().parents[2]
# RESUME_SRC points the checks at another folder (used to test them with a throwaway PDF).
SRC = Path(os.environ["RESUME_SRC"]) if os.environ.get("RESUME_SRC") else ROOT / "assets" / "resume"
OUT = ROOT / "public" / "resume" / "joshua-bonham-resume.pdf"
MANIFEST = ROOT / "src" / "content" / "resume-media.json"

# Phrases that must never be in the public resume, by kind.
FORBIDDEN: list[tuple[str, re.Pattern[str]]] = [
    ("Singapore", re.compile(r"\bsingapore\b", re.I)),
    # A Singapore-registered company's suffix points to Singapore just the same.
    ("Singapore company suffix (Pte. Ltd.)", re.compile(r"\bpte\.?\s*ltd\b", re.I)),
    (
        "availability or notice period",
        re.compile(
            r"\b(availab(le|ility)|notice period|start(ing)? date|immediate(ly)? (start|available)|open to (work|opportunit\w*)"
            r"|looking for (work|a role|an? (job|internship|position|opportunit\w*))|seeking (a|an|full|part)\b|job[\s-]*hunt\w*)",
            re.I,
        ),
    ),
    (
        "visa or work permit",
        re.compile(
            r"\b(visa|work permit|work pass|employment pass|dependant'?s? pass|right to work|sponsorship|permanent resident"
            r"|citizenship|nationality)\b",
            re.I,
        ),
    ),
    (
        "street address",
        re.compile(
            r"\b(jalan|jln\.?|lorong|persiaran|lebuh|taman|street|road|avenue|boulevard|lane|drive|blk|block \d+|unit #?\d"
            r"|apartment|apt\.?|condominium|condo|residence[s]?)\b|\b\d{5}\s+[A-Z][a-z]+",
            re.I,
        ),
    ),
]
PHONE = re.compile(r"(?<![\w.])(\+?\(?\d[\d\s().-]{6,}\d)(?![\w.])")
YEAR_RANGE = re.compile(r"(19|20)\d{2}(19|20)\d{2}")


def phones(text: str) -> list[str]:
    found = []
    for m in PHONE.finditer(text):
        digits = re.sub(r"\D", "", m.group(1))
        # A phone number has at least 8 digits; "2023 2026" (two years) is not one.
        if len(digits) >= 8 and not YEAR_RANGE.fullmatch(digits):
            found.append(m.group(1).strip())
    return found


# The site's exclusions apply to the resume too (CLAUDE.md): the club may be named only for the GenAI Study
# Jam and the portfolio workshop. Each mention must sit in an entry that names one of them: its own line, the
# line before, or up to three lines after, stopping at the next section heading (a line in capitals).
CLUB = re.compile(r"\bsunway\s+tech\s+club\b", re.I)
CLUB_ITEMS = re.compile(r"\bstudy\s+jam\b|\bportfolio\s+workshop\b", re.I)
HEADING = re.compile(r"^[A-Z][A-Z &/]{2,}$")


def club_problems(text: str) -> list[str]:
    lines = text.splitlines()
    out = []
    for i, line in enumerate(lines):
        if not CLUB.search(line):
            continue
        entry = [line] + ([lines[i - 1]] if i > 0 else [])
        for after in lines[i + 1 : i + 4]:
            if HEADING.match(after.strip()):
                break
            entry.append(after)
        if not any(CLUB_ITEMS.search(x) for x in entry):
            out.append(f"Sunway Tech Club outside the Study Jam or portfolio workshop: {line.strip()[:90]!r}")
    return out


def problems(text: str) -> list[str]:
    out = [f"phone number: {p!r}" for p in phones(text)]
    for label, pattern in FORBIDDEN:
        for m in pattern.finditer(text):
            line = text[max(0, text.rfind("\n", 0, m.start()) + 1) : text.find("\n", m.end()) if "\n" in text[m.end():] else len(text)]
            out.append(f"{label}: {m.group(0)!r} in {line.strip()[:90]!r}")
    return out + club_problems(text)


def extract(pdf: Path) -> str:
    if shutil.which("pdftotext"):
        return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True).stdout
    return "\n".join(page.extract_text() or "" for page in PdfReader(str(pdf)).pages)


def write_manifest(available: bool) -> None:
    data = {"available": available}
    if available:
        data["bytes"] = OUT.stat().st_size
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n")


def main() -> None:
    pdfs = sorted(p for p in SRC.glob("*") if p.suffix.lower() == ".pdf") if SRC.exists() else []
    if not pdfs:
        print("resume:build: no PDF in assets/resume/; skipped (the Resume product stays hidden until one is built).")
        write_manifest(OUT.exists())
        return
    if len(pdfs) > 1:
        sys.exit(f"resume:build: more than one PDF in assets/resume/ ({', '.join(p.name for p in pdfs)}); keep only the one to publish.")
    src = pdfs[0]

    found = problems(extract(src))
    if found and not os.environ.get("RESUME_SRC"):
        # A previously published resume must not outlive a failed check.
        if OUT.exists():
            OUT.unlink()
        write_manifest(False)
    if os.environ.get("RESUME_SRC"):
        # Test mode: report only, never touch the published file or the manifest.
        print("resume:build (test): " + ("FAILED: " + "; ".join(found) if found else "passed"))
        sys.exit(1 if found else 0)
    if found:
        print(f"resume:build: FAILED. {src.name} contains what must not be public:", file=sys.stderr)
        for f in found:
            print(f"  x {f}", file=sys.stderr)
        sys.exit(1)

    reader = PdfReader(str(src))
    writer = PdfWriter()
    writer.append(reader)
    writer.metadata = None  # no document information: author, creator, producer, dates
    if "/Metadata" in writer.root_object:
        del writer.root_object[NameObject("/Metadata")]  # no XMP metadata either
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("wb") as fh:
        writer.write(fh)
    write_manifest(True)
    print(f"resume:build: {src.name} passed the checks ({len(reader.pages)} page(s)); wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB), metadata stripped.")


if __name__ == "__main__":
    main()
