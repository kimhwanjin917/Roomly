const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function writeUint32(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n, 0)
  return buf
}

function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcBuffer = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcBuffer)
  return Buffer.concat([writeUint32(data.length), typeBuffer, data, writeUint32(crc)])
}

// Simple icon: dark blue background (#1e40af) with white "R" drawn pixel-by-pixel
function drawPixel(pixels, x, y, size, r, g, b) {
  const idx = (y * size + x) * 3
  pixels[idx] = r
  pixels[idx + 1] = g
  pixels[idx + 2] = b
}

function createIcon(size) {
  // Pixel data: 3 bytes per pixel (RGB)
  const pixels = Buffer.alloc(size * size * 3)

  // Fill background: #2563EB (blue-600)
  for (let i = 0; i < size * size * 3; i += 3) {
    pixels[i] = 37
    pixels[i + 1] = 99
    pixels[i + 2] = 235
  }

  // Draw rounded rect (slightly lighter blue inner bg) — simulate icon padding
  const pad = Math.floor(size * 0.1)
  for (let y = pad; y < size - pad; y++) {
    for (let x = pad; x < size - pad; x++) {
      drawPixel(pixels, x, y, size, 29, 78, 216) // #1d4ed8
    }
  }

  // Draw white "R" letter using a pixel grid scaled to icon size
  // "R" in a 5x7 pixel template:
  const R_5x7 = [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ]

  const letterScale = Math.floor(size * 0.08)
  const letterW = 5 * letterScale
  const letterH = 7 * letterScale
  const offsetX = Math.floor((size - letterW) / 2)
  const offsetY = Math.floor((size - letterH) / 2)

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (R_5x7[row][col]) {
        for (let dy = 0; dy < letterScale; dy++) {
          for (let dx = 0; dx < letterScale; dx++) {
            const px = offsetX + col * letterScale + dx
            const py = offsetY + row * letterScale + dy
            if (px >= 0 && px < size && py >= 0 && py < size) {
              drawPixel(pixels, px, py, size, 255, 255, 255)
            }
          }
        }
      }
    }
  }

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.concat([
    writeUint32(size),
    writeUint32(size),
    Buffer.from([8, 2, 0, 0, 0]),
  ])
  const ihdr = createChunk('IHDR', ihdrData)

  // Raw image data with filter byte (0 = None) per scanline
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0
    pixels.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3)
  }

  const compressed = zlib.deflateSync(raw)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

const publicDir = path.join(__dirname, '..', 'public')

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createIcon(192))
console.log('Created icon-192.png')

fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createIcon(512))
console.log('Created icon-512.png')

// Apple touch icon (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180))
console.log('Created apple-touch-icon.png')
