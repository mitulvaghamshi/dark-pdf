# ❤️ Dark PDF

Convert (Invert) PDF to dark mode within the browser.

## What is this

- This uses pdfjs and canvas to convert pdf to dark mode and save it as a as pdf by embeding jpeg images.
- Simply put, by default this inverts all colors (except white) to dark.

## Why is this

- This is definately not an optimal solution, but better then my bleeding eye looking at the bright-white color.
- Also resulting PDF uses far more storage then original as each is conveted and saved as a jpeg image.
- Optinally: MacOS Preview.app offers an option to read PDFs in dark mode without saving it.

## Features

- No hidden api call, works offline.
- Optionally save converted PDF (not recommanded due to file size).
- Supports converting multiple PDF simultaneously, Limit == RAM.
- Convert > Read > Refresh.

## Convertion Options

All options are optional and has default values.

- **Scale Factor (1-5): 1**: 5 Can give you clear image, (Clearity == File Size).
- **Start Page: 1**: Specify where to start conversion.
- **End Page: auto**: Specify where to stop conversion.
- **Color Limit (0-255): 0**:
  - This can be useful to exclude images or any colorful content from being inverted.
  - Manually control what range of colors to exclud from both side of the color range.
  - e.g.: `Color Limit (0-255): 5` will subtract `5` from each side of the color range such that (0-255) will become (5-250), so any color between (5-250) remain untouched.
