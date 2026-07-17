import { Star } from 'lucide-react'

// Estrellas de valoración (0–5, con media). size en px.
export function Stars({ value = 0, count, size = 14, showNumber = true }) {
  const v = Number(value) || 0
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex" aria-label={`${v} de 5`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, v - i)) // fracción rellena de esta estrella
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-border" strokeWidth={1.5} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="text-gold fill-gold" strokeWidth={1.5} />
              </span>
            </span>
          )
        })}
      </span>
      {showNumber && v > 0 && <span className="text-xs text-ink2 tabular-nums">{v.toFixed(1)}</span>}
      {count !== undefined && count > 0 && <span className="text-[11px] text-mut">({count})</span>}
    </span>
  )
}
