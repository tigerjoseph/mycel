import { execFile } from 'child_process'
import { access, constants } from 'fs/promises'
import { basename, extname, join } from 'path'
import { mkdtemp, readFile, readdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const AUDIO_EXT = new Set(['.m4a', '.mp3', '.wav', '.webm', '.mp4', '.aac', '.ogg', '.caf', '.flac'])
const TEXT_EXT = new Set(['.txt', '.md', '.vtt', '.srt'])

const WHISPER_CLI_PATHS = ['/usr/local/bin/whisper-cli', '/opt/homebrew/bin/whisper-cli']
const FFMPEG_PATHS = ['/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']
const WHISPER_MODEL_PATHS = [
  '/usr/local/share/whisper-cpp/models/ggml-base.en.bin',
  '/opt/homebrew/share/whisper-cpp/models/ggml-base.en.bin',
  '/usr/local/share/whisper-cpp/models/ggml-tiny.en.bin',
  '/opt/homebrew/share/whisper-cpp/models/ggml-tiny.en.bin'
]

const CONVERT_TO_WAV = new Set(['.m4a', '.caf', '.aac', '.webm', '.mp4'])

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveBinary(name: string, fallbacks: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('which', [name])
    const found = stdout.trim()
    if (found) return found
  } catch {
    // which failed
  }
  for (const p of fallbacks) {
    if (await exists(p)) return p
  }
  return null
}

async function resolveWhisperModel(): Promise<string | null> {
  const fromEnv = process.env.WHISPER_MODEL?.trim()
  if (fromEnv && (await exists(fromEnv))) return fromEnv

  for (const p of WHISPER_MODEL_PATHS) {
    if (await exists(p)) return p
  }
  return null
}

function stripSubtitleMarkup(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      if (/^\d+$/.test(t)) return false
      if (/^\d{2}:\d{2}:\d{2}/.test(t)) return false
      if (t === 'WEBVTT') return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function convertToWav(filePath: string): Promise<{ wavPath: string; cleanup: () => Promise<void> }> {
  const ffmpeg = await resolveBinary('ffmpeg', FFMPEG_PATHS)
  if (!ffmpeg) {
    throw new Error('ffmpeg is required for .m4a voice memos. Install with: brew install ffmpeg')
  }
  const wavPath = join(tmpdir(), `mycel-${Date.now()}.wav`)
  await execFileAsync(
    ffmpeg,
    ['-y', '-i', filePath, '-ar', '16000', '-ac', '1', wavPath],
    { timeout: 120_000 }
  )
  return {
    wavPath,
    cleanup: async () => {
      await rm(wavPath, { force: true }).catch(() => {})
    }
  }
}

async function transcribeWithOpenAiWhisper(cli: string, filePath: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mycel-whisper-'))
  try {
    await execFileAsync(
      cli,
      [filePath, '--model', 'base', '--output_format', 'txt', '--output_dir', dir],
      { timeout: 600_000 }
    )
    const files = await readdir(dir)
    const txtFile = files.find((f) => f.endsWith('.txt'))
    if (!txtFile) throw new Error('Whisper produced no transcript')
    return (await readFile(join(dir, txtFile), 'utf8')).trim()
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function transcribeWithWhisperCpp(cli: string, model: string, filePath: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mycel-whisper-cpp-'))
  const outBase = join(dir, 'transcript')
  try {
    await execFileAsync(
      cli,
      ['-m', model, '-f', filePath, '-of', outBase, '-otxt', '-nt', '-np'],
      { timeout: 600_000 }
    )
    const txtPath = `${outBase}.txt`
    if (await exists(txtPath)) {
      const text = (await readFile(txtPath, 'utf8')).trim()
      if (text) return text
    }
    throw new Error('whisper-cli produced no transcript')
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function transcribeAudio(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase()
  let audioPath = filePath
  let cleanup: (() => Promise<void>) | null = null

  if (CONVERT_TO_WAV.has(ext)) {
    const converted = await convertToWav(filePath)
    audioPath = converted.wavPath
    cleanup = converted.cleanup
  }

  try {
    const openAiWhisper = await resolveBinary('whisper', [])
    if (openAiWhisper) {
      try {
        return await transcribeWithOpenAiWhisper(openAiWhisper, filePath)
      } catch {
        // fall through to whisper-cli
      }
    }

    const whisperCli = await resolveBinary('whisper-cli', WHISPER_CLI_PATHS)
    if (!whisperCli) {
      throw new Error('No whisper found. Install whisper-cpp: brew install whisper-cpp')
    }

    const model = await resolveWhisperModel()
    if (!model) {
      throw new Error(
        'Whisper model not found. Download models in /usr/local/share/whisper-cpp/models/'
      )
    }

    return await transcribeWithWhisperCpp(whisperCli, model, audioPath)
  } finally {
    if (cleanup) await cleanup()
  }
}

export async function readTranscriptFromFile(
  filePath: string
): Promise<{ text: string; title: string }> {
  const ext = extname(filePath).toLowerCase()
  const title = basename(filePath, ext)

  if (TEXT_EXT.has(ext)) {
    let text = await readFile(filePath, 'utf8')
    if (ext === '.vtt' || ext === '.srt') text = stripSubtitleMarkup(text)
    if (!text.trim()) throw new Error('File is empty')
    return { text: text.trim(), title }
  }

  if (AUDIO_EXT.has(ext)) {
    const text = await transcribeAudio(filePath)
    if (!text) throw new Error('Transcription returned empty text')
    return { text, title }
  }

  throw new Error(`Unsupported file type (${ext}). Use .txt, .md, or audio.`)
}
