import type React from 'react'

interface SkipLinksProps {
  links?: Array<{
    href: string
    label: string
  }>
}

const defaultLinks = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#search', label: 'Skip to search' },
  { href: '#footer', label: 'Skip to footer' },
]

export const SkipLinks: React.FC<SkipLinksProps> = ({ links = defaultLinks }) => {
  return (
    <div className="skip-links" role="navigation" aria-label="Skip links">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="skip-links__link"
          onClick={e => {
            e.preventDefault()
            const target = document.querySelector(link.href)
            if (target) {
              target.focus()
              target.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default SkipLinks
