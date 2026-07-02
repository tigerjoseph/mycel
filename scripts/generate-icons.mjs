#!/usr/bin/env node
/** Build macOS .icns from a 1024px master PNG using sharp (lanczos3). */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const source = process.argv[2] || join(root, 'src/renderer/src/assets/app-icon.png')
const iconsetDir = join(root, 'build/icon.iconset')
const output = join(root, 'build/icon.icns')

const sizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

let sharp
try {
  sharp = require('sharp')
} catch {
  execFileSync('npm', ['install', '--no-save', 'sharp'], { cwd: root, stdio: 'inherit' })
  sharp = require('sharp')
}

rmSync(iconsetDir, { recursive: true, force: true })
mkdirSync(iconsetDir, { recursive: true })

console.log('Source:', source)
for (const [name, size] of sizes) {
  const out = join(iconsetDir, name)
  await sharp(source)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`  ${name} (${size}px)`)
}

console.log('Converting to .icns...')
execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', output], { stdio: 'inherit' })
rmSync(iconsetDir, { recursive: true, force: true })
console.log('Done:', output)
