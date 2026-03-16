import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { Editor, Range } from '@tiptap/core'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Minus,
  Quote,
  Code2,
  Image,
  Table
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SlashItem {
  title: string
  group: string
  icon: React.ReactNode
  command: (props: { editor: Editor; range: Range }) => void
}

/* ------------------------------------------------------------------ */
/*  Slash command items                                                 */
/* ------------------------------------------------------------------ */

const ICON_SIZE = 16

const slashItems: SlashItem[] = [
  {
    title: 'Heading 1',
    group: 'Text',
    icon: <Heading1 size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    }
  },
  {
    title: 'Heading 2',
    group: 'Text',
    icon: <Heading2 size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    }
  },
  {
    title: 'Heading 3',
    group: 'Text',
    icon: <Heading3 size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    }
  },
  {
    title: 'Bullet list',
    group: 'Lists',
    icon: <List size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    }
  },
  {
    title: 'Numbered list',
    group: 'Lists',
    icon: <ListOrdered size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    }
  },
  {
    title: 'Task list',
    group: 'Lists',
    icon: <ListChecks size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    }
  },
  {
    title: 'Divider',
    group: 'Insert',
    icon: <Minus size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    }
  },
  {
    title: 'Blockquote',
    group: 'Insert',
    icon: <Quote size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run()
    }
  },
  {
    title: 'Code block',
    group: 'Insert',
    icon: <Code2 size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run()
    }
  },
  {
    title: 'Image',
    group: 'Insert',
    icon: <Image size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL')
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      }
    }
  },
  {
    title: 'Table',
    group: 'Insert',
    icon: <Table size={ICON_SIZE} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    }
  }
]

/* ------------------------------------------------------------------ */
/*  React component rendered as popup                                  */
/* ------------------------------------------------------------------ */

interface SlashMenuListProps {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

export function SlashMenuList({ items, command }: SlashMenuListProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  // Expose keyboard handler via ref-like pattern (used by the renderer)
  const onKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1))
        return true
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1))
        return true
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (items[selectedIndex]) {
          command(items[selectedIndex])
        }
        return true
      }
      return false
    },
    [items, selectedIndex, command]
  )

  // Attach onKeyDown to the component instance so the renderer can call it
  // We use useLayoutEffect to keep the ref fresh
  const ref = useRef<{ onKeyDown: (event: KeyboardEvent) => boolean }>({ onKeyDown })
  useLayoutEffect(() => {
    ref.current.onKeyDown = onKeyDown
  }, [onKeyDown])

  // Expose via a well-known property for the ReactRenderer
  ;(SlashMenuList as any)._instance = ref

  // Scroll selected item into view
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (items.length === 0) {
    return (
      <div
        style={{
          background: 'rgba(28,23,18,0.88)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 13
        }}
      >
        No results
      </div>
    )
  }

  // Group items
  let currentGroup = ''

  return (
    <div
      ref={containerRef}
      style={{
        background: 'rgba(28,23,18,0.88)',
        backdropFilter: 'blur(4px)',
        borderRadius: 8,
        padding: '4px',
        maxHeight: 320,
        overflowY: 'auto',
        minWidth: 200
      }}
    >
      {items.map((item, index) => {
        const showGroup = item.group !== currentGroup
        currentGroup = item.group
        return (
          <div key={item.title}>
            {showGroup && (
              <div
                style={{
                  padding: '6px 10px 2px',
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {item.group}
              </div>
            )}
            <button
              onClick={() => command(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 10px',
                background: index === selectedIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                textAlign: 'left'
              }}
            >
              <span style={{ display: 'flex', opacity: 0.7 }}>{item.icon}</span>
              {item.title}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TipTap Extension                                                   */
/* ------------------------------------------------------------------ */

// We need a component ref that survives across renders for keyDown handling
let rendererInstance: ReactRenderer | null = null

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase()
          return slashItems.filter((item) => item.title.toLowerCase().includes(q))
        },
        render: () => {
          let popup: HTMLDivElement | null = null

          return {
            onStart(props: SuggestionProps<SlashItem>) {
              popup = document.createElement('div')
              popup.style.position = 'absolute'
              popup.style.zIndex = '50'
              document.body.appendChild(popup)

              rendererInstance = new ReactRenderer(SlashMenuList, {
                props: {
                  items: props.items,
                  command: (item: SlashItem) => {
                    item.command({ editor: props.editor, range: props.range })
                  }
                },
                editor: props.editor
              })

              popup.appendChild(rendererInstance.element)

              // Position
              const rect = props.clientRect?.()
              if (rect && popup) {
                popup.style.left = `${rect.left}px`
                popup.style.top = `${rect.bottom + 4}px`
              }
            },
            onUpdate(props: SuggestionProps<SlashItem>) {
              rendererInstance?.updateProps({
                items: props.items,
                command: (item: SlashItem) => {
                  item.command({ editor: props.editor, range: props.range })
                }
              })
              const rect = props.clientRect?.()
              if (rect && popup) {
                popup.style.left = `${rect.left}px`
                popup.style.top = `${rect.bottom + 4}px`
              }
            },
            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                popup?.remove()
                popup = null
                rendererInstance?.destroy()
                rendererInstance = null
                return true
              }
              // Delegate to the list component's keyboard handler
              const instance = (SlashMenuList as any)._instance
              if (instance?.current?.onKeyDown) {
                return instance.current.onKeyDown(props.event)
              }
              return false
            },
            onExit() {
              popup?.remove()
              popup = null
              rendererInstance?.destroy()
              rendererInstance = null
            }
          }
        }
      } satisfies Partial<SuggestionOptions<SlashItem>>
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
