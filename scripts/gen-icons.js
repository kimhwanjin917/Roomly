const sharp = require('sharp')
const path = require('path')

// Roomly 아이콘 SVG - 호텔 문 + 열쇠 디자인
function makeSVG(size) {
  const r = Math.round(size * 0.22)  // corner radius
  const pad = size * 0.18            // inner padding
  const inner = size - pad * 2       // inner drawing area

  // 문 (door) 디자인: 호텔방 문 실루엣
  // 전체 배경 #3182F6, 흰색 아이콘
  const doorW = inner * 0.52
  const doorH = inner * 0.78
  const doorX = (size - doorW) / 2
  const doorY = (size - doorH) / 2 + inner * 0.02
  const doorR = inner * 0.07

  // 손잡이
  const knobR = inner * 0.055
  const knobX = doorX + doorW * 0.72
  const knobY = doorY + doorH * 0.54

  // 상단 아치
  const archR = doorW * 0.5
  const archCY = doorY + archR

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#3182F6"/>
  <!-- Door frame (filled white) -->
  <rect x="${doorX - size*0.03}" y="${doorY - size*0.01}" width="${doorW + size*0.06}" height="${doorH + size*0.02}" rx="${doorR * 1.3}" fill="white" opacity="0.18"/>
  <!-- Door panel -->
  <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" rx="${doorR}" fill="white"/>
  <!-- Door inset panel top -->
  <rect x="${doorX + doorW*0.14}" y="${doorY + doorH*0.08}" width="${doorW*0.72}" height="${doorH*0.32}" rx="${doorR*0.6}" fill="#3182F6" opacity="0.15"/>
  <!-- Door inset panel bottom -->
  <rect x="${doorX + doorW*0.14}" y="${doorY + doorH*0.46}" width="${doorW*0.72}" height="${doorH*0.38}" rx="${doorR*0.6}" fill="#3182F6" opacity="0.15"/>
  <!-- Door knob -->
  <circle cx="${knobX}" cy="${knobY}" r="${knobR}" fill="#3182F6" opacity="0.5"/>
</svg>`
}

// 더 심플하고 세련된 버전
function makeCleanSVG(size) {
  const bg_r = Math.round(size * 0.22)
  const s = size

  // 문 비율
  const dw = s * 0.42   // door width
  const dh = s * 0.62   // door height
  const dx = (s - dw) / 2
  const dy = (s - dh) / 2 + s * 0.03
  const dr = s * 0.055  // door corner radius

  // 손잡이
  const kx = dx + dw * 0.73
  const ky = dy + dh * 0.52
  const kr = s * 0.038

  // 상단 별 (호텔 별 느낌)
  const starCX = dx + dw * 0.38
  const starCY = dy + dh * 0.22
  const starR = s * 0.06

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${bg_r}" fill="#3182F6"/>
  <!-- Shadow/depth behind door -->
  <rect x="${dx + s*0.025}" y="${dy + s*0.025}" width="${dw}" height="${dh}" rx="${dr}" fill="#0000001a"/>
  <!-- Door main -->
  <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${dr}" fill="white"/>
  <!-- Inner panel top -->
  <rect x="${dx + dw*0.13}" y="${dy + dh*0.09}" width="${dw*0.74}" height="${dh*0.28}" rx="${dr*0.5}" fill="#EBF3FF"/>
  <!-- Inner panel bottom -->
  <rect x="${dx + dw*0.13}" y="${dy + dh*0.43}" width="${dw*0.74}" height="${dh*0.42}" rx="${dr*0.5}" fill="#EBF3FF"/>
  <!-- Knob -->
  <circle cx="${kx}" cy="${ky}" r="${kr}" fill="#3182F6"/>
  <circle cx="${kx}" cy="${ky}" r="${kr * 0.5}" fill="white"/>
  <!-- Floor line -->
  <rect x="${dx - s*0.06}" y="${dy + dh}" width="${dw + s*0.12}" height="${s * 0.025}" rx="${s*0.012}" fill="white" opacity="0.4"/>
</svg>`
}

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public')

  const sizes = [
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-192.png', size: 192 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'favicon-32.png', size: 32 },
  ]

  for (const { file, size } of sizes) {
    const svg = makeCleanSVG(size)
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(publicDir, file))
    console.log(`생성: ${file} (${size}x${size})`)
  }

  // favicon.ico용 32x32
  console.log('\n완료!')
}

generate().catch(console.error)
