import { readFileSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

/**
 * A bounded static module graph over FIRST-PARTY TypeScript source, and the
 * calls reachable through it.
 *
 * Two guards in this repository need the same thing and got it wrong in the
 * same way: they inspected the literal text of a few fixed root files, which
 * says nothing about a helper those roots import. Both are isolation proofs —
 * "the broad Seed is unreachable from the identity bootstrap", "the version
 * backfill is unreachable from startup" — and an isolation proof that only
 * reads the roots proves nothing about the thing it names.
 *
 * Deliberately NOT a general call-graph analyser. It answers one question:
 * starting from these roots, following static imports through project source
 * only, does any reachable module CALL this function? That is enough to catch
 * the realistic regression (someone adds a helper and wires it into startup)
 * without pretending to decide reachability in general.
 */

export interface ModuleGraph {
  /** Every reachable file, mapped to its source text. */
  readonly files: ReadonlyMap<string, string>
}

/**
 * Every STATIC module specifier a file depends on, read from the AST.
 *
 * Covers the four declaration forms TypeScript treats as static dependencies:
 * `import ... from 'x'`, side-effect `import 'x'`, `export ... from 'x'`, and
 * `import x = require('x')`. A literal `import('x')` is included too: it is an
 * expression rather than a declaration, but it still pulls the module into the
 * graph at runtime, which is what these guards care about.
 *
 * Regex got this wrong twice before. `[^'"\n]*` cannot cross a newline, so a
 * multiline import was invisible; a side-effect import has no `from` clause at
 * all; and `import x = require('x')` resembles neither. Every miss NARROWS the
 * graph, which is the unsafe direction for an isolation proof — the offending
 * file simply never gets looked at. A regex can also match import-shaped text
 * inside a comment or string literal, inventing edges. The parser has neither
 * problem.
 */
export function staticModuleSpecifiers(file: string, source: string): string[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const specifiers: string[] = []

  const take = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteral(node)) specifiers.push(node.text)
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      // `moduleSpecifier` is undefined for `export { a }` with no `from`.
      take(node.moduleSpecifier)
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        take(node.moduleReference.expression)
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      take(node.arguments[0])
    }
    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return specifiers
}

/** Resolve a specifier to a first-party file, or undefined if it leaves the project. */
export function resolveProjectImport(
  srcRoot: string,
  fromFile: string,
  specifier: string,
): string | undefined {
  let base: string
  if (specifier.startsWith('@/')) base = path.resolve(srcRoot, specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier)
  else return undefined // bare package specifier — outside the project graph

  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    try {
      readFileSync(candidate, 'utf8')
      return candidate
    } catch {
      continue
    }
  }
  return undefined
}

/** Walk the static import graph from one or more roots. */
export function buildModuleGraph(srcRoot: string, roots: readonly string[]): ModuleGraph {
  const files = new Map<string, string>()
  const queue = [...roots]

  while (queue.length > 0) {
    const file = queue.shift()!
    if (files.has(file)) continue

    let source: string
    try {
      source = readFileSync(file, 'utf8')
    } catch {
      continue // a root that does not exist is the caller's assertion to make
    }
    files.set(file, source)

    for (const specifier of staticModuleSpecifiers(file, source)) {
      const resolved = resolveProjectImport(srcRoot, file, specifier)
      if (resolved) queue.push(resolved)
    }
  }

  return { files }
}

/**
 * Files in the graph that CALL `functionName`, as `callExpression` nodes.
 *
 * An import is not a call: a module may import a function and never invoke it,
 * and reporting that as reachable would make the guard cry wolf until someone
 * stops reading it. Matches both a bare `fn(...)` and a qualified
 * `ns.fn(...)`.
 */
export function filesCalling(graph: ModuleGraph, functionName: string): string[] {
  const callers: string[] = []

  for (const [file, source] of graph.files) {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    let found = false

    const visit = (node: ts.Node): void => {
      if (found) return
      if (ts.isCallExpression(node)) {
        const callee = node.expression
        const name = ts.isIdentifier(callee)
          ? callee.text
          : ts.isPropertyAccessExpression(callee)
            ? callee.name.text
            : undefined
        if (name === functionName) {
          found = true
          return
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(parsed)
    if (found) callers.push(file)
  }

  return callers
}
