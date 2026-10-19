import { t } from '@/shared/i18n'
// Loading state: the logo's shuco assembles itself piece by piece (keyframes in app/globals.css).
// With reduced motion the finished shuco is shown still.
const PIECES = [
  // Bun
  <><path d="M14 58c0-12 16-16 66-16s66 4 66 16c0 24-26 36-66 36S14 82 14 58z" fill="#E7A157" stroke="#7A3E14" strokeWidth="3" />
    <path d="M26 57c18-6 90-6 108 0" stroke="#F6CF8F" strokeWidth="7" strokeLinecap="round" fill="none" /></>,
  // Sausage
  <><rect x="20" y="44" width="120" height="20" rx="10" fill="#B4432A" stroke="#6E2414" strokeWidth="3" />
    <path d="M32 50h90" stroke="#D9714F" strokeWidth="3" strokeLinecap="round" /></>,
  // Cabbage
  <path d="M24 45q7-8 14 0t14 0 14 0 14 0 14 0 14 0 14 0 14 0" stroke="#C7E37A" strokeWidth="6" strokeLinecap="round" fill="none" />,
  // Tomato
  <g fill="#E2412B" stroke="#8E1F12" strokeWidth="2">{[40, 64, 92, 118].map(cx => <circle key={cx} cx={cx} cy="42" r="7" />)}</g>,
  // Guacamole
  <><path d="M30 40c4-14 22-16 30-8 6-10 26-10 32 0 8-8 28-6 34 6 2 8-6 10-14 8-12 4-52 4-68 2-10 0-16-2-14-8z" fill="#7DB83A" stroke="#3F6E1A" strokeWidth="2.5" />
    <g fill="#4F8A24">{[[52, 36], [78, 31], [100, 37], [66, 41]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2.2" />)}</g></>,
  // Ketchup and mustard
  <><path d="M36 33l10 8 10-9 10 8 10-9 10 8 10-9 10 8" stroke="#D62828" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M44 28l10 7 10-8 10 7 10-8 10 7" stroke="#F4B400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
]

export default function FoodLoader({ label = t('Cargando…'), size = 128, className = '' }: { label?: string; size?: number; className?: string }) {
  return <div role="status" className={`flex flex-col items-center justify-center gap-2 py-6 ${className}`}>
    <svg viewBox="0 0 160 110" width={size} height={Math.round(size * 110 / 160)} aria-hidden="true" className="overflow-visible">
      <ellipse cx="80" cy="102" rx="54" ry="6" fill="#173F35" opacity=".12" />
      <g className="food-pop"><g transform="rotate(-8 80 60)">
        {PIECES.map((piece, i) => <g key={i} className={`food-piece-${i}`}>{piece}</g>)}
      </g></g>
    </svg>
    <p className="text-sm font-medium text-[#173F35]">{label}</p>
  </div>
}
