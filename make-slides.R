library(quarto)

# Render slides
quarto_render(input = "slides/", output_format = "revealjs")

# Delete *_files folders in the slides folder
unlink("slides/*_files/", recursive = T)
