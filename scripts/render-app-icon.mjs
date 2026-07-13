#!/usr/bin/env node
/** Brand mark: white sphere, subtle edge shading → app icon + icns */
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
// ~72% of canvas — circular marks need more inset than square app icons
const R = SIZE * 0.36

let createCanvas
try {
  createCanvas = require('@napi-rs/canvas').createCanvas
} catch {
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

function drawSphere(ctx) {
  const base = ctx.createRadialGradient(CX * 0.92, CY * 0.88, 0, CX, CY, R)
  base.addColorStop(0, '#FFFFFF')
  base.addColorStop(0.55, '#FFFFFF')
  base.addColorStop(0.82, '#FAFAF8')
  base.addColorStop(0.94, '#F0EFEC')
  base.addColorStop(1, '#E6E4E0')

  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.fillStyle = base
  ctx.fill()

  const rim = ctx.createRadialGradient(CX, CY, R * 0.84, CX, CY, R)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.05)')

  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.restore()
}

console.log('Rendering brand white sphere at 2048px...')
const canvas = createCanvas(SIZE, SIZE)
const ctx = canvas.getContext('2d')
ctx.clearRect(0, 0, SIZE, SIZE)
drawSphere(ctx)

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
