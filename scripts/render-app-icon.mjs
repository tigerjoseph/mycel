#!/usr/bin/env node
/** Render app icon + .icns from extension/logo.svg (canonical brand mark). */
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourceSvg = join(root, 'extension/logo.svg')
const outPng = join(root, 'src/renderer/src/assets/app-icon.png')
const resourcesPng = join(root, 'resources/icon.png')
const SIZE = 1024

let sharp
try {
  sharp = require('sharp')
} catch {
  execFileSync('npm', ['install', '--no-save', 'sharp'], { cwd: root, stdio: 'inherit' })
  sharp = require('sharp')
}

const svg = readFileSync(sourceSvg)
console.log('Rendering brand mark from', sourceSvg)

await sharp(svg)
  .resize(SIZE, SIZE, { kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outPng)

try {
  copyFileSync(outPng, resourcesPng)
} catch {
  // resources/ optional in dev
}

console.log('Building .icns...')
execFileSync(join(root, 'scripts/generate-icons.sh'), [outPng], { cwd: root, stdio: 'inherit' })
console.log('Done:', outPng, '→ build/icon.icns')
