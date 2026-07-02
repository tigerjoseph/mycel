#!/usr/bin/env node
/**
 * App icon pipeline: canvas-rendered sphere (smooth AA) + vector network → icns
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outPng = join(root, 'src/renderer/src/assets/app-icon.png')
const resourcesPng = join(root, 'resources/icon.png')
const SIZE = 2048
const CX = SIZE / 2
const CY = SIZE / 2
const R = (400 / 1024) * SIZE

let createCanvas
try {
  createCanvas = require('@napi-rs/canvas').createCanvas
} catch {
  console.log('Installing @napi-rs/canvas...')
  execFileSync('npm', ['install', '--no-save', '@napi-rs/canvas'], { cwd: root, stdio: 'inherit' })
  createCanvas = require('@napi-rs/canvas').createCanvas
}

let sharp
try {
  sharp = require('sharp')
} catch {
  execFileSync('npm', ['install', '--no-save', 'sharp'], { cwd: root, stdio: 'inherit' })
  sharp = require('sharp')
}

function s(v) {
  return (v / 1024) * SIZE
}

function drawSphere(ctx) {
  // Base volume
  const base = ctx.createRadialGradient(s(368), s(306), 0, s(368), s(318), R)
  base.addColorStop(0, '#FFFFFF')
  base.addColorStop(0.16, '#FAFAF8')
  base.addColorStop(0.34, '#ECE9E4')
  base.addColorStop(0.52, '#D4CFC8')
  base.addColorStop(0.7, '#B0AAA2')
  base.addColorStop(0.86, '#8F8880')
  base.addColorStop(1, '#6B6560')

  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.fillStyle = base
  ctx.fill()

  // Rim occlusion
  const rim = ctx.createRadialGradient(CX, CY, R * 0.62, CX, CY, R)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.2)')

  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = rim
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2)
  ctx.restore()

  // Specular wash
  const spec = ctx.createRadialGradient(s(348), s(266), 0, s(348), s(266), R * 0.55)
  spec.addColorStop(0, 'rgba(255,255,255,0.92)')
  spec.addColorStop(0.45, 'rgba(255,255,255,0.18)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = spec
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2)
  ctx.restore()
}

function drawNetwork(ctx) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.clip()

  const ink = '#141414'
  const primary = s(13)
  const secondary = s(8.5)

  const trunk = [
    [[268, 438], [404, 438], [512, 522], [656, 412], [776, 452]],
    [[308, 598], [436, 536], [512, 628], [644, 558], [756, 608]],
    [[360, 364], [436, 438], [512, 384], [588, 456]],
    [[384, 692], [512, 628], [600, 704]]
  ]

  const branch = [
    [[404, 438], [404, 536], [436, 536]],
    [[512, 522], [512, 628], [644, 558]],
    [[436, 438], [436, 364], [512, 384]],
    [[656, 412], [656, 558], [644, 558]],
    [[308, 598], [308, 504], [404, 438]],
    [[776, 452], [756, 608]],
    [[512, 384], [588, 456], [656, 412]],
    [[384, 692], [308, 598]]
  ]

  const nodes = [
    [268, 438, 17], [404, 438, 21], [512, 522, 24], [656, 412, 19], [776, 452, 15],
    [308, 598, 17], [436, 536, 15], [512, 628, 19], [644, 558, 17], [756, 608, 15],
    [360, 364, 13], [512, 384, 15], [588, 456, 11], [384, 692, 13], [600, 704, 11]
  ]

  const strokePath = (pts, width, alpha = 1) => {
    ctx.beginPath()
    ctx.moveTo(s(pts[0][0]), s(pts[0][1]))
    for (let i = 1; i < pts.length; i++) ctx.lineTo(s(pts[i][0]), s(pts[i][1]))
    ctx.strokeStyle = ink
    ctx.globalAlpha = alpha
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  for (const p of trunk) strokePath(p, primary)
  for (const p of branch) strokePath(p, secondary, 0.88)

  ctx.globalAlpha = 1
  for (const [x, y, r] of nodes) {
    ctx.beginPath()
    ctx.arc(s(x), s(y), s(r), 0, Math.PI * 2)
    ctx.fillStyle = ink
    ctx.fill()
  }

  ctx.restore()
}

console.log('Rendering sphere + network at 2048px (canvas)...')
const canvas = createCanvas(SIZE, SIZE)
const ctx = canvas.getContext('2d')
ctx.clearRect(0, 0, SIZE, SIZE)
drawSphere(ctx)
drawNetwork(ctx)

const hiRes = join(root, 'build/.icon-render/icon-2048.png')
mkdirSync(dirname(hiRes), { recursive: true })
const buf = canvas.toBuffer('image/png')
await sharp(buf)
  .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outPng)

copyFileSync(outPng, resourcesPng)

console.log('Building .icns...')
execFileSync(join(root, 'scripts/generate-icons.sh'), [outPng], { cwd: root, stdio: 'inherit' })

rmSync(join(root, 'build/.icon-render'), { recursive: true, force: true })
console.log('Done:', outPng)
