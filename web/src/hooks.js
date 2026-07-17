import { useEffect, useRef, useState } from 'react'

const reduced = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Anima un número desde su valor previo hasta `target` (easing suave). Respeta prefers-reduced-motion.
export function useCountUp(target, duration = 900) {
  const to = Number(target) || 0
  const [val, setVal] = useState(reduced ? to : 0)
  const fromRef = useRef(reduced ? to : 0)

  useEffect(() => {
    if (reduced) { setVal(to); fromRef.current = to; return }
    const from = fromRef.current
    let start = null
    let raf
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / duration)
      setVal(from + (to - from) * ease(p))
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration])

  return val
}
