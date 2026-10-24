import { Fragment } from 'react'
import { Container } from '@/components/ui/Container'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import type { RichTextLayoutBlock } from '@/blocks/types'

export interface RichTextSectionProps {
  block: RichTextLayoutBlock
  disableInnerContainer?: boolean
}

export function RichTextSection({ block, disableInnerContainer = false }: RichTextSectionProps) {
  const body = richTextToPlainText(block.content)
  const Wrapper = disableInnerContainer ? Fragment : Container
  if (!body && !block.heading) return null
  return (
    <section className="py-12 bg-background">
      <Wrapper>
        <div className="mx-auto max-w-3xl space-y-4">
          {block.heading && (
            <h2 className="text-3xl font-display font-bold">{block.heading}</h2>
          )}
          <div className="text-muted-foreground leading-8">
            <p>{body}</p>
          </div>
        </div>
      </Wrapper>
    </section>
  )
}
