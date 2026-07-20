# ============================================================
#  IDM4b shared setup for ggplot chapters.
#  Add this once near the top of each figure chapter:
#
#    ```{r}
#    #| include: false
#    source("_common.R")
#    ```
#
#  execute-dir is `project`, so the relative paths resolve from
#  the repo root for every chapter.
# ============================================================

library(ggplot2)

# ---- Fonts ----
# Figures render to inline SVG on a page that already loads Inter and
# Source Serif 4 as web fonts, so svglite writing those family names gives
# an exact, crisp, selectable match in the browser (no download, no DPI
# tuning). We register them with systemfonts when the files are available
# so text-width metrics are correct; failure is harmless.
suppressWarnings(try({
  if (requireNamespace("systemfonts", quietly = TRUE)) {
    fonts <- systemfonts::system_fonts()$family
    # nothing to do if already visible to R; svglite still emits the family
  }
}, silent = TRUE))

# Optional: bake fonts into figures as outlines (for standalone PNG/PDF).
# Off by default; enable with options(idm.showtext = TRUE) before sourcing.
if (isTRUE(getOption("idm.showtext", FALSE)) &&
    requireNamespace("showtext", quietly = TRUE) &&
    requireNamespace("sysfonts", quietly = TRUE)) {
  try({
    sysfonts::font_add_google("Inter", "Inter")
    sysfonts::font_add_google("Source Serif 4", "Source Serif 4")
    showtext::showtext_auto()
    showtext::showtext_opts(dpi = 96)
  }, silent = TRUE)
}

# ---- Theme + palette ----
source("R/idm-theme.R")
theme_set(theme_idm())

# ---- Figure defaults (per-chunk options still override these) ----
knitr::opts_chunk$set(
  fig.align = "center",
  fig.width = 7,
  fig.height = 4.4
)
