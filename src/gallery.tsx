import { useEffect, useState } from 'react'

// Bundled style + fabric galleries. Photos ship in public/gallery/ rather than
// being hotlinked, so they work on a weak signal or with no connection at all.
// BASE_URL keeps them resolving under the /better-tailor-mvp/ GitHub Pages base.

export type Style = { id: string; name: string; image: string }
export type Fabric = { id: string; name: string; image: string }

const img = (path: string) => `${import.meta.env.BASE_URL}gallery/${path}`

export const STYLES: Style[] = [
  { id: 'agbada', name: 'Agbada', image: img('styles/agbada.jpg') },
  { id: 'senator', name: 'Senator', image: img('styles/senator.jpg') },
  { id: 'kaftan', name: 'Kaftan', image: img('styles/kaftan.jpg') },
  { id: 'dashiki', name: 'Dashiki', image: img('styles/dashiki.jpg') },
  { id: 'shirt', name: 'Shirt', image: img('styles/shirt.jpg') },
  { id: 'trouser', name: 'Trouser', image: img('styles/trouser.jpg') },
  { id: 'suit', name: '2-pc Suit', image: img('styles/suit.jpg') },
  { id: 'gown', name: 'Gown', image: img('styles/gown.jpg') },
]

export const FABRICS: Fabric[] = [
  { id: 'adire-indigo', name: 'Adire indigo', image: img('fabrics/adire-indigo.jpg') },
  { id: 'ankara-sunset', name: 'Ankara sunset', image: img('fabrics/ankara-sunset.jpg') },
  { id: 'kente-gold', name: 'Kente gold', image: img('fabrics/kente-gold.jpg') },
  { id: 'ankara-teal', name: 'Ankara teal', image: img('fabrics/ankara-teal.jpg') },
  { id: 'wax-purple', name: 'Wax purple', image: img('fabrics/wax-purple.jpg') },
  { id: 'aso-oke-red', name: 'Aso-oke red', image: img('fabrics/aso-oke-red.jpg') },
]

function SmartImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  // Images are local now, but an order saved before a gallery change can still
  // point at a missing file. Retry once, then fall back to a neutral tile
  // rather than letting a broken image break the card layout.
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setAttempt(0)
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`bg-card2 grid place-items-center text-ink/20 ${className}`} role="img" aria-label={alt}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <circle cx="8.8" cy="10" r="1.6" />
          <path d="m4 16.5 4.4-4.2 3.4 3.3 3-2.4L20 17.4" />
        </svg>
      </div>
    )
  }

  return (
    <img
      key={attempt}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (attempt === 0) setTimeout(() => setAttempt(1), 700)
        else setFailed(true)
      }}
      className={`object-cover bg-card2 ${className}`}
    />
  )
}

export function StyleImage({ styleId, className }: { styleId: string; className?: string }) {
  const s = STYLES.find((x) => x.id === styleId)
  return <SmartImage src={s?.image} alt={s?.name ?? 'style'} className={className} />
}

export function FabricImage({ fabricId, className }: { fabricId: string; className?: string }) {
  const f = FABRICS.find((x) => x.id === fabricId)
  return <SmartImage src={f?.image} alt={f?.name ?? 'fabric'} className={className} />
}

export const styleName = (id: string) => STYLES.find((s) => s.id === id)?.name ?? 'Style'
export const fabricName = (id: string) => FABRICS.find((f) => f.id === id)?.name ?? 'Fabric'
