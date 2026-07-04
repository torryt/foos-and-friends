# Brand icons

Source SVGs for the app icons. Both marks share the same geometry family
(round head, tapered body, wide base), each in its app's brand gradient:

- `tile-foos.svg` — foos figure mid-kick, orange→red (`#f97316` → `#dc2626`)
- `tile-chess.svg` — pawn, plum→rose (`#832161` → `#da4167`)

The favicons (`apps/*/public/favicon.svg`) are the same marks as gradient
glyphs on transparent backgrounds — edit those directly.

## Regenerating the PNGs

`render.cjs` rasterizes the tiles into each app's `public/` directory
(`apple-touch-icon.png` 180px, `pwa-192x192.png`, `pwa-512x512.png`).
It needs `@resvg/resvg-js`, which is intentionally not a workspace
dependency — run it from a throwaway directory:

```sh
mkdir -p /tmp/icon-render && cd /tmp/icon-render
pnpm init && pnpm add @resvg/resvg-js
node <repo>/brand/icons/render.cjs
```

The mark is sized at 70% of the tile so the 512px PNG stays inside the
maskable safe zone (the manifest reuses it with `purpose: 'any maskable'`).
