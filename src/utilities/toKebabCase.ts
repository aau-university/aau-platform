/**
 * Convert a string to kebab-case.
 *
 * Handles camelCase, PascalCase, snake_case, and whitespace separators.
 *
 * @example
 *   toKebabCase('camelCase')   // 'camel-case'
 *   toKebabCase('PascalCase')  // 'pascal-case'
 *   toKebabCase('snake_case')  // 'snake-case' (via spaces only — see note)
 *   toKebabCase('Hello World') // 'hello-world'
 */
export const toKebabCase = (value: string): string =>
  (value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

export default toKebabCase
