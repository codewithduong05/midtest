'use client'

import { useMemo, type ComponentType } from 'react'
import { parseCodeOutline, type OutlineItem } from '@/lib/code-outline'
import {
  CodeXml,
  Settings,
  File,
  PanelTop,
  PanelBottom,
  Navigation,
  Layout,
  LayoutGrid,
  FileText,
  Sidebar,
  Square,
  TextCursorInput,
  Table,
  FileCode,
  Paintbrush,
  Type,
  FunctionSquare,
  Box,
  Variable,
  MessageSquare,
  Monitor,
  Braces,
  Heading1,
  Heading2,
  Heading,
  List,
  Database,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  'code-xml': CodeXml,
  settings: Settings,
  file: File,
  'panel-top': PanelTop,
  'panel-bottom': PanelBottom,
  navigation: Navigation,
  layout: Layout,
  'layout-grid': LayoutGrid,
  'file-text': FileText,
  sidebar: Sidebar,
  square: Square,
  'text-cursor-input': TextCursorInput,
  table: Table,
  'file-code': FileCode,
  paintbrush: Paintbrush,
  type: Type,
  'function-square': FunctionSquare,
  box: Box,
  variable: Variable,
  'message-square': MessageSquare,
  monitor: Monitor,
  braces: Braces,
  'heading-1': Heading1,
  'heading-2': Heading2,
  heading: Heading,
  list: List,
  database: Database,
}

function getIcon(iconName: string): ComponentType<{ className?: string }> {
  return iconMap[iconName] || MapPin
}

interface CodeOutlinePanelProps {
  code: string
  language: string
  isDark: boolean
  activeLine: number | null
  onItemClick: (line: number) => void
}

interface ResolvedOutlineItem extends OutlineItem {
  IconComponent: ComponentType<{ className?: string }>
}

export default function CodeOutlinePanel({
  code,
  language,
  isDark,
  activeLine,
  onItemClick,
}: CodeOutlinePanelProps) {
  const outlineItems = useMemo(() => {
    const parsed = parseCodeOutline(code, language)
    return parsed.map(item => ({
      ...item,
      IconComponent: getIcon(item.icon),
    })) satisfies ResolvedOutlineItem[]
  }, [code, language])

  if (outlineItems.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full py-8 px-3',
        isDark ? 'text-zinc-600' : 'text-gray-300'
      )}>
        <FileCode className="size-5 mb-2" />
        <p className="text-xs text-center">Không tìm thấy cấu trúc</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {outlineItems.map((item, idx) => (
          <OutlineItemRow
            key={`${item.line}-${idx}`}
            name={item.name}
            line={item.line}
            indent={item.indent}
            IconComponent={item.IconComponent}
            isDark={isDark}
            isActive={activeLine === item.line}
            onClick={() => onItemClick(item.line)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function OutlineItemRow({
  name,
  line,
  indent,
  IconComponent,
  isDark,
  isActive,
  onClick,
}: {
  name: string
  line: number
  indent: number
  IconComponent: ComponentType<{ className?: string }>
  isDark: boolean
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={`Dòng ${line + 1}`}
      className={cn(
        'w-full flex items-center gap-1.5 py-1 px-2 text-left text-xs transition-colors cursor-pointer group',
        'hover:bg-emerald-500/10',
        isActive && (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'),
        !isActive && (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700')
      )}
    >
      <ChevronRight
        className={cn(
          'size-3 shrink-0 transition-transform',
          indent > 0 && 'hidden'
        )}
      />
      <IconComponent className="size-3.5 shrink-0 opacity-60" />
      <span className="truncate font-mono text-[11px]">{name}</span>
      <span className={cn(
        'ml-auto text-[10px] font-mono shrink-0 opacity-0 group-hover:opacity-60 transition-opacity',
      )}>
        {line + 1}
      </span>
    </button>
  )
}