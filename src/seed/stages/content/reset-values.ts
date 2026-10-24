export const contentResetOnlyValues = {
  announcements: { image: null },
  'blog-posts': {
    author: null,
    authorAvatar: null,
    displayOrder: null,
    image: null,
    populatedAuthors: [] as [],
  },
  'campus-life': {
    image: null,
    publishedAt: null,
    sidebarNote: null,
    stats: [] as [],
  },
  centers: { image: null, publishedAt: null },
  events: { displayOrder: null, image: null },
  news: {
    author: null,
    featuredImage: null,
    image: null,
    populatedAuthors: [] as [],
  },
  offers: { college: null, image: null, publishedAt: null, validUntil: null },
  partners: { logo: null },
  projects: { image: null, images: [] as [], publishedAt: null },
  'research-publications': { image: null },
  'team-members': { image: null },
} as const
