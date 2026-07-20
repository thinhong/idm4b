# ============================================================
#  IDM4b ggplot theme + compartment palette
#  Mirrors assets/_tokens.scss. Sourced via _common.R.
#  Keep the hex values in sync with assets/_tokens.scss and
#  assets/tokens.css so figures, page chrome, and widgets match.
# ============================================================

# ---- Token colors ----
idm_col <- list(
  ox_blue = "#002147", ox_blue_2 = "#0a3161",
  cobalt  = "#1B4DC7", cobalt_2 = "#143aa6",
  ink     = "#14263b", ink2 = "#42566b", ink3 = "#647587",
  surface = "#f1f6fd", border = "#e3edf9", border_strong = "#cfe0f2",
  s = "#2A5CD6", i = "#E0574E", r = "#16A06B",
  e = "#E0960A", v = "#7E5AD6", aux = "#0E9AAB"
)

# ---- Canonical compartment palette (named, matched by name) ----
# Existing plots use `scale_color_manual(values = my_palette, breaks = ...)`.
# Making my_palette a NAMED vector means each compartment is colored by its
# name (S, E, I, R, Inc, V) regardless of order, which is more robust than the
# old positional brewer.pal() vectors.
my_palette <- c(
  S = idm_col$s, E = idm_col$e, I = idm_col$i, R = idm_col$r,
  Inc = idm_col$v, V = idm_col$aux,
  # lower-case aliases for safety
  s = idm_col$s, e = idm_col$e, i = idm_col$i, r = idm_col$r
)

# ---- Ordered discrete palette (S, I, R, E, V, aux) ----
idm_pal <- function(n = NULL) {
  base <- unname(c(idm_col$s, idm_col$i, idm_col$r, idm_col$e, idm_col$v, idm_col$aux))
  if (is.null(n)) base else base[seq_len(min(n, length(base)))]
}

# Opt-in scales for new plots.
scale_color_idm <- function(...) ggplot2::scale_color_manual(values = my_palette, ...)
scale_colour_idm <- scale_color_idm
scale_fill_idm  <- function(...) ggplot2::scale_fill_manual(values = my_palette, ...)

# Sequential blue ramp for gradients / parameter sweeps.
idm_blues <- function(n) grDevices::colorRampPalette(
  c("#e6f0fb", idm_col$cobalt, idm_col$ox_blue)
)(n)

# ---- theme_idm: drop-in replacement for theme_minimal/classic/bw ----
theme_idm <- function(base_size = 12, base_family = "Inter", ...) {
  ggplot2::theme_minimal(base_size = base_size, base_family = base_family) +
    ggplot2::theme(
      text             = ggplot2::element_text(colour = idm_col$ink, family = base_family),
      plot.title       = ggplot2::element_text(family = "Source Serif 4", face = "bold",
                                               colour = idm_col$ox_blue, size = base_size * 1.35,
                                               margin = ggplot2::margin(b = base_size * 0.5)),
      plot.subtitle    = ggplot2::element_text(colour = idm_col$ink2, size = base_size * 1.05),
      axis.title       = ggplot2::element_text(colour = idm_col$ink2),
      axis.text        = ggplot2::element_text(colour = idm_col$ink3),
      panel.grid.major = ggplot2::element_line(colour = idm_col$border, linewidth = 0.5),
      panel.grid.minor = ggplot2::element_blank(),
      axis.line        = ggplot2::element_line(colour = idm_col$border_strong, linewidth = 0.5),
      axis.ticks       = ggplot2::element_line(colour = idm_col$border_strong, linewidth = 0.4),
      legend.title     = ggplot2::element_text(colour = idm_col$ink2, face = "bold"),
      legend.text      = ggplot2::element_text(colour = idm_col$ink2),
      legend.key       = ggplot2::element_blank(),
      strip.text       = ggplot2::element_text(colour = idm_col$ox_blue, face = "bold"),
      plot.background  = ggplot2::element_rect(fill = "white", colour = NA),
      panel.background = ggplot2::element_rect(fill = "white", colour = NA),
      ...
    )
}
