import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const VideoBlock: Block = {
  slug: 'video',
  labels: {
    singular: 'Video',
    plural: 'Video Blocks',
  },
  fields: [
    {
      name: 'videoFile',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'The video to play in the background or modal.',
      },
    },
    {
      name: 'posterImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional poster image before video plays.',
      },
    },
    localizedText('overlayTitle', { label: 'Overlay Title' }),
    localizedTextarea('overlayDescription', { label: 'Overlay Description' }),
  ],
}
