const fs = require('node:fs')
const path = require('node:path')
const { Resvg } = require('@resvg/resvg-js')

const REPO = path.join(__dirname, '..', '..')
const jobs = [
  ['tile-foos.svg', `${REPO}/apps/foosball/public/apple-touch-icon.png`, 180],
  ['tile-foos.svg', `${REPO}/apps/foosball/public/pwa-192x192.png`, 192],
  ['tile-foos.svg', `${REPO}/apps/foosball/public/pwa-512x512.png`, 512],
  ['tile-chess.svg', `${REPO}/apps/chess/public/apple-touch-icon.png`, 180],
  ['tile-chess.svg', `${REPO}/apps/chess/public/pwa-192x192.png`, 192],
  ['tile-chess.svg', `${REPO}/apps/chess/public/pwa-512x512.png`, 512],
]

for (const [src, out, size] of jobs) {
  const svg = fs.readFileSync(path.join(__dirname, src))
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  fs.writeFileSync(out, png)
  console.log(`${out} (${size}px, ${png.length} bytes)`)
}
