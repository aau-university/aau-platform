import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

describe('getPublicStudentAffairsDocuments', () => {
  beforeEach(() => {
    find.mockReset()
  })

  it('returns a localized public DTO without private file metadata', async () => {
    find.mockResolvedValueOnce({
      docs: [
        {
          id: 7,
          title: 'Student Regulations',
          fileComingSoon: false,
          file: {
            id: 91,
            filename: 'secret-regulations.pdf',
            mimeType: 'application/pdf',
            prefix: 'private-media',
            url: '/api/private-media/file/secret-regulations.pdf',
          },
        },
        {
          id: 8,
          title: 'Exam Rules',
          fileComingSoon: true,
          file: null,
        },
      ],
    })

    const { getPublicStudentAffairsDocuments } =
      await import('../get-public-student-affairs-documents')
    const result = await getPublicStudentAffairsDocuments({ locale: 'en' })

    expect(result).toEqual([
      {
        id: '7',
        title: 'Student Regulations',
        fileComingSoon: false,
        downloadUrl: '/api/public/student-affairs-documents/7/download',
      },
      {
        id: '8',
        title: 'Exam Rules',
        fileComingSoon: true,
        downloadUrl: null,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('secret-regulations.pdf')
    expect(JSON.stringify(result)).not.toContain('private-media')
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'student-affairs-documents',
        locale: 'en',
        depth: 0,
        draft: false,
        overrideAccess: false,
        select: {
          title: true,
          fileComingSoon: true,
          file: true,
        },
        where: { _status: { equals: 'published' } },
      }),
    )
  })

  it('returns an empty list when Payload is unavailable', async () => {
    const safePayload = await import('../safe-payload')
    vi.mocked(safePayload.getPayloadSafe).mockResolvedValueOnce(null)
    const { getPublicStudentAffairsDocuments } =
      await import('../get-public-student-affairs-documents')

    await expect(getPublicStudentAffairsDocuments({ locale: 'ar' })).resolves.toEqual([])
  })
})
