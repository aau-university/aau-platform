import type { CollectionConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '../AcademicDepartments'
import { AcademicPrograms } from '../AcademicPrograms'
import { Colleges } from '../Colleges'
import { ContactMessages } from '../ContactMessages'
import { FacultyMembers } from '../FacultyMembers'
import { FAQs } from '../FAQs'
import { JoinRequests } from '../JoinRequests'
import { Media } from '../Media'
import { NavigationMenus } from '../NavigationMenus'
import { News } from '../News'
import { Pages } from '../Pages'
import { Roles } from '../Roles'
import { Users } from '../Users'
import { Events } from '../Events'
import { BlogPosts } from '../BlogPosts'
import { EmailRequests } from '../EmailRequests'
import { TeamMembers } from '../TeamMembers'

const phaseOneCollections: CollectionConfig[] = [
  Users,
  Roles,
  Media,
  Pages,
  NavigationMenus,
  News,
  Colleges,
  AcademicDepartments,
  AcademicPrograms,
  FacultyMembers,
  ContactMessages,
  JoinRequests,
  Events,
  BlogPosts,
  FAQs,
  EmailRequests,
  TeamMembers,
]

describe('Phase 1.5 collection access', () => {
  it('defines explicit create/read/update/delete access for every collection', () => {
    for (const collection of phaseOneCollections) {
      expect(collection.access, `${collection.slug} access`).toMatchObject({
        create: expect.any(Function),
        read: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      })
    }
  })
})
