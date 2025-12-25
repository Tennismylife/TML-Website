# TML-Website
Tennismylife Website

## Font pipeline (self-hosted)

This repo includes a small Node-based pipeline to fetch Google Fonts, generate a glyph list from your app content, subset the fonts to only used glyphs, and produce WOFF2 files for deployment. Scripts live under `scripts/`.

Useful commands:

- `npm run fetch-fonts` — download TTFs into `public/fonts/`
- `npm run gather-font-glyphs` — scan the `app/`, `components/`, and `public/` folders for used characters and write `scripts/glyphs.txt`
- `npm run subset-fonts` — subset `public/fonts/*.ttf` using the glyph list and write `*-subset.ttf`
- `npm run build-fonts` — convert `*-subset.ttf` files into `*-subset.woff2`
- `npm run prepare-fonts` — convenience script that runs the whole pipeline in sequence (fetch → gather → subset → build)

Notes:
- The pipeline writes subset files into `public/fonts/` with a `-subset.woff2` suffix. Update `app/globals.css` and `app/layout.tsx` to use the subsetted files (already done in this change).
- You can tune `scripts/gather-glyphs.js` to scan additional directories or extend the characters gathered for specific locales.
