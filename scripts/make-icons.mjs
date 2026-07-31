// Generates PWA icons (black rounded square, blocky lowercase "bt") with zero deps.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 5x7 bitmap glyphs
const GLYPHS = {
  b: ['X....', 'X....', 'XXXX.', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  t: ['.X...', '.X...', 'XXXX.', '.X...', '.X...', '.X...', '..XX.'],
}

const INK = [17, 17, 17, 255] // #111111
const PAPER = [245, 245, 243, 255] // #F5F5F3

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function drawIcon(size, { rounded = true } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const radius = rounded ? size * 0.2 : 0
  const inRounded = (x, y) => {
    const r = radius
    const cx = x < r ? r : x > size - r ? size - r : x
    const cy = y < r ? r : y > size - r ? size - r : y
    if (cx === x || cy === y) return true
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  }
  // glyph layout: "bt" = 5+1+5 = 11 cells wide, 7 tall
  const cell = Math.floor(size / 18)
  const gw = 11 * cell
  const gh = 7 * cell
  const gx = Math.floor((size - gw) / 2)
  const gy = Math.floor((size - gh) / 2)
  const glyphAt = (x, y) => {
    if (x < gx || y < gy || x >= gx + gw || y >= gy + gh) return false
    const col = Math.floor((x - gx) / cell)
    const row = Math.floor((y - gy) / cell)
    const [g, c] = col < 5 ? [GLYPHS.b, col] : col > 5 ? [GLYPHS.t, col - 6] : [null, 0]
    return g ? g[row][c] === 'X' : false
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let rgba = [0, 0, 0, 0]
      if (inRounded(x, y)) rgba = glyphAt(x, y) ? PAPER : INK
      px[i] = rgba[0]; px[i + 1] = rgba[1]; px[i + 2] = rgba[2]; px[i + 3] = rgba[3]
    }
  }
  return png(size, size, px)
}

mkdirSync(join(root, 'public/icons'), { recursive: true })
writeFileSync(join(root, 'public/icons/icon-512.png'), drawIcon(512))
writeFileSync(join(root, 'public/icons/icon-192.png'), drawIcon(192))
writeFileSync(join(root, 'public/icons/apple-touch-icon.png'), drawIcon(180, { rounded: false }))
console.log('icons written')
