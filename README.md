# ❤️ Dark PDF

Convert (Invert) PDF to dark mode within the browser.

## What is this?

- This uses pdfjs and canvas to convert a PDF to dark mode and save it as a PDF by embedding JPEG images.
- Simply put, by default, it inverts all colors to dark gray.
- This is definitely not an optimal solution, but it's better than my poor eyesight looking at bright white colors.
- The resulting PDF uses significantly more storage than the original because each is converted and saved as a JPEG image.
- Optionally, MacOS Preview.app offers an option to read PDFs in dark mode without saving them.

## Features

- Works offline.
- Optionally save the converted PDF.
- Supports converting multiple PDFs simultaneously.
- Convert > Read > Refresh.

## Conversion Options

- **Scale Factor (1-5)**: Specify the image clearity (Default: 1).
- **Start Page**: Specify the starting page for the conversion (Default: 1).
- **End Page**: Specify the ending page for the conversion (Default: All).
