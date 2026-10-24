import Image from 'next/image'

import emblem from '@/assets/university-emblem.png'

/**
 * `AdminIcon` — replaces the default Payload icon in the admin panel's
 * navigation header (registered via `admin.components.graphics.Icon`).
 * Uses the gold AAU shield emblem (official brand PDF), which stays
 * legible on both light and dark admin themes.
 */
export const AdminIcon = () => (
  <span
    style={{
      display: 'block',
      height: 28,
      position: 'relative',
      width: 28,
    }}
  >
    <Image
      alt="جامعة الجيل الجديد"
      fill
      sizes="28px"
      src={emblem}
      style={{ objectFit: 'contain' }}
    />
  </span>
)

export default AdminIcon
