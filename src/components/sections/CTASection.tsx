import { Fragment } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import type { CTALayoutBlock } from '@/blocks/types'

export interface CTASectionProps {
  block: CTALayoutBlock
  disableInnerContainer?: boolean
}

export function CTASection({ block, disableInnerContainer = false }: CTASectionProps) {
  const Wrapper = disableInnerContainer ? Fragment : Container
  return (
    <section className="py-12 bg-primary text-primary-foreground">
      <Wrapper>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-display font-bold">{block.heading}</h2>
          <p className="mt-4 text-white/75">{block.description}</p>
          {block.buttonHref && (
            <Link
              href={block.buttonHref}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-6 font-bold text-primary"
            >
              {block.buttonLabel}
            </Link>
          )}
        </div>
      </Wrapper>
    </section>
  )
}
