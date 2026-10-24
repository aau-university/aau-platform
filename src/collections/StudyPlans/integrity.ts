import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { relationshipId } from '../../access'

export const deriveStudyPlanCollege: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const original = originalDoc as Record<string, unknown> | undefined
  const programValue = data.academicProgram ?? original?.academicProgram
  const programId = relationshipId(programValue)

  if (programId === undefined) {
    if (operation === 'create') {
      throw new APIError('An academic program is required.', 400)
    }
    return data
  }

  const program = await req.payload.findByID({
    collection: 'academic-programs',
    depth: 0,
    id: programId,
    req,
  })
  const programCollegeId = relationshipId(program.college)

  if (programCollegeId === undefined) {
    throw new APIError('The selected academic program is not assigned to a college.', 400)
  }

  if (Object.prototype.hasOwnProperty.call(data, 'college')) {
    const explicitCollegeId = relationshipId(data.college)
    if (
      explicitCollegeId !== undefined &&
      String(explicitCollegeId) !== String(programCollegeId)
    ) {
      throw new APIError('The study plan college must match the academic program college.', 400)
    }
  }

  data.college = programCollegeId
  return data
}
