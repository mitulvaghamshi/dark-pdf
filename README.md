# Dark PDF

[![Build and deploy to pages](https://github.com/mitulvaghamshi/dark-pdf/actions/workflows/pages.yml/badge.svg)](https://github.com/mitulvaghamshi/dark-pdf/actions/workflows/pages.yml)

[Convert](https://mitulvaghamshi.github.io/dark-pdf/) PDF to dark mode - free, offline, on-device.

## What is this?

- This tool uses `pdfjs` and canvas to convert a PDF to dark mode.
  - Simply put, by default, it inverts all colors to dark gray.
  - Reading each page into a canvas and inverting pixel-by-pixel.
  - Render that canvas as a JPEG image to HTML for reading and also to the resultin PDF for download.
- This is definitely not an optimal solution by any means, but it's better than my poor eyesight looking at bright white colors.
- The resulting PDF uses significantly more storage than the original one as each page is rendered as a JPEG image.
- Optionally, MacOS `Preview.app` offers an option to read PDFs in dark mode but cannot be saved to dark mode.

## Features

- Load > Convert > Read > Refresh.
- Works Offline - Always On-Device.
- Optionally, save the converted PDF to read later.
- Supports converting multiple PDFs simultaneously.

## Development and Build

This application is built using **React**, **TypeScript**, and **Vite**. It is configured as a **Progressive Web App (PWA)** that runs 100% on-device and works completely offline.

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Build the production application (PWA):**
   ```bash
   npm run build
   ```

### Core Technologies

- **React & TypeScript**: Modern component-driven state architecture.
- **Vite & Rollup**: High-performance bundler.
- **pdfjs-dist**: PDF document loading and canvas page rendering.
- **pdf-lib**: In-memory rebuilding of high-resolution dark-mode PDFs.
- **vite-plugin-pwa**: Automated service worker (`sw.js`) generation using Workbox for offline asset caching.

