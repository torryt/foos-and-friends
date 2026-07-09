import './index.css'

// Reveal-on-scroll is opt-in via the `js` class so content is never hidden
// when scripts don't run; prefers-reduced-motion is handled in CSS.
document.documentElement.classList.add('js')

// --- Appearance (light / dark / system) ---------------------------------
// index.html resolves the theme pre-paint from the same storage key; from
// here on this module owns it.
type Appearance = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ff-appearance'
const systemDark = matchMedia('(prefers-color-scheme: dark)')
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-appearance]')

const storedAppearance = (): Appearance => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

const applyAppearance = (appearance: Appearance) => {
  const dark = appearance === 'system' ? systemDark.matches : appearance === 'dark'
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'

  // The app screenshots pick light/dark via <source media>; rewrite the
  // condition so they follow the switcher instead of only the OS.
  const media =
    appearance === 'system'
      ? '(prefers-color-scheme: dark)'
      : appearance === 'dark'
        ? 'all'
        : 'not all'
  for (const source of document.querySelectorAll<HTMLSourceElement>('picture > source')) {
    source.media = media
  }

  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.appearance === appearance))
  }
}

applyAppearance(storedAppearance())

for (const button of buttons) {
  button.addEventListener('click', () => {
    const appearance = button.dataset.appearance as Appearance
    if (appearance === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, appearance)
    }
    applyAppearance(appearance)
  })
}

systemDark.addEventListener('change', () => {
  if (storedAppearance() === 'system') applyAppearance('system')
})

// --- Reveal on scroll ----------------------------------------------------
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px' },
)

for (const el of document.querySelectorAll('.reveal')) {
  observer.observe(el)
}
