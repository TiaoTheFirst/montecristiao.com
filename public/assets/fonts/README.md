# Local web typefaces

These files are bundled for the local manor prototype. No third-party font request is made by visitors.

## Chinese: Manor Song (web subset of Noto Serif CJK SC Regular)

- Upstream: https://github.com/notofonts/noto-cjk
- Source file: `Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf`
- License: SIL Open Font License 1.1, see `OFL-NotoSerif.txt`; original copyright metadata is retained inside the font.
- Source SHA-256: `2a2eae2628df83556c54018c41e20fa532c1b862c5256ae8b3f23feb918d12ca`
- The modified subset is renamed **Manor Song**, with the family declared in `public/typography.css`.
- Built using `scripts/build-fonts.py`, fonttools 4.61.1, from public HTML and JavaScript characters only. No account contents or private notes are read. Current font size is approximately 430 KiB.
- Text outside this subset uses system serif fallbacks. Rebuild after new public copy; arbitrary visitor names are not guaranteed to have bundled glyphs.
- Maintenance: download the source to `.build/font-sources/`, make fonttools with WOFF support available in an isolated Python environment, then run the script from the prototype. Conversion is a maintenance step, not required during ordinary website builds.

## Latin display: Cormorant Garamond Regular

- Upstream and copyright: https://github.com/CatharsisFonts/Cormorant
- Unmodified upstream file: `fonts/webfonts/CormorantGaramond-Regular.woff2`
- License: SIL Open Font License 1.1, see `OFL-Cormorant.txt`.

## Chinese handwriting: Manor Hand (subset of LXGW WenKai Regular)

- Upstream: https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522
- Source: `LXGWWenKai-Regular.ttf`, release v1.522.
- Source SHA-256: `39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009`.
- License: SIL OFL 1.1; bundled in `OFL-WenKai.txt`. Copyright and license metadata are retained; modified family names are **Manor Hand**.
- Build: cache the source as `.build/font-sources/LXGWWenKai-Regular-v1.522.ttf`, then run `scripts/build-hand-font.py` with FontTools and WOFF support. Only public HTML, JavaScript and JSON characters are read. Rebuild after approving new public diary text; private manuscripts are never a font input.
- Used for diary handwriting, short dialogue and magic responses. Diary readers can switch to the book face. Missing glyphs use system fallbacks.

All licenses travel with these font files. The original project names describe their sources, not endorsement of this website.
