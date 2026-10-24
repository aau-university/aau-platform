// Tailwind 3 + Autoprefixer. The public CSS is scoped via the `content` array
// in tailwind.config.ts so it does NOT bleed into Payload's admin UI styles.
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
