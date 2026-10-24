import type { College } from '@/payload-types'

export type SeedLocale = 'ar' | 'en'

export function richText(
  text: string,
  locale: SeedLocale,
): NonNullable<College['description']> {
  const direction = locale === 'ar' ? 'rtl' : 'ltr'

  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
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
  }
}
