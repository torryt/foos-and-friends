import { defineConfig, loadEnv, type Plugin } from 'vite'

// The landing page is static; the only dynamic value is where the app lives.
// Set VITE_FOOS_APP_URL in the Cloudflare Pages project once the subdomain
// (e.g. https://foos.<domain>) exists.
const DEFAULT_APP_URL = 'https://foos-and-friends.pages.dev'

function injectAppUrl(appUrl: string): Plugin {
  return {
    name: 'inject-app-url',
    transformIndexHtml(html) {
      return html.replaceAll('%APP_URL%', appUrl)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [injectAppUrl(env.VITE_FOOS_APP_URL || DEFAULT_APP_URL)],
  }
})
