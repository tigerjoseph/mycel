#!/usr/bin/env node
/** Render Chrome extension PNG icons from the Mycel brand mark. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const sourceSvg = join(root, 'extension/logo.svg')
const outDir = join(root, 'extension/icons')
const sizes = [16, 32, 48, 128]

let sharp
try {
  sharp = require('sharp')
} catch {
  const { execFileSync } = await import('node:child_process')
  execFileSync('npm', ['install', '--no-save', 'sharp'], { cwd: root, stdio: 'inherit' })
  sharp = require('sharp')
}

mkdirSync(outDir, { recursive: true })
const svg = readFileSync(sourceSvg)

console.log('Source:', sourceSvg)
for (const size of sizes) {
  const out = join(outDir, `icon-${size}.png`)
  await sharp(svg)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`  icon-${size}.png`)
}
console.log('Done:', outDir)
