// Bundled style illustrations (12) + fabric swatches (10). All inline SVG so
// nothing needs uploading and html2canvas can rasterize them.

export type Style = { id: string; name: string }
export type Fabric = { id: string; name: string; bg: string; fg: string; kind: string }

export const STYLES: Style[] = [
  { id: 'agbada', name: 'Agbada' },
  { id: 'senator', name: 'Senator' },
  { id: 'kaftan', name: 'Kaftan' },
  { id: 'dashiki', name: 'Dashiki' },
  { id: 'shirt', name: 'Shirt' },
  { id: 'trouser', name: 'Trouser' },
  { id: 'suit', name: '2-pc Suit' },
  { id: 'gown', name: 'Gown' },
  { id: 'mermaid', name: 'Mermaid gown' },
  { id: 'blouse', name: 'Blouse' },
  { id: 'skirt', name: 'Skirt' },
  { id: 'jumpsuit', name: 'Jumpsuit' },
]

const STYLE_PATHS: Record<string, React.ReactNode> = {
  agbada: (
    <>
      <path d="M40 18 H60 L90 62 L81 70 L70 60 V102 H30 V60 L19 70 L10 62 Z" />
      <path d="M43 18 L50 32 L57 18" />
      <path d="M44 40 H56 M44 47 H56" />
    </>
  ),
  senator: (
    <>
      <path d="M38 16 H62 L72 28 L67 96 H33 L28 28 Z" />
      <path d="M45 16 Q50 22 55 16" />
      <path d="M46 16 L50 60" />
      <path d="M55 78 H63 M37 78 H45" />
    </>
  ),
  kaftan: (
    <>
      <path d="M37 16 H63 L74 30 L70 100 H30 L26 30 Z" />
      <path d="M44 16 L50 28 L56 16" />
      <path d="M50 28 V44" />
      <path d="M40 34 Q50 40 60 34" />
    </>
  ),
  dashiki: (
    <>
      <path d="M35 18 H65 L82 34 L74 46 L68 41 V88 H32 V41 L26 46 L18 34 Z" />
      <path d="M43 18 Q50 26 57 18" />
      <path d="M40 32 L44 38 L48 32 L52 38 L56 32 L60 38" />
      <path d="M40 74 L44 80 L48 74 L52 80 L56 74 L60 80" />
    </>
  ),
  shirt: (
    <>
      <path d="M35 20 H43 L50 27 L57 20 H65 L82 34 L74 47 L68 42 V92 H32 V42 L26 47 L18 34 Z" />
      <path d="M43 20 L50 34 L57 20" />
      <path d="M50 38 V86" strokeDasharray="2 5" />
    </>
  ),
  trouser: (
    <>
      <path d="M33 18 H67 L71 100 H55 L50 52 L45 100 H29 Z" />
      <path d="M33 26 H67" />
    </>
  ),
  suit: (
    <>
      <path d="M36 18 H64 L76 32 L70 42 L66 38 V92 H34 V38 L30 42 L24 32 Z" />
      <path d="M44 18 L50 40 L42 62 Z" />
      <path d="M56 18 L50 40 L58 62 Z" />
      <circle cx="50" cy="52" r="1.6" fill="#111" />
      <circle cx="50" cy="62" r="1.6" fill="#111" />
    </>
  ),
  gown: (
    <>
      <path d="M39 16 H61 L63 36 L58 54 L74 102 H26 L42 54 L37 36 Z" />
      <path d="M43 16 Q50 24 57 16" />
      <path d="M42 44 H58" />
    </>
  ),
  mermaid: (
    <>
      <path d="M40 14 H60 L62 34 L56 62 L56 76 Q72 86 68 104 H32 Q28 86 44 76 L44 62 L38 34 Z" />
      <path d="M44 14 Q50 21 56 14" />
    </>
  ),
  blouse: (
    <>
      <path d="M38 24 H62 L70 32 L66 66 H34 L30 32 Z" />
      <circle cx="33" cy="26" r="7" />
      <circle cx="67" cy="26" r="7" />
      <path d="M34 60 Q50 72 66 60 L68 70 Q50 82 32 70 Z" />
    </>
  ),
  skirt: (
    <>
      <path d="M36 34 H64 L76 98 H24 Z" />
      <path d="M36 40 H64" />
      <path d="M50 44 V94" strokeDasharray="2 5" />
    </>
  ),
  jumpsuit: (
    <>
      <path d="M38 16 H62 L66 52 L69 100 H54 L50 64 L46 100 H31 L34 52 Z" />
      <path d="M44 16 L50 26 L56 16" />
      <path d="M38 48 H62" />
    </>
  ),
}

export function StyleIcon({ styleId, className }: { styleId: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 118"
      className={className}
      fill="none"
      stroke="#111111"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {STYLE_PATHS[styleId] ?? STYLE_PATHS.shirt}
    </svg>
  )
}

export const FABRICS: Fabric[] = [
  { id: 'adire-indigo', name: 'Adire indigo', bg: '#1e3a8a', fg: '#e8ecf7', kind: 'circles' },
  { id: 'ankara-sunset', name: 'Ankara sunset', bg: '#c2410c', fg: '#fde68a', kind: 'triangles' },
  { id: 'kente-gold', name: 'Kente gold', bg: '#b45309', fg: '#111111', kind: 'stripes' },
  { id: 'ankara-teal', name: 'Ankara teal', bg: '#0f766e', fg: '#fef3c7', kind: 'diamonds' },
  { id: 'wax-purple', name: 'Wax purple', bg: '#6d28d9', fg: '#f5d0fe', kind: 'petals' },
  { id: 'aso-oke-red', name: 'Aso-oke red', bg: '#991b1b', fg: '#fbbf24', kind: 'lines' },
  { id: 'lace-white', name: 'Lace white', bg: '#f4f4f2', fg: '#c9c9c4', kind: 'dots' },
  { id: 'gingham-green', name: 'Gingham green', bg: '#14532d', fg: '#dcfce7', kind: 'grid' },
  { id: 'senator-navy', name: 'Senator navy', bg: '#1e2a4a', fg: '#33415f', kind: 'plain' },
  { id: 'plain-charcoal', name: 'Plain charcoal', bg: '#2b2b2b', fg: '#3d3d3d', kind: 'plain' },
]

function fabricPattern(f: Fabric) {
  switch (f.kind) {
    case 'circles':
      return (
        <>
          <circle cx="10" cy="10" r="5" fill="none" stroke={f.fg} strokeWidth="2" />
          <circle cx="30" cy="10" r="5" fill="none" stroke={f.fg} strokeWidth="2" />
          <circle cx="20" cy="25" r="5" fill="none" stroke={f.fg} strokeWidth="2" />
          <circle cx="0" cy="25" r="5" fill="none" stroke={f.fg} strokeWidth="2" />
          <circle cx="40" cy="25" r="5" fill="none" stroke={f.fg} strokeWidth="2" />
        </>
      )
    case 'triangles':
      return (
        <>
          <path d="M0 14 L7 0 L14 14 Z" fill={f.fg} />
          <path d="M20 14 L27 0 L34 14 Z" fill={f.fg} />
          <path d="M10 34 L17 20 L24 34 Z" fill={f.fg} />
          <path d="M30 34 L37 20 L44 34 Z" fill={f.fg} />
        </>
      )
    case 'stripes':
      return (
        <>
          <rect x="0" y="4" width="40" height="4" fill={f.fg} />
          <rect x="0" y="16" width="40" height="3" fill="#7f1d1d" />
          <rect x="0" y="26" width="40" height="4" fill="#14532d" />
          <rect x="0" y="35" width="40" height="2" fill={f.fg} />
        </>
      )
    case 'diamonds':
      return (
        <>
          <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke={f.fg} strokeWidth="2" />
          <path d="M30 22 L38 30 L30 38 L22 30 Z" fill="none" stroke={f.fg} strokeWidth="2" />
          <circle cx="30" cy="10" r="2" fill={f.fg} />
          <circle cx="10" cy="30" r="2" fill={f.fg} />
        </>
      )
    case 'petals':
      return (
        <>
          <path d="M10 4 Q16 10 10 16 Q4 10 10 4 Z" fill={f.fg} />
          <path d="M30 24 Q36 30 30 36 Q24 30 30 24 Z" fill={f.fg} />
          <circle cx="30" cy="10" r="3" fill="none" stroke={f.fg} strokeWidth="1.5" />
          <circle cx="10" cy="30" r="3" fill="none" stroke={f.fg} strokeWidth="1.5" />
        </>
      )
    case 'lines':
      return (
        <>
          <path d="M0 8 H40 M0 20 H40 M0 32 H40" stroke={f.fg} strokeWidth="2.5" />
          <path d="M0 14 H40 M0 26 H40" stroke="#fef3c7" strokeWidth="1" opacity="0.5" />
        </>
      )
    case 'dots':
      return (
        <>
          {[4, 14, 24, 34].flatMap((y, r) =>
            [4, 14, 24, 34].map((x) => (
              <circle key={`${x}-${y}`} cx={x + (r % 2 ? 5 : 0)} cy={y} r="1.8" fill={f.fg} />
            )),
          )}
        </>
      )
    case 'grid':
      return (
        <>
          <path d="M8 0 V40 M24 0 V40" stroke={f.fg} strokeWidth="3" opacity="0.6" />
          <path d="M0 8 H40 M0 24 H40" stroke={f.fg} strokeWidth="3" opacity="0.6" />
        </>
      )
    default:
      return <path d="M0 40 L40 0" stroke={f.fg} strokeWidth="10" opacity="0.35" />
  }
}

export function FabricSwatch({ fabricId, className }: { fabricId: string; className?: string }) {
  const f = FABRICS.find((x) => x.id === fabricId) ?? FABRICS[0]
  return (
    <svg viewBox="0 0 40 40" className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="40" height="40" fill={f.bg} />
      {fabricPattern(f)}
    </svg>
  )
}

export const styleName = (id: string) => STYLES.find((s) => s.id === id)?.name ?? 'Style'
export const fabricName = (id: string) => FABRICS.find((f) => f.id === id)?.name ?? 'Fabric'
