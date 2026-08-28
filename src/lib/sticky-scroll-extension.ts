import { type EditorView } from '@codemirror/view'
import { parseStickyScopes, getEnclosingScopes, type StickyScope } from './sticky-scope-parser'

/**
 * Inject sticky scroll CSS once into the document head.
 */
export function injectStickyScrollCSS() {
  if (typeof document === 'undefined') return
  const id = 'nc-sticky-scroll-css'
  if (document.getElementById(id)) return

  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    .nc-sticky-bar {
      position: absolute;
      top: 0;
      left: 40px;
      right: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      pointer-events: auto;
      max-height: 84px;
    }

    .nc-sticky-item {
      display: flex;
      align-items: center;
      height: 28px;
      padding: 0 12px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      border: none;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background-color 0.15s;
      width: 100%;
      box-sizing: border-box;
    }

    .nc-sticky-item.nc-dark {
      color: #a1a1aa;
      background-color: #27272a;
      border-bottom: 1px solid #3f3f46;
    }
    .nc-sticky-item.nc-dark:hover {
      color: #e4e4e7;
      background-color: #323236;
    }

    .nc-sticky-item.nc-light {
      color: #71717a;
      background-color: #f4f4f5;
      border-bottom: 1px solid #e4e4e7;
    }
    .nc-sticky-item.nc-light:hover {
      color: #3f3f46;
      background-color: #e4e4e7;
    }

    .nc-sticky-shadow-dark {
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .nc-sticky-shadow-light {
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
  `
  document.head.appendChild(style)
}

/**
 * Get the top visible line (0-indexed) from the editor viewport,
 * accounting for the sticky bar height at the top.
 */
function getTopVisibleLine(view: EditorView, stickyBarHeight: number): number {
  // We use the contentAtHeight approach: find what position
  // is at the top of the visible area (below the sticky bar)
  const y = stickyBarHeight + 2
  const pos = view.posAtCoords({ x: 50, y })
  if (pos == null) return 0
  return view.state.doc.lineAt(pos).number - 1
}

/**
 * Compute which scopes should be shown as sticky headers.
 * Only scopes whose start line has scrolled ABOVE the viewport.
 */
function computeStickyScopes(
  code: string,
  language: string,
  topLine: number,
): StickyScope[] {
  const scopes = parseStickyScopes(code, language)
  const enclosing = getEnclosingScopes(scopes, topLine)
  // Only show scopes whose declaration line is above the viewport
  const sticky = enclosing.filter(s => s.line < topLine)
  // Show max 3, prefer innermost (last in list)
  return sticky.slice(-3)
}

/**
 * Attach a sticky scroll overlay to the editor's DOM.
 * Returns a cleanup function.
 */
export function attachStickyScroll(
  view: EditorView,
  language: string,
  isDark: boolean,
): () => void {
  const scroller = view.scrollDOM
  if (!scroller) return () => {}

  // Ensure the scroller has position relative for absolute positioning
  const parent = scroller.parentElement
  if (parent) {
    parent.style.position = 'relative'
  }

  // Create the sticky bar container
  const bar = document.createElement('div')
  bar.className = 'nc-sticky-bar'
  scroller.appendChild(bar)

  let rafId = 0
  let lastScopesKey = ''

  function update() {
    const stickyBarHeight = bar.offsetHeight || 0
    const code = view.state.doc.toString()
    const topLine = getTopVisibleLine(view, stickyBarHeight)
    const scopes = computeStickyScopes(code, language, topLine)

    // Build a cache key to avoid unnecessary DOM updates
    const key = scopes.map(s => `${s.line}:${s.name}`).join('|')
    if (key === lastScopesKey) return
    lastScopesKey = key

    // Update bar content
    bar.innerHTML = ''
    bar.className = `nc-sticky-bar ${scopes.length > 0 ? (isDark ? 'nc-sticky-shadow-dark' : 'nc-sticky-shadow-light') : ''}`

    for (const scope of scopes) {
      const item = document.createElement('button')
      item.className = `nc-sticky-item ${isDark ? 'nc-dark' : 'nc-light'}`
      item.textContent = scope.name
      item.title = `Dòng ${scope.line + 1}`
      item.addEventListener('click', () => {
        const lineInfo = view.state.doc.line(scope.line + 1)
        view.dispatch({
          selection: { anchor: lineInfo.from },
        })
        view.focus()
      })
      bar.appendChild(item)
    }
  }

  function onScroll() {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(update)
  }

  scroller.addEventListener('scroll', onScroll, { passive: true })

  // Initial render
  update()

  // Cleanup
  return () => {
    cancelAnimationFrame(rafId)
    scroller.removeEventListener('scroll', onScroll)
    bar.remove()
  }
}
