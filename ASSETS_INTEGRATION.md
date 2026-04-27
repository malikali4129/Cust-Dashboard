# Assets & Header Integration Guide

This document explains how to add your logo to the header, the favicon, PWA icons (manifest), and social/share thumbnails so the app shows your logo consistently.

## Files you'll add (recommended paths)
- `assets/logo.svg` (source SVG logo — preferred)
- `assets/logo.png` (high-res PNG fallback)
- `icons/icon-32.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/favicon.ico` (optional)
- `icons/apple-touch-icon.png`
- `icons/mask-icon.svg` (for Safari pinned tabs)
- `social/og-image.png` (1200×630) — Open Graph (Facebook, LinkedIn)
- `social/twitter-image.png` (1200×600) — Twitter Card

## 1) Header: show logo instead of text
Edit `index.html` and replace the `h2` text inside `.brand-lockup` with an `img`:

```html
<div class="brand-lockup">
  <img src="/assets/logo.svg" alt="University Dashboard" class="brand-logo">
</div>
```

Add CSS in `style.css` to size and align the logo:

```css
.brand-lockup .brand-logo {
  height: 28px; /* adjust to taste */
  display: block;
}

@media (max-width: 480px) {
  .brand-lockup .brand-logo { height: 22px; }
}
```

If you prefer an inline SVG, place the SVG markup directly where the `img` would be — that keeps crisp scaling and color control.

## 2) Favicon & icons in the page `<head>`
Replace or add these tags inside the `<head>` of `index.html`:

```html
<link rel="icon" href="/icons/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="mask-icon" href="/icons/mask-icon.svg" color="#6366f1">
<meta name="theme-color" content="#0b0f19">
<link rel="manifest" href="/manifest.webmanifest">

<!-- Social / share previews -->
<meta property="og:title" content="University Dashboard">
<meta property="og:description" content="Live class updates — announcements, assignments, deadlines, quizzes, and feedback in one place.">
<meta property="og:image" content="/social/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/social/twitter-image.png">
```

## 3) `manifest.webmanifest` (update icons)
Open `manifest.webmanifest` and make sure it contains icons sized for 192 and 512 (and optional smaller sizes). Example:

```json
{
  "name": "University Dashboard",
  "short_name": "UniDash",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b0f19",
  "theme_color": "#0b0f19",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

After changing the manifest, update your service worker or server so `manifest.webmanifest` is served with `application/manifest+json` or `application/json`.

## 4) Generate the icons from your source logo
Recommended: start from `assets/logo.svg` (vector). Use either ImageMagick or `sharp` (Node) to generate PNG sizes:

ImageMagick (Windows / macOS):

```bash
magick convert assets/logo.svg -resize 32x32 icons/icon-32.png
magick convert assets/logo.svg -resize 192x192 icons/icon-192.png
magick convert assets/logo.svg -resize 512x512 icons/icon-512.png
magick convert assets/logo.svg -resize 1200x630 social/og-image.png
magick convert assets/logo.svg -resize 1200x600 social/twitter-image.png
```

Using `sharp` (npm):

```bash
npx sharp assets/logo.svg -resize 32 32 icons/icon-32.png
npx sharp assets/logo.svg -resize 192 192 icons/icon-192.png
npx sharp assets/logo.svg -resize 512 512 icons/icon-512.png
npx sharp assets/logo.svg -resize 1200 630 social/og-image.png
```

To create `favicon.ico` you can use a small generator or ImageMagick multi-size ICO:

```bash
magick convert icons/icon-32.png icons/icon-16.png icons/favicon.ico
```

## 5) PWA App icon visible on install
- Ensure `manifest.webmanifest` has the 192/512 icons.
- `apple-touch-icon` (PNG, 180×180 recommended) is used by iOS for home screen icons.
- `mask-icon.svg` is used for Safari pinned tabs. Provide a single-color SVG and set `color` on the `link` tag.

## 6) Social / share thumbnails
- Use `social/og-image.png` sized 1200×630 for Open Graph.
- Use `social/twitter-image.png` sized 1200×600 for Twitter Cards (or reuse OG image).
- Add meta tags (see step 2). Verify with:
  - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
  - Twitter Card Validator: https://cards-dev.twitter.com/validator

## 7) Update header alignment (small notes)
- We already added `.header-inner` and centered `.main-content`. When you place the `img.brand-logo`, ensure vertical centering:

```css
.header-inner { display:flex; align-items:center; justify-content:space-between; }
.brand-lockup { display:flex; align-items:center; gap:0.5rem; }
```

- If your logo height is taller than the header, scale it down with `height` on `.brand-logo`.

## 8) Service worker / caching
If you use `sw.js`, add the new icon and social asset paths to the precache list so they are available offline.

Example (pseudocode in `sw.js`):

```js
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/social/og-image.png'
];
```

## 9) Test checklist
- Put the generated files under the recommended paths.
- Load the site in a browser and inspect head elements (open DevTools → Application → Manifest) to confirm icons are present.
- Run Lighthouse PWA audit (Chrome DevTools → Lighthouse) to validate PWA icon installation.
- Use social validators to confirm `og:image` and Twitter cards.
- On mobile, `Add to Home Screen` should use the manifest icons.

## 10) Files to edit summary
- `index.html` (head meta tags + header markup)
- `style.css` (logo sizing + header alignment)
- `manifest.webmanifest` (icons)
- `sw.js` (optional: cache icons)
- Add generated files under `assets/`, `icons/`, and `social/` paths

## Quick example replacements
- Replace brand text with logo (in `index.html`):

```html
<div class="brand-lockup">
  <img src="/assets/logo.svg" alt="University Dashboard" class="brand-logo">
</div>
```

- Add head snippet (in `index.html` `<head>`):

```html
<link rel="icon" href="/icons/favicon.ico">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:image" content="/social/og-image.png">
<meta name="twitter:card" content="summary_large_image">
```

---

If you want, I can:
- generate the PNG icons from your SVG (if you upload the `logo.svg`),
- patch `index.html` and `style.css` to include the exact tags and classes,
- update `manifest.webmanifest` with the generated icon entries.

Which of those would you like me to do next?