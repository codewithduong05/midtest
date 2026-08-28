export interface OutlineItem {
  name: string
  line: number  // 0-indexed
  indent: number
  icon: string
  type: 'tag' | 'function' | 'class' | 'variable' | 'heading' | 'selector' | 'section' | 'comment'
}

export function parseCodeOutline(code: string, language: string): OutlineItem[] {
  const lines = code.split('\n')
  const items: OutlineItem[] = []

  switch (language) {
    case 'html':
      parseHTML(lines, items)
      break
    case 'css':
      parseCSS(lines, items)
      break
    case 'javascript':
    case 'typescript':
      parseJS(lines, items)
      break
    case 'python':
      parsePython(lines, items)
      break
    case 'java':
    case 'cpp':
    case 'php':
    case 'rust':
      parseCStyle(lines, items, language)
      break
    case 'json':
      parseJSON(lines, items)
      break
    case 'markdown':
      parseMarkdown(lines, items)
      break
    case 'sql':
      parseSQL(lines, items)
      break
    default:
      parseGeneric(lines, items)
  }

  return items
}

function parseHTML(lines: string[], items: OutlineItem[]) {
  const importantTags = new Set([
    'html', 'head', 'body', 'header', 'footer', 'nav', 'main',
    'section', 'article', 'aside', 'div', 'span', 'form',
    'table', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
    'script', 'style', 'title', 'meta', 'link',
  ])

  const tagStack: { tag: string; line: number }[] = []
  const selfClosing = new Set(['meta', 'link', 'br', 'hr', 'img', 'input'])

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const matches = trimmed.matchAll(/<\/?(\w[\w-]*)/g)

    for (const match of matches) {
      const tag = match[1].toLowerCase()
      const isClosing = trimmed[match.index! + 1] === '/'

      if (!isClosing && importantTags.has(tag)) {
        tagStack.push({ tag, line: i })
        items.push({
          name: tag,
          line: i,
          indent: (tagStack.length - 1) * 12,
          icon: getTagIcon(tag),
          type: 'tag',
        })
      } else if (isClosing && !selfClosing.has(tag)) {
        // Pop from stack until we find matching tag
        for (let j = tagStack.length - 1; j >= 0; j--) {
          if (tagStack[j].tag === tag) {
            tagStack.splice(j, 1)
            break
          }
        }
      }
    }

    // Also check for comments
    const commentMatch = trimmed.match(/^<!--\s*(.+)/)
    if (commentMatch) {
      const commentText = commentMatch[1].substring(0, 30).replace(/-->$/, '').trim()
      if (commentText.length > 0) {
        items.push({
          name: commentText,
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function parseCSS(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // CSS selectors (lines ending with {)
    const selectorMatch = trimmed.match(/^(.+?)\s*\{$/)
    if (selectorMatch) {
      const selector = selectorMatch[1].trim()
      // Skip generic rules
      if (selector && !selector.startsWith('@media') && !selector.startsWith('/*')) {
        items.push({
          name: selector,
          line: i,
          indent: 0,
          icon: 'paintbrush',
          type: 'selector',
        })
      }
    }

    // Media queries
    const mediaMatch = trimmed.match(/@media\s*\(([^)]+)\)/)
    if (mediaMatch) {
      items.push({
        name: `@media ${mediaMatch[1]}`,
        line: i,
        indent: 0,
        icon: 'monitor',
        type: 'section',
      })
    }

    // CSS comments
    const commentMatch = trimmed.match(/\/\*\s*(.+)/)
    if (commentMatch) {
      const commentText = commentMatch[1].substring(0, 30).replace(/\*\//, '').trim()
      if (commentText.length > 2) {
        items.push({
          name: commentText,
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function parseJS(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Functions: function name(...), const name = function, const name = (...)
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
    if (funcMatch) {
      items.push({
        name: funcMatch[1] + '()',
        line: i,
        indent: 0,
        icon: 'function-square',
        type: 'function',
      })
      continue
    }

    // Arrow functions / const fn = () =>
    const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/)
    if (arrowMatch) {
      items.push({
        name: arrowMatch[1] + '()',
        line: i,
        indent: 0,
        icon: 'function-square',
        type: 'function',
      })
      continue
    }

    // Class declarations
    const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/)
    if (classMatch) {
      items.push({
        name: classMatch[1],
        line: i,
        indent: 0,
        icon: 'box',
        type: 'class',
      })
      continue
    }

    // Variables (const/let/var at top level - simple heuristic)
    const varMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)/)
    if (varMatch) {
      const name = varMatch[1]
      if (!name.startsWith('_') && name !== 'if' && name !== 'for' && name !== 'while') {
        items.push({
          name,
          line: i,
          indent: 0,
          icon: 'variable',
          type: 'variable',
        })
      }
    }

    // Comments
    const commentMatch = trimmed.match(/^(?:\/\/|#)\s*(.+)/)
    if (commentMatch) {
      const commentText = commentMatch[1].trim()
      if (commentText.length > 2 && !commentText.startsWith('@')) {
        items.push({
          name: commentText.substring(0, 30),
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function parsePython(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Class definitions
    const classMatch = trimmed.match(/^class\s+(\w+)/)
    if (classMatch) {
      items.push({
        name: classMatch[1],
        line: i,
        indent: 0,
        icon: 'box',
        type: 'class',
      })
      continue
    }

    // Function/method definitions (only top-level or indented by one level)
    const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/)
    if (funcMatch) {
      const indent = (lines[i].match(/^(\s*)/) || ['', ''])[1].length
      items.push({
        name: funcMatch[1] + '()',
        line: i,
        indent: Math.min(indent * 8, 24),
        icon: 'function-square',
        type: 'function',
      })
      continue
    }

    // Comments
    const commentMatch = trimmed.match(/^#\s*(.+)/)
    if (commentMatch) {
      const commentText = commentMatch[1].trim()
      if (commentText.length > 2) {
        items.push({
          name: commentText.substring(0, 30),
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function parseCStyle(lines: string[], items: OutlineItem[], _language: string) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Functions
    const funcMatch = trimmed.match(/^(?:(?:public|private|protected|static|async|export)\s+)*(?:\w+[<>,\s\[\]&*]+)\s+(\w+)\s*\([^)]*\)/)
    if (funcMatch && !trimmed.includes('class ') && !trimmed.includes('interface ')) {
      items.push({
        name: funcMatch[1] + '()',
        line: i,
        indent: 0,
        icon: 'function-square',
        type: 'function',
      })
      continue
    }

    // Classes / Structs / Interfaces
    const classMatch = trimmed.match(/(?:class|struct|interface|enum)\s+(\w+)/)
    if (classMatch) {
      items.push({
        name: classMatch[1],
        line: i,
        indent: 0,
        icon: 'box',
        type: 'class',
      })
      continue
    }

    // Comments
    const commentMatch = trimmed.match(/^(?:\/\/|#)\s*(.+)/)
    if (commentMatch) {
      const commentText = commentMatch[1].trim()
      if (commentText.length > 2) {
        items.push({
          name: commentText.substring(0, 30),
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function parseJSON(lines: string[], items: OutlineItem[]) {
  const stack: { key: string; line: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Object keys
    const keyMatch = trimmed.match(/^"(\w[\w\s]*)"\s*:/)
    if (keyMatch) {
      const key = keyMatch[1]
      stack.push({ key, line: i })
      items.push({
        name: key,
        line: i,
        indent: (stack.length - 1) * 12,
        icon: 'braces',
        type: 'variable',
      })
    }

    // Close braces - pop stack
    if (trimmed === '}' || trimmed === '},') {
      stack.pop()
    }
  }
}

function parseMarkdown(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      items.push({
        name: headingMatch[2],
        line: i,
        indent: (level - 1) * 12,
        icon: level === 1 ? 'heading-1' : level === 2 ? 'heading-2' : 'heading',
        type: 'heading',
      })
    }
  }
}

function parseSQL(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim().toUpperCase()

    // CREATE statements
    if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('CREATE INDEX')) {
      const nameMatch = lines[i].trim().match(/(\w+)\s*$/)
      const name = nameMatch ? nameMatch[1] : ''
      items.push({
        name: `CREATE ${name}`,
        line: i,
        indent: 0,
        icon: 'database',
        type: 'section',
      })
    }

    // Function/procedure
    if (trimmed.startsWith('CREATE FUNCTION') || trimmed.startsWith('CREATE PROCEDURE')) {
      const nameMatch = lines[i].trim().match(/(\w+)\s*\(?/)
      if (nameMatch) {
        items.push({
          name: nameMatch[1] + '()',
          line: i,
          indent: 0,
          icon: 'function-square',
          type: 'function',
        })
      }
    }

    // SELECT statements
    if (trimmed.startsWith('SELECT')) {
      items.push({
        name: 'SELECT query',
        line: i,
        indent: 0,
        icon: 'list',
        type: 'section',
      })
    }
  }
}

function parseGeneric(lines: string[], items: OutlineItem[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.match(/^(?:\/\/|#)\s*(.+)/)) {
      const commentText = trimmed.replace(/^(?:\/\/|#)\s*/, '').trim()
      if (commentText.length > 2) {
        items.push({
          name: commentText.substring(0, 30),
          line: i,
          indent: 0,
          icon: 'message-square',
          type: 'comment',
        })
      }
    }
  }
}

function getTagIcon(tag: string): string {
  const iconMap: Record<string, string> = {
    html: 'code-xml',
    head: 'settings',
    body: 'file',
    header: 'panel-top',
    footer: 'panel-bottom',
    nav: 'navigation',
    main: 'layout',
    section: 'layout-grid',
    article: 'file-text',
    aside: 'sidebar',
    div: 'square',
    form: 'text-cursor-input',
    table: 'table',
    script: 'file-code',
    style: 'paintbrush',
    title: 'type',
  }
  return iconMap[tag] || 'code-xml'
}
