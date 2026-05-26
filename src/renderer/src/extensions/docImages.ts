import ImageExtension from '@tiptap/extension-image'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read image'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

function imageFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  return Array.from(dataTransfer.files).filter((f) => f.type.startsWith('image/'))
}

function imageFilesFromClipboard(dataTransfer: DataTransfer): File[] {
  const fromFiles = imageFilesFromDataTransfer(dataTransfer)
  if (fromFiles.length) return fromFiles

  const fromItems: File[] = []
  for (const item of dataTransfer.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) fromItems.push(file)
    }
  }
  return fromItems
}

export const DocImage = ImageExtension.configure({
  allowBase64: true,
  HTMLAttributes: {
    class: 'doc-editor-image'
  },
  resize: {
    enabled: true,
    directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
    minWidth: 80,
    minHeight: 80,
    alwaysPreserveAspectRatio: true
  }
})

export const ImageDropPaste = Extension.create({
  name: 'imageDropPaste',

  addProseMirrorPlugins() {
    const editor = this.editor

    const insertImages = async (files: File[], pos?: number): Promise<void> => {
      const nodes = await Promise.all(
        files.map(async (file) => ({
          type: 'image',
          attrs: { src: await fileToDataUrl(file) }
        }))
      )
      const insertPos = pos ?? editor.state.selection.from
      editor.chain().focus().insertContentAt(insertPos, nodes).run()
    }

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragover(_view, event) {
              if (!event.dataTransfer) return false
              if (imageFilesFromDataTransfer(event.dataTransfer).length > 0) {
                event.preventDefault()
                return true
              }
              return false
            }
          },
          handleDrop(view, event, _slice, moved) {
            if (moved || !event.dataTransfer) return false
            const files = imageFilesFromDataTransfer(event.dataTransfer)
            if (!files.length) return false

            event.preventDefault()
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
            void insertImages(files, coords?.pos)
            return true
          },
          handlePaste(_view, event) {
            if (!event.clipboardData) return false
            const files = imageFilesFromClipboard(event.clipboardData)
            if (!files.length) return false

            event.preventDefault()
            void insertImages(files)
            return true
          }
        }
      })
    ]
  }
})

export async function pickImageFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => {
      resolve(input.files ? Array.from(input.files) : [])
    }
    input.click()
  })
}
