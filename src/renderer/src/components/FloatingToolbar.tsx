import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Quote,
  Link,
  Highlighter
} from 'lucide-react'
import { useCallback } from 'react'

interface FloatingToolbarProps {
  editor: Editor
}

interface ToolbarButton {
  icon: React.ReactNode
  title: string
  isActive: () => boolean
  action: () => void
}

const ICON_SIZE = 16

export function FloatingToolbar({ editor }: FloatingToolbarProps): React.JSX.Element {
  const handleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt('URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const buttons: ToolbarButton[] = [
    {
      icon: <Bold size={ICON_SIZE} />,
      title: 'Bold',
      isActive: () => editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run()
    },
    {
      icon: <Italic size={ICON_SIZE} />,
      title: 'Italic',
      isActive: () => editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run()
    },
    {
      icon: <Underline size={ICON_SIZE} />,
      title: 'Underline',
      isActive: () => editor.isActive('underline'),
      action: () => editor.chain().focus().toggleUnderline().run()
    },
    {
      icon: <Strikethrough size={ICON_SIZE} />,
      title: 'Strikethrough',
      isActive: () => editor.isActive('strike'),
      action: () => editor.chain().focus().toggleStrike().run()
    },
    {
      icon: <Code size={ICON_SIZE} />,
      title: 'Code',
      isActive: () => editor.isActive('code'),
      action: () => editor.chain().focus().toggleCode().run()
    },
    {
      icon: <Heading1 size={ICON_SIZE} />,
      title: 'Heading 1',
      isActive: () => editor.isActive('heading', { level: 1 }),
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
      icon: <Heading2 size={ICON_SIZE} />,
      title: 'Heading 2',
      isActive: () => editor.isActive('heading', { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      icon: <Quote size={ICON_SIZE} />,
      title: 'Blockquote',
      isActive: () => editor.isActive('blockquote'),
      action: () => editor.chain().focus().toggleBlockquote().run()
    },
    {
      icon: <Link size={ICON_SIZE} />,
      title: 'Link',
      isActive: () => editor.isActive('link'),
      action: handleLink
    },
    {
      icon: <Highlighter size={ICON_SIZE} />,
      title: 'Highlight',
      isActive: () => editor.isActive('highlight'),
      action: () => editor.chain().focus().toggleHighlight().run()
    }
  ]

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top',
        offset: 8
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(28,23,18,0.88)',
          backdropFilter: 'blur(4px)',
          borderRadius: 8,
          padding: '4px'
        }}
      >
        {buttons.map((btn) => {
          const active = btn.isActive()
          return (
            <button
              key={btn.title}
              onClick={btn.action}
              title={btn.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 4,
                border: 'none',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: 'background 100ms ease, color 100ms ease'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }
              }}
            >
              {btn.icon}
            </button>
          )
        })}
      </div>
    </BubbleMenu>
  )
}
