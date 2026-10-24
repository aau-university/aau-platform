/**
 * Convert a Payload richText value into plain text.
 *
 * Payload v3 ships Lexical by default. A Lexical document is a JSON
 * tree:
 *
 *   {
 *     root: {
 *       children: [
 *         { type: 'paragraph', children: [{ type: 'text', text: '…' }] },
 *         ...
 *       ]
 *     }
 *   }
 *
 * Other shapes we accept gracefully:
 *   - plain string,
 *   - null / undefined,
 *   - an array of nodes (no root wrapper),
 *   - a single text leaf,
 *   - a partial/legacy Slate-style structure,
 *   - completely malformed input.
 *
 * Block-level siblings (paragraph, heading, list item, …) are joined
 * with `\n`. Inline children of a single block are concatenated with
 * a single space if neither side already provides one — this way text
 * leaves split across formatting marks ("Welcome", " to AAU") collapse
 * to "Welcome to AAU" without double-spacing.
 *
 * Always returns a string. Never throws. Returns `""` for anything that
 * doesn't carry textual content.
 */

const MAX_OUTPUT_LENGTH = 50_000
const MAX_DEPTH = 32

interface TextLike {
  text?: unknown
  children?: unknown
  type?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

/**
 * Walk a node and append inline text leaves into `inlineAcc`. Block-
 * level boundaries push a `\n` separator. The two-list approach lets
 * us preserve paragraph breaks without inserting them between every
 * formatting span.
 */
function walk(node: unknown, depth: number, out: string[], inlineSeparator: string): void {
  if (depth > MAX_DEPTH) return
  if (node === null || node === undefined) return

  if (typeof node === 'string') {
    if (node) out.push(node + inlineSeparator)
    return
  }

  if (Array.isArray(node)) {
    // Treat each entry as a block — push a newline separator after each.
    for (const child of node) {
      walk(child, depth + 1, out, '')
      out.push('\n')
    }
    return
  }

  if (!isObject(node)) return

  const candidate = node as TextLike

  // Text leaf.
  if (typeof candidate.text === 'string') {
    if (candidate.text) out.push(candidate.text + inlineSeparator)
    return
  }
  if (typeof candidate.text === 'number' || typeof candidate.text === 'boolean') {
    out.push(String(candidate.text) + inlineSeparator)
    return
  }

  // Root wrapper.
  if (isObject((node as { root?: unknown }).root)) {
    walk((node as { root: unknown }).root, depth + 1, out, inlineSeparator)
    return
  }

  // Node with children — treat the children list as block-level entries,
  // separated by newlines IF this node is a block container, else by
  // the configured inline separator. We can't perfectly tell, but the
  // safest rule is: a node WITH children is itself a container. If its
  // own children are inline leaves they'll fall through the `text` branch
  // above and not introduce a newline. We push a newline between sibling
  // children only at the array boundary above; here we just recurse.
  if (Array.isArray(candidate.children)) {
    // We walk children with a single space inline-separator so adjacent
    // text leaves join with a space (e.g. ['Welcome', ' to AAU'] →
    // 'Welcome to AAU' after final whitespace collapse).
    for (const child of candidate.children as unknown[]) {
      walk(child, depth + 1, out, ' ')
    }
    out.push('\n')
  }
}

/**
 * Public API: convert a Payload richText value (string, Lexical tree,
 * Slate tree, …) into a plain string. Always returns a string.
 */
export function richTextToPlainText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return ''

  const out: string[] = []
  walk(value, 0, out, ' ')

  // Collapse:
  //   1. multiple consecutive spaces inside a line,
  //   2. all consecutive-newline runs to a single `\n` (Lexical never
  //      asks for a literal blank line; preserving them adds noise).
  const collapsed = out
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()

  if (collapsed.length > MAX_OUTPUT_LENGTH) return collapsed.slice(0, MAX_OUTPUT_LENGTH)
  return collapsed
}
