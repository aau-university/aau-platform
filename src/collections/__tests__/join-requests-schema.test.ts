import { describe, expect, it } from 'vitest'

import { JoinRequests } from '../JoinRequests'

describe('JoinRequests submission reconciliation schema', () => {
  it('keeps the submission key optional, hidden, unique, and indexed', () => {
    const field = JoinRequests.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'submissionKey',
    )

    expect(field).toMatchObject({
      admin: { hidden: true, readOnly: true },
      index: true,
      name: 'submissionKey',
      type: 'text',
      unique: true,
    })
    expect(field).not.toHaveProperty('required')
  })
})
