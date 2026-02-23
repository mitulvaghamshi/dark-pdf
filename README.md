# ❤️ Dark PDF

[![Build and deploy to pages](https://github.com/mitulvaghamshi/dark-pdf/actions/workflows/pages.yml/badge.svg)](https://github.com/mitulvaghamshi/dark-pdf/actions/workflows/pages.yml)

Convert (Invert) PDF to dark mode within the browser.

## What is this?

- This uses `pdfjs` and canvas to convert a PDF to dark mode.
  - Simply put, by default, it inverts all colors to dark gray.
  - Reading each page into a canvas and inverting pixel-by-pixel.
  - Render that canvas as a JPEG image to HTML for reading and also to the
    resultin PDF for download.
- This is definitely not an optimal solution by any means, but it's better than
  my poor eyesight looking at bright white colors.
- The resulting PDF uses significantly more storage than the original one as
  each page is rendered as a JPEG image.
- Optionally, MacOS `Preview.app` offers an option to read PDFs in dark mode but
  cannot be saved to dark mode.

## Features

- Load > Convert > Read > Refresh.
- Works Offline - Always On-Device.
- Optionally, save the converted PDF to read later.
- Supports converting multiple PDFs simultaneously.

## Conversion Options

- **Scale Factor (1-5)**: Specify the image clearity (Default: 1). 2 is
  recommanded for good quality.
- **Start Page**: Specify the starting page for the conversion (Default: 1).
- **End Page**: Specify the ending page for the conversion (Default: All).

## Dependencies

Dark PDF uses local copies of these libs:

- https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.11.0/pdf-lib.min.js
- https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js
- https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js
