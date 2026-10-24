import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicFormSuccess } from '../PublicFormSuccess'

const props = {
  title: 'Request submitted',
  message: 'We will contact you shortly.',
  resetLabel: 'Submit another request',
}

afterEach(cleanup)

describe('<PublicFormSuccess />', () => {
  it('announces the prelocalized success content', () => {
    render(<PublicFormSuccess {...props} onReset={vi.fn()} />)

    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toContain(props.title)
    expect(status.textContent).toContain(props.message)
  })

  it('forwards the focusable status root ref and focuses it on mount', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<PublicFormSuccess ref={ref} {...props} onReset={vi.fn()} />)

    const status = screen.getByRole('status')
    expect(ref.current).toBe(status)
    expect(status.getAttribute('tabindex')).toBe('-1')
    await waitFor(() => expect(document.activeElement).toBe(status))
  })

  it('calls the reset handler', () => {
    const onReset = vi.fn()
    render(<PublicFormSuccess {...props} onReset={onReset} />)

    fireEvent.click(screen.getByRole('button', { name: props.resetLabel }))

    expect(onReset).toHaveBeenCalledOnce()
  })
})
