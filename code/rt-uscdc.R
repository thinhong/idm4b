library(ggplot2)

ggplot() +
  geom_rect(aes(
    xmin = 0,
    xmax = 10,
    ymin = 0,
    ymax = 1
  ), fill = "#169873") +
  geom_rect(aes(
    xmin = 10,
    xmax = 25,
    ymin = 0,
    ymax = 1
  ), fill = "#EEFC57") +
  geom_rect(aes(
    xmin = 25,
    xmax = 75,
    ymin = 0,
    ymax = 1
  ), fill = "#FCD757") +
  geom_rect(aes(
    xmin = 75,
    xmax = 90,
    ymin = 0,
    ymax = 1
  ), fill = "#F2545B") +
  geom_rect(aes(
    xmin = 90,
    xmax = 100,
    ymin = 0,
    ymax = 1
  ), fill = "#5328FF") +
  annotate("text",
           x = 5,
           y = 0.5,
           label = "Declining",
           size = 5.5,
           fontface = 2,
           family = "PT Sans Narrow") +
  annotate("text",
           x = 17.5,
           y = 0.5,
           label = "Likely declining",
           size = 5.5,
           fontface = 2,
           family = "PT Sans Narrow") +
  annotate("text",
           x = 50,
           y = 0.5,
           label = "Uncertain trend or stable",
           size = 5.5,
           fontface = 2,
           family = "PT Sans Narrow") +
  annotate("text",
           x = 82.5,
           y = 0.5,
           label = "Likely growing",
           color = "white",
           size = 5.5,
           fontface = 2,
           family = "PT Sans Narrow") +
  annotate("text",
           x = 95,
           y = 0.5,
           label = "Growing",
           color = "white",
           size = 5.5,
           fontface = 2,
           family = "PT Sans Narrow") +
  scale_x_continuous(
    breaks = c(0, 10, 25, 75, 90, 100),
    expand = c(0, 0),
    position = "top"
  ) +
  scale_y_continuous(limits = c(-0.5, 1), expand = c(0, 0)) +
  labs(x = expression(paste(
    "% credible interval distribution of ", R[t], " > 1", sep = ""
  )), y = NULL) +
  theme_classic() +
  theme(
    axis.text.y = element_blank(),
    axis.line.y = element_blank(),
    axis.ticks.y = element_blank(),
    plot.margin = margin(5, 20, 5, 20),
    axis.title.x = element_text(size = 17, family = "PT Sans Narrow", hjust = 0),
    axis.text = element_text(size = 17, family = "PT Sans Narrow")
  )

gsave("img/rnum/rt-uscdc.svg", width = 9, height = 1.3)
