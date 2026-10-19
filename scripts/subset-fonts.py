"""Subset the variable fonts to Latin, then instance them to the axis ranges we use, as WOFF2.

Usage (needs fonttools and brotli: pip install "fonttools>=4.50,<5" brotli):
    python scripts/subset-fonts.py <dir with google/fonts source TTFs> src/fonts

Sources (SIL OFL 1.1) from https://github.com/google/fonts/tree/main/ofl:
    instrumentsans/InstrumentSans[wdth,wght].ttf
    newsreader/Newsreader-Italic[opsz,wght].ttf
    jetbrainsmono/JetBrainsMono[wght].ttf
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

# Google Fonts "latin" range + arrows (U+2190-2193).
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
         "U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD")

def build(src, out, axes):
    font = TTFont(src, lazy=False)
    opts = subset.Options()
    opts.layout_features = ["*"]      # keep kern, liga, tnum, case, ss0x...
    opts.name_IDs = ["*"]             # keep copyright / licence name records
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(LATIN))
    sub.subset(font)
    limits = {t: (tuple(v) if isinstance(v, (list, tuple)) else v) for t, v in axes.items()}
    font = instancer.instantiateVariableFont(font, limits)
    font.flavor = "woff2"
    font.save(out)

src_dir, out_dir = sys.argv[1], sys.argv[2]
build(f"{src_dir}/InstrumentSans[wdth,wght].ttf", f"{out_dir}/InstrumentSans-Latin-wght400-600.woff2",
      {"wdth": 100, "wght": (400, 600)})
build(f"{src_dir}/Newsreader-Italic[opsz,wght].ttf", f"{out_dir}/Newsreader-Italic-Latin-wght400-opsz24-72.woff2",
      {"wght": 400, "opsz": (24, 72)})
build(f"{src_dir}/JetBrainsMono[wght].ttf", f"{out_dir}/JetBrainsMono-Latin-wght400-500.woff2",
      {"wght": (400, 500)})
