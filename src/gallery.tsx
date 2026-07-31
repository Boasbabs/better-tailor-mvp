import { useEffect, useState } from 'react'

// Bundled style + fabric galleries. Photos are hotlinked from their sources,
// so every render goes through SmartImage, which falls back to a neutral tile
// if a host blocks us or the phone is offline.

export type Style = { id: string; name: string; image: string }
export type Fabric = { id: string; name: string; image: string }

export const STYLES: Style[] = [
  {
    id: 'agbada',
    name: 'Agbada',
    image: 'https://i.pinimg.com/736x/58/ba/01/58ba0131cf1ae3d77cb18572b559ef9a.jpg',
  },
  {
    id: 'senator',
    name: 'Senator',
    image: 'https://i.pinimg.com/1200x/a7/a5/77/a7a5770e4353d1b24f2479b067cabec9.jpg',
  },
  {
    id: 'kaftan',
    name: 'Kaftan',
    image: 'https://www.tradtrims.com/cdn/shop/files/DSC08667_-_Resize_900x.jpg?v=1774711071',
  },
  {
    id: 'dashiki',
    name: 'Dashiki',
    image: 'https://i.pinimg.com/736x/21/d2/47/21d247ac55f69b98e204a0ccd55e2475.jpg',
  },
  {
    id: 'shirt',
    name: 'Shirt',
    image: 'https://cdn2.propercloth.com/pic_cs/343259_fea3529b71eb8afbfa963d24d5e28838_size6.jpg',
  },
  {
    id: 'trouser',
    name: 'Trouser',
    image: 'https://cdn2.propercloth.com/pic_tccp/c5d66128592d5e30eda85755c1363fb2_sizemax.jpg',
  },
  {
    id: 'suit',
    name: '2-pc Suit',
    image:
      'https://www.mysuittailor.com/cdn/shop/files/royal_blue_suit_4415ca86-d663-4a7d-b28d-b24bfd2fdae5.jpg?v=1752140888&width=600',
  },
  {
    id: 'gown',
    name: 'Gown',
    image: 'https://www.jovani.com/wp-content/uploads/47812-brown-2.jpg',
  },
]

export const FABRICS: Fabric[] = [
  {
    id: 'adire-indigo',
    name: 'Adire indigo',
    image: 'https://i.pinimg.com/736x/d7/c1/2c/d7c12c297505574e35de1066a98db4e8.jpg',
  },
  {
    id: 'ankara-sunset',
    name: 'Ankara sunset',
    image: 'https://i.pinimg.com/736x/d4/42/92/d44292d4daaadb6ba2e5f09fbbad9f38.jpg',
  },
  {
    id: 'kente-gold',
    name: 'Kente gold',
    image: 'https://i.pinimg.com/736x/a3/e2/c6/a3e2c6336cb259c8c55ef409a6d18991.jpg',
  },
  {
    id: 'ankara-teal',
    name: 'Ankara teal',
    image: 'https://i.pinimg.com/736x/03/2d/38/032d3864e33bdcf0d95ec8e03963978d.jpg',
  },
  {
    id: 'wax-purple',
    name: 'Wax purple',
    image: 'https://i.pinimg.com/736x/66/a3/c0/66a3c01969ec557e5ac052765355ffb0.jpg',
  },
  {
    id: 'aso-oke-red',
    name: 'Aso-oke red',
    image: 'https://i.pinimg.com/1200x/c3/b3/b7/c3b3b73f00a1657563517899d350e2c3.jpg',
  },
]

function SmartImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  // Hotlinked images fail transiently (rate limits, flaky signal). Retry once
  // before giving up, otherwise one blip leaves a placeholder for the session.
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
      // some hosts block hotlinks by referrer; sending none loads more often
      referrerPolicy="no-referrer"
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
