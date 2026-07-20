# IDM4b design system: reference and guardrails

This is the single place that records how the design system is wired and,
importantly, the problems we hit once and the permanent, global fixes that
stop them recurring. New pages and widgets inherit these automatically as
long as they follow the conventions below.

---

## 1. Single source of truth

| Layer | File | Holds |
|---|---|---|
| Page chrome (HTML) | `assets/theme.scss` | Design tokens (inline at top) + all component styling. The one file Quarto compiles. |
| Runtime tokens (widgets) | `assets/tokens.css` | `:root` custom properties the OJS/D3 widgets read. Mirror of the SCSS tokens. |
| Widget JS tokens | `assets/js/_tokens.js` | Color palette, `TYPE` scale, `fs()` helper, motion. Imported/mirrored by widget code. |
| Static figures (R) | `R/idm-theme.R` (via `_common.R`) | `theme_idm()`, compartment `my_palette`, `idm_pal()`, `idm_blues()`. |

Rule: never hardcode a color, font, or size. Use the token in the layer you are in.
If you change a color, change it in all four (they are small, stable lists).

## 2. Color tokens (semantic + compartment)

Anchor Oxford blue `#002147`; interaction cobalt `#1B4DC7`. Each role has a
vivid "line" value (strokes/fills) and an AA-safe "ink" value (text on white):

| Role | line | ink |
|---|---|---|
| Susceptible / blue | `#2A5CD6` | `#1B4DC7` |
| Infectious / red | `#E0574E` | `#C1343F` |
| Recovered / green | `#16A06B` | `#0E7A54` |
| Exposed / amber | `#E0960A` | `#9A5B00` |
| Vaccinated / violet | `#7E5AD6` | `#6742BE` |
| Auxiliary / teal | `#0E9AAB` | `#0A6E7D` |

The same role uses the same color everywhere: the static ggplot line, the
interactive widget, the formula label, and the value readout. In the R_t
widget, for example, I_t is red, the denominator amber, w_s violet, and R_t
teal, and each value matches its bar or line.

## 3. Widget type scale (`TYPE` in `_tokens.js`)

axis 12, caption 13, label 14, body 15, title 16, value 20, display 26.
Floor is 12px so text stays legible on phones. Use `fs(px)` for HTML text
(returns a CSS `clamp()` that never drops below the floor).

Responsive rule for SVG widgets: draw at the container's real pixel width
(a `ResizeObserver` that rebuilds axes) so 1 viewBox unit equals 1 CSS pixel
and text renders at its true size at any width. Do NOT set a fixed desktop
viewBox and let it scale down, or phone text becomes tiny. Both
`_montecarlo-pi.js` and `_entropy-anim.js` (coinSurprise) now do this via a
`ResizeObserver` that calls a `layout(width)` function; guard the observer
with a "skip if width unchanged" check so the height change it triggers does
not loop.

When you raise font sizes, raise the chart margins to match, or axis titles
collide with tick labels.

## 4. Conventions for new pages and widgets

- A figure chapter starts with a hidden setup chunk: a `{r}` chunk with
  `#| include: false` and `source("_common.R")`.
- ggplot: rely on the default `theme_idm()`; use `scale_color_idm()` for
  compartments; `idm_blues(n)` for sequential ramps.
- Widgets: import the slider helpers; pass a color name (`"amber"`, ...) and
  it resolves to the token automatically. Read other colors from
  `assets/js/_tokens.js`.
- Download shortcodes in a sub-folder page point up one level:
  `{{< downloadthis ../data/file.csv ... >}}` (paths are relative to the file).
- Always put a space after a declaration colon in SCSS (`prop: value`), and
  keep design tokens inline in `theme.scss` (do not `@import` them). See gotchas.
- Mobile and gestures: SVG widgets should redraw at their real container
  width (a `ResizeObserver`) so text and hit targets stay full size; use
  pointer events or `d3.drag`, never mouse-only handlers, so drag works on
  touch; guard any auto-playing animation with `reduceMotion()` from
  `_tokens.js`. Figures and images are capped at `max-width: 100%` globally.
- Performance: draw large point clouds on a `<canvas>`, coalesce slider and
  resize work with `requestAnimationFrame`, keep figures as SVG, and rely on
  Quarto `freeze: auto` so unchanged chunks are not re-executed.

## 5. Gotchas and their permanent fixes

1. Build error `Error adding css vars block / Expecting punctuation "}"`.
   Cause: Quarto parses the theme with `scss-parser`, which requires a space
   after every declaration colon. Fix: `prop: value`, never `prop:value`.

2. Warning `variable used before declaration`.
   Cause: Quarto's analyzer cannot follow `@import`, so it never sees token
   declarations in a partial. Fix: tokens are declared inline at the top of
   `theme.scss` (partial `_tokens.scss` is deprecated).

3. A copy button floats over OJS widgets.
   Cause: `echo: false` still emits a hidden source block, and `code-copy`
   leaves its copy button visible. Fix (global, already in `theme.scss`):
   `.sourceCode.hidden + .code-copy-button { display: none; }`. Covers every
   widget on every page.

4. Widget text too small on phones. Fix: the `TYPE` scale + draw-at-real-width
   rule in section 3.

5. Chart axis titles overlap tick labels. Cause: fonts enlarged without
   enlarging margins. Fix: size chart margins around the `TYPE` values.

6. R error `embedded nul in string`. Cause: a file had trailing NUL-byte
   padding (pre-existing corruption). Fix / check any file:
   `python3 -c "import sys;d=open(sys.argv[1],'rb').read();print(d.count(b'\x00'))" FILE`
   and strip with `...open(p,'wb').write(open(p,'rb').read().rstrip(b'\x00'))`.
   All source files were scanned and are clean.

7. Download button `Cannot open file data/...`. Fix: use `../data/...` in
   sub-folder pages (section 4).

## 6. Verify before you ship

- SCSS parses for Quarto and dart-sass:
  `npm i scss-parser` then `node -e 'require("scss-parser").parse(require("fs").readFileSync("assets/theme.scss","utf8"))'`
  and `npx sass assets/theme.scss /tmp/out.css`.
- Widget JS: `node --check assets/js/FILE.js` (rename to `.mjs` for ES modules).
- No NUL bytes: the one-liner in gotcha 6.
- Then `quarto preview` and spot-check a widget page on a narrow window.
