'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Code2, Share2, Copy, Check, Loader2, Palette, FileCode, Globe, PanelRight, PanelRightClose, MapPinned, Pin } from 'lucide-react'
import type { CodeEditorHandle } from '@/components/code-editor'
import CodeOutlinePanel from '@/components/code-outline-panel'

const CodeMirrorEditor = dynamic(() => import('@/components/code-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

const LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'php', label: 'PHP' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
]

const THEMES = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
]

const DEFAULT_CODE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xin chào NoteCode!</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.2rem;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NoteCode</h1>
    <p>Chia sẻ đoạn code của bạn dễ dàng!</p>
  </div>
</body>
</html>`

export default function NoteCodeHome() {
  const searchParams = useSearchParams()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState('html')
  const [theme, setTheme] = useState('light')
  const [shareId, setShareId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSnippet, setIsLoadingSnippet] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showOutline, setShowOutline] = useState(true)
  const [stickyScroll, setStickyScroll] = useState(true)
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const editorRef = useRef<CodeEditorHandle>(null)
  const initialLoadDone = useRef(false)

  // Load snippet from URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && !initialLoadDone.current) {
      initialLoadDone.current = true
      setIsLoadingSnippet(true)
      fetch(`/api/snippets/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found')
          return res.json()
        })
        .then((data) => {
          setCode(data.code)
          setLanguage(data.language)
          setTheme(data.theme)
          setShareId(id)
          setIsDirty(false)
          toast.success('Đã tải đoạn code thành công!')
        })
        .catch(() => {
          toast.error('Không tìm thấy đoạn code với ID này')
        })
        .finally(() => setIsLoadingSnippet(false))
    }
  }, [searchParams])

  const handleCodeChange = useCallback((value: string) => {
    setCode(value)
    if (!isDirty) setIsDirty(true)
  }, [isDirty])

  const handleShare = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, theme }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setShareId(data.shareId)
      setIsDirty(false)
      toast.success('Chia sẻ thành công!')
      const url = new URL(window.location.href)
      url.searchParams.set('id', data.shareId)
      window.history.replaceState(null, '', url.toString())
    } catch {
      toast.error('Không thể lưu đoạn code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareId) return
    const url = `${window.location.origin}/?id=${shareId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Đã sao chép liên kết!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  const handleOutlineClick = useCallback((line: number) => {
    editorRef.current?.scrollToLine(line)
  }, [])

  const handleActiveLineChange = useCallback((line: number | null) => {
    setActiveLine(line)
  }, [])

  const canShare = isDirty && code.trim().length > 0
  const isEditorDark = theme === 'dark'

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isEditorDark ? 'bg-zinc-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-sm ${isEditorDark ? 'bg-zinc-900/90 border-zinc-700/50' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center justify-center size-8 sm:size-9 rounded-lg ${isEditorDark ? 'bg-emerald-600' : 'bg-emerald-500'}`}>
                <Code2 className="size-4 sm:size-5 text-white" />
              </div>
              <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${isEditorDark ? 'text-white' : 'text-gray-900'}`}>
                NoteCode
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {shareId && (
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isEditorDark ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}>
                  <Globe className="size-3.5" />
                  <span className="font-mono">{shareId}</span>
                </div>
              )}
              {shareId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className={`h-8 sm:h-9 ${isEditorDark ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white' : ''}`}
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">Sao chép</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleShare}
                disabled={!canShare || isLoading}
                className="h-8 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                <span className="ml-1.5">Chia sẻ</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className={`border-b ${isEditorDark ? 'bg-zinc-850 border-zinc-700/50' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3 overflow-x-auto">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <FileCode className={`size-4 shrink-0 ${isEditorDark ? 'text-zinc-400' : 'text-gray-500'}`} />
              <Select value={language} onValueChange={(v) => { setLanguage(v); if (!isDirty) setIsDirty(true) }}>
                <SelectTrigger className={`w-[120px] sm:w-[140px] h-8 text-sm ${isEditorDark ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : ''}`}>
                  <SelectValue placeholder="Ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <Palette className={`size-4 shrink-0 ${isEditorDark ? 'text-zinc-400' : 'text-gray-500'}`} />
              <Select value={theme} onValueChange={(v) => { setTheme(v); if (!isDirty) setIsDirty(true) }}>
                <SelectTrigger className={`w-[100px] sm:w-[110px] h-8 text-sm ${isEditorDark ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : ''}`}>
                  <SelectValue placeholder="Chủ đề" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile share ID display */}
            {shareId && (
              <div className={`sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono ${isEditorDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
                ID: {shareId}
              </div>
            )}

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStickyScroll(prev => !prev)}
              className="h-8 gap-1.5 text-xs"
            >
              <Pin className="size-3.5" />
              <span className="hidden sm:inline">Sticky Scroll</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOutline(prev => !prev)}
              className={`h-8 gap-1.5 text-xs ${isEditorDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <MapPinned className="size-3.5" />
              <span className="hidden sm:inline">Cấu trúc code</span>
              {showOutline ? (
                <PanelRightClose className="size-3.5 sm:hidden" />
              ) : (
                <PanelRight className="size-3.5 sm:hidden" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor + Outline Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {isLoadingSnippet ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
              <p className={`text-sm ${isEditorDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                Đang tải đoạn code...
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex rounded-xl overflow-hidden border shadow-sm h-[calc(100vh-12rem)] sm:h-[calc(100vh-11rem)] ${isEditorDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
            {/* Code Editor */}
            <div className="flex-1 min-w-0">
              <CodeMirrorEditor
                ref={editorRef}
                code={code}
                language={language}
                theme={theme}
                onCodeChange={handleCodeChange}
                onActiveLineChange={handleActiveLineChange}
                stickyScrollEnabled={stickyScroll}
              />
            </div>

            {/* Outline Panel - Desktop always visible, Mobile toggle */}
            {showOutline && (
              <div className={`w-full sm:w-56 lg:w-64 shrink-0 border-l overflow-hidden flex flex-col ${isEditorDark ? 'bg-zinc-900 border-zinc-700/50' : 'bg-zinc-50 border-gray-200'} max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:border-l-0 max-sm:bg-black/40`}>
                {/* Mobile backdrop */}
                <div className="sm:hidden absolute inset-0" onClick={() => setShowOutline(false)} />
                <div className={`relative sm:relative flex flex-col h-full ${isEditorDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  {/* Outline Header */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${isEditorDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <MapPinned className={`size-3.5 ${isEditorDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                      <span className={`text-xs font-semibold ${isEditorDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                        Cấu trúc
                      </span>
                    </div>
                    <button
                      onClick={() => setShowOutline(false)}
                      className={`sm:hidden p-1 rounded transition-colors ${isEditorDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    >
                      <PanelRightClose className="size-4" />
                    </button>
                  </div>

                  {/* Outline Content */}
                  <div className="flex-1 min-h-0">
                    <CodeOutlinePanel
                      code={code}
                      language={language}
                      isDark={isEditorDark}
                      activeLine={activeLine}
                      onItemClick={handleOutlineClick}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-3 mt-auto ${isEditorDark ? 'bg-zinc-900 border-zinc-700/50' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className={`text-center text-xs ${isEditorDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            NoteCode — Lưu trữ và chia sẻ đoạn code dễ dàng
          </p>
        </div>
      </footer>
    </div>
  )
}