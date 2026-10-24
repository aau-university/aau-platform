import Image from 'next/image'

import logo from '@/assets/university-logo-white.png'

/**
 * `AdminLogo` — replaces the default Payload wordmark on the admin login
 * screen (registered via `admin.components.graphics.Logo`). Renders the
 * official university logo (white variant, extracted from the brand PDF:
 * gold AAU shield with the bilingual name in white), so it sits on the
 * university's black-and-gold panel — the white lettering would be
 * invisible directly on the light login background.
 */
export const AdminLogo = () => (
  <div
    style={{
      alignItems: 'center',
      background: '#0d0d0d',
      borderRadius: '1rem',
      display: 'flex',
      justifyContent: 'center',
      padding: '1.5rem 2.5rem',
    }}
  >
    <Image
      alt="جامعة الجيل الجديد — AL JEEL AL JADEED UNIVERSITY"
      height={190}
      priority
      src={logo}
      style={{ height: 190, objectFit: 'contain', width: 'auto' }}
    />
  </div>
)

export default AdminLogo
