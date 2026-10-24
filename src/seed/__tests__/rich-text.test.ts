import { describe, expect, it } from 'vitest'

import { richText } from '../lib/rich-text'

describe('richText', () => {
  it.each([
    ['ar', 'rtl'],
    ['en', 'ltr'],
  ] as const)(
    'creates schema-complete %s Lexical content with %s direction',
    (locale, direction) => {
      expect(richText('Seed text', locale)).toEqual({
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Seed text',
                  type: 'text',
                  version: 1,
                },
              ],
              direction,
              format: '',
              indent: 0,
              textFormat: 0,
              textStyle: '',
              type: 'paragraph',
              version: 1,
            },
          ],
          direction,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      })
    },
  )
})
