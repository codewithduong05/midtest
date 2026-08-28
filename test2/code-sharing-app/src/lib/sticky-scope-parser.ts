export interface StickyScope {
  name: string
  line: number    // 0-indexed
  endLine: number // 0-indexed, inclusive
  depth: number
  rawText: string // the actual line text
}

/**
 * Parse code into a stack of sticky scopes.
 * Each scope has a start line, end line, and depth level.
 * When the editor scrolls, we find which scopes the viewport is inside
 * and show their headers as sticky breadcrumbs.
 */
export function parseStickyScopes(code: string, language: string): StickyScope[] {
  const lines = code.split('\n')

  switch (language) {
    case 'html':
      return parseHTMLScopes(lines)
    case 'css':
      return parseCSSScopes(lines)
    case 'javascript':
    case 'typescript':
      return parseJSScopes(lines)
    case 'python':
      return parsePythonScopes(lines)
    case 'java':
    case 'cpp':
    case 'php':
    case 'rust':
      return parseCStyleScopes(lines)
    case 'json':
      return parseJSONScopes(lines)
    default:
      return parseGenericScopes(lines)
  }
}

/**
 * Given a cursor line (0-indexed), return the chain of enclosing scopes.
 */
export function getEnclosingScopes(scopes: StickyScope[], cursorLine: number): StickyScope[] {
  const result: StickyScope[] = []
  for (const scope of scopes) {
    if (scope.line <= cursorLine && scope.endLine >= cursorLine) {
      result.push(scope)
    }
  }
  return result
}

// ===================== HTML =====================
function parseHTMLScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  const importantTags = new Set([
    'html', 'head', 'body', 'header', 'footer', 'nav', 'main',
    'section', 'article', 'aside', 'div', 'form', 'table',
    'ul', 'ol', 'script', 'style',
  ])
  const selfClosing = new Set(['meta', 'link', 'br', 'hr', 'img', 'input'])

  // Simple depth tracking
  const stack: { tag: string; line: number; depth: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const tagMatches = [...trimmed.matchAll(/<\/?([\w-]+)/g)]

    for (const match of tagMatches) {
      const tag = match[1].toLowerCase()
      const isClosing = trimmed[match.index! + 1] === '/'

      if (!isClosing && importantTags.has(tag) && !selfClosing.has(tag)) {
        stack.push({ tag, line: i, depth: stack.length })
      } else if (isClosing) {
        // Find matching open tag
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].tag === tag) {
            const open = stack[j]
            scopes.push({
              name: `<${tag}>`,
              line: open.line,
              endLine: i,
              depth: open.depth,
              rawText: lines[open.line].trim(),
            })
            stack.splice(j, 1)
            break
          }
        }
      }
    }
  }

  // Close remaining unclosed tags
  for (const open of stack) {
    scopes.push({
      name: `<${open.tag}>`,
      line: open.line,
      endLine: lines.length - 1,
      depth: open.depth,
      rawText: lines[open.line].trim(),
    })
  }

  return scopes
}

// ===================== CSS =====================
function parseCSSScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  let scopeStart = -1
  let scopeName = ''
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    for (const ch of trimmed) {
      if (ch === '{') {
        if (braceDepth === 0) {
          scopeStart = i
          scopeName = trimmed.replace(/\{$/, '').trim() || 'anonymous'
        }
        braceDepth++
      } else if (ch === '}') {
        braceDepth--
        if (braceDepth === 0 && scopeStart >= 0) {
          scopes.push({
            name: scopeName,
            line: scopeStart,
            endLine: i,
            depth: 0,
            rawText: lines[scopeStart].trim(),
          })
          scopeStart = -1
        }
      }
    }
  }

  return scopes
}

// ===================== JavaScript / TypeScript =====================
function parseJSScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  // We use brace depth tracking paired with declaration detection
  const braceStack: { line: number; name: string; depth: number }[] = []
  let braceDepth = 0
  let lastDeclLine = -1
  let lastDeclName = ''

  // Track multi-line comments
  let inBlockComment = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Handle block comments
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false
      continue
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true
      continue
    }
    // Skip single-line comments
    if (trimmed.startsWith('//')) continue

    // Detect scope-starting declarations
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
    const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/)
    const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/)
    const ifMatch = trimmed.match(/^if\s*\(/)
    const forMatch = trimmed.match(/^for\s*\(/)
    const whileMatch = trimmed.match(/^while\s*\(/)
    const elseMatch = trimmed.match(/^else\s*\{?/)
    const tryMatch = trimmed.match(/^try\s*\{?/)
    const catchMatch = trimmed.match(/^catch\s*\(?/)
    const switchMatch = trimmed.match(/^switch\s*\(/)

    if (funcMatch) {
      lastDeclLine = i
      lastDeclName = `function ${funcMatch[1]}()`
    } else if (arrowMatch) {
      lastDeclLine = i
      lastDeclName = `${arrowMatch[1]}()`
    } else if (classMatch) {
      lastDeclLine = i
      lastDeclName = `class ${classMatch[1]}`
    } else if (ifMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    } else if (forMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    } else if (whileMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    } else if (elseMatch) {
      lastDeclLine = i
      lastDeclName = 'else'
    } else if (tryMatch) {
      lastDeclLine = i
      lastDeclName = 'try'
    } else if (catchMatch) {
      lastDeclLine = i
      lastDeclName = 'catch'
    } else if (switchMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    }

    // Count braces
    for (const ch of trimmed) {
      if (ch === '{') {
        if (lastDeclLine === i && lastDeclName) {
          braceStack.push({ line: i, name: lastDeclName, depth: braceDepth })
          lastDeclLine = -1
          lastDeclName = ''
        }
        braceDepth++
      } else if (ch === '}') {
        braceDepth--
        if (braceStack.length > 0) {
          const top = braceStack[braceStack.length - 1]
          if (top.depth === braceDepth) {
            braceStack.pop()
            scopes.push({
              name: top.name,
              line: top.line,
              endLine: i,
              depth: top.depth,
              rawText: lines[top.line].trim(),
            })
          }
        }
      }
    }
  }

  return scopes
}

// ===================== Python =====================
function parsePythonScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  const indentStack: { line: number; name: string; indent: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0

    // Detect scope-starting lines (ending with :)
    const classMatch = trimmed.match(/^class\s+(\w+)/)
    const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/)
    const ifMatch = trimmed.match(/^if\s+/)
    const forMatch = trimmed.match(/^for\s+/)
    const whileMatch = trimmed.match(/^while\s+/)
    const tryMatch = trimmed.match(/^try\s*:/)
    const exceptMatch = trimmed.match(/^except/)
    const withMatch = trimmed.match(/^with\s+/)

    const startsScope = trimmed.endsWith(':') && (
      classMatch || funcMatch || ifMatch || forMatch || whileMatch || tryMatch || exceptMatch || withMatch
    )

    if (startsScope) {
      const name = classMatch ? `class ${classMatch[1]}`
        : funcMatch ? `def ${funcMatch[1]}()`
        : trimmed.replace(/:\s*$/, '').trim()

      // Close any scopes with equal or greater indent
      while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= indent) {
        const closed = indentStack.pop()!
        scopes.push({
          name: closed.name,
          line: closed.line,
          endLine: i - 1,
          depth: closed.indent,
          rawText: lines[closed.line].trim(),
        })
      }

      indentStack.push({ line: i, name, indent })
    } else {
      // Close scopes with greater indent
      while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= indent) {
        const closed = indentStack.pop()!
        scopes.push({
          name: closed.name,
          line: closed.line,
          endLine: i - 1,
          depth: closed.indent,
          rawText: lines[closed.line].trim(),
        })
      }
    }
  }

  // Close remaining
  for (const open of indentStack) {
    scopes.push({
      name: open.name,
      line: open.line,
      endLine: lines.length - 1,
      depth: open.indent,
      rawText: lines[open.line].trim(),
    })
  }

  return scopes
}

// ===================== C-Style (Java, C++, PHP, Rust) =====================
function parseCStyleScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  const braceStack: { line: number; name: string; depth: number }[] = []
  let braceDepth = 0
  let lastDeclLine = -1
  let lastDeclName = ''
  let inBlockComment = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false
      continue
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true
      continue
    }
    if (trimmed.startsWith('//')) continue

    const classMatch = trimmed.match(/(?:class|struct|interface|enum)\s+(\w+)/)
    const funcMatch = trimmed.match(/(?:(?:public|private|protected|static|async|export)\s+)*[\w<>\[\],\s&*]+(\w+)\s*\([^)]*\)\s*[\{|:]/)
    const ifMatch = trimmed.match(/^if\s*\(/)
    const forMatch = trimmed.match(/^(?:for|loop)\s*\(/)
    const whileMatch = trimmed.match(/^while\s*\(/)

    if (classMatch && !trimmed.includes('(')) {
      lastDeclLine = i
      lastDeclName = `class ${classMatch[1]}`
    } else if (funcMatch && !classMatch) {
      lastDeclLine = i
      lastDeclName = `${funcMatch[1]}()`
    } else if (ifMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    } else if (forMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    } else if (whileMatch) {
      lastDeclLine = i
      lastDeclName = trimmed.replace(/\{$/, '').trim()
    }

    for (const ch of trimmed) {
      if (ch === '{') {
        if (lastDeclLine === i && lastDeclName) {
          braceStack.push({ line: i, name: lastDeclName, depth: braceDepth })
          lastDeclLine = -1
          lastDeclName = ''
        }
        braceDepth++
      } else if (ch === '}') {
        braceDepth--
        if (braceStack.length > 0 && braceStack[braceStack.length - 1].depth === braceDepth) {
          const top = braceStack.pop()!
          scopes.push({
            name: top.name,
            line: top.line,
            endLine: i,
            depth: top.depth,
            rawText: lines[top.line].trim(),
          })
        }
      }
    }
  }

  return scopes
}

// ===================== JSON =====================
function parseJSONScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []
  const stack: { line: number; name: string; depth: number }[] = []
  let depth = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    for (const ch of trimmed) {
      if (ch === '{') {
        const keyMatch = trimmed.match(/^"(\w[\w\s]*)"\s*:/)
        const name = keyMatch ? keyMatch[1] : `object`
        stack.push({ line: i, name, depth })
        depth++
      } else if (ch === '}') {
        depth--
        if (stack.length > 0 && stack[stack.length - 1].depth === depth) {
          const top = stack.pop()!
          scopes.push({
            name: top.name,
            line: top.line,
            endLine: i,
            depth: top.depth,
            rawText: lines[top.line].trim(),
          })
        }
      }
    }
  }

  return scopes
}

// ===================== Generic (Markdown, SQL, etc.) =====================
function parseGenericScopes(lines: string[]): StickyScope[] {
  const scopes: StickyScope[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.match(/^#{1,6}\s+/)) {
      scopes.push({
        name: trimmed,
        line: i,
        endLine: i,
        depth: 0,
        rawText: trimmed,
      })
    }
  }

  return scopes
}
