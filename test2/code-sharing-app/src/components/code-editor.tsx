'use client'

import { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { injectStickyScrollCSS, attachStickyScroll } from '@/lib/sticky-scroll-extension'

export interface CodeEditorHandle {
  scrollToLine: (line: number) => void
}

interface CodeEditorProps {
  code: string
  language: string
  theme: string
  onCodeChange: (value: string) => void
  onActiveLineChange?: (line: number | null) => void
  stickyScrollEnabled?: boolean
}

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'html': return html()
    case 'css': return css()
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'python': return python()
    case 'java': return java()
    case 'cpp': return cpp()
    case 'php': return php()
    case 'rust': return rust()
    case 'json': return json()
    case 'markdown': return markdown()
    case 'sql': return sql()
    default: return html()
  }
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ code, language, theme, onCodeChange, onActiveLineChange, stickyScrollEnabled = true }, ref) => {
    const viewRef = useRef<EditorView | null>(null)
    const cleanupRef = useRef<(() => void) | null>(null)

    // Expose scrollToLine to parent
    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const view = viewRef.current
        if (!view) return

        const pos = Math.min(line, view.state.doc.lines)
        const lineInfo = view.state.doc.line(Math.max(1, pos))

        view.dispatch({
          effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
          selection: { anchor: lineInfo.from },
        })

        view.focus()
      },
    }))

    const handleCreateEditor = useCallback((view: EditorView) => {
      viewRef.current = view
    }, [])

    const handleChange = useCallback((value: string) => {
      onCodeChange(value)
    }, [onCodeChange])

    const handleUpdate = useCallback((viewUpdate: ViewUpdate) => {
      if (viewUpdate.selectionSet && onActiveLineChange) {
        const pos = viewUpdate.state.selection.main.head
        const line = viewUpdate.state.doc.lineAt(pos).number - 1
        onActiveLineChange(line)
      }
    }, [onActiveLineChange])

    // Inject CSS once
    useEffect(() => {
      injectStickyScrollCSS()
    }, [])

    // Attach/detach sticky scroll overlay
    useEffect(() => {
      if (!stickyScrollEnabled) {
        if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
        return
      }

      let cancelled = false
      const tryAttach = () => {
        if (cancelled) return
        const view = viewRef.current
        if (!view || !view.scrollDOM) {
          requestAnimationFrame(tryAttach)
          return
        }
        if (cleanupRef.current) cleanupRef.current()
        cleanupRef.current = attachStickyScroll(view, language, theme === 'dark')
      }
      requestAnimationFrame(tryAttach)

      return () => {
        cancelled = true
        if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
      }
    }, [language, theme, stickyScrollEnabled])

    // Focus editor on mount
    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.focus()
      }
    }, [])

    const langExt = getLanguageExtension(language)
    const isDark = theme === 'dark'

    const customTheme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      '.cm-gutters': {
        minWidth: '40px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
        color: isDark ? '#6ee7b7' : '#059669',
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
      },
    })

    return (
      <CodeMirror
        value={code}
        height="100%"
        theme={isDark ? [oneDark, customTheme] : customTheme}
        extensions={[langExt, EditorView.updateListener.of(handleUpdate)]}
        onChange={handleChange}
        onCreateEditor={handleCreateEditor}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
          tabSize: 2,
        }}
        className="h-full"
      />
    )
  }
)

CodeEditor.displayName = 'CodeEditor'

export default CodeEditor
