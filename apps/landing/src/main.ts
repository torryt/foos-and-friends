import './index.css'

// Reveal-on-scroll is opt-in via the `js` class so content is never hidden
// when scripts don't run; prefers-reduced-motion is handled in CSS.
document.documentElement.classList.add('js')

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
