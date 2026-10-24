import { commitTransaction, initTransaction, killTransaction } from 'payload'
import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

describe('Payload transaction helpers', () => {
  it('starts, commits, and rolls back against a fake database adapter', async () => {
    const db = {
      beginTransaction: vi
        .fn()
        .mockResolvedValueOnce('commit-transaction')
        .mockResolvedValueOnce('rollback-transaction'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    }
    const commitReq = { payload: { db } }
    const commitPayloadReq = commitReq as unknown as PayloadRequest

    await expect(initTransaction(commitPayloadReq)).resolves.toBe(true)
    expect(commitReq).toHaveProperty('transactionID', 'commit-transaction')
    await commitTransaction(commitPayloadReq)
    expect(db.commitTransaction).toHaveBeenCalledWith('commit-transaction')
    expect(commitReq).not.toHaveProperty('transactionID')

    const rollbackReq = { payload: { db } }
    const rollbackPayloadReq = rollbackReq as unknown as PayloadRequest
    await expect(initTransaction(rollbackPayloadReq)).resolves.toBe(true)
    await killTransaction(rollbackPayloadReq)
    expect(db.rollbackTransaction).toHaveBeenCalledWith('rollback-transaction')
    expect(rollbackReq).not.toHaveProperty('transactionID')
  })
})
