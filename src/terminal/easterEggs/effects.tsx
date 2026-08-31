import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

/* A Matrix rain, scoped to the terminal content area (never the whole page).
   ESC or a click exits. Under prefers-reduced-motion it shows a static panel
   instead of the animation. All frames + listeners are cleaned up on unmount. */
export function MatrixRain({ onExit }: { onExit: () => void }) {
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  useEffect(() => {
    if (reduce) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const FONT = 14
    const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトﾊﾋﾌﾍﾎ0123456789:.=*+-<>|'
    let drops: number[] = []

    const resize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      drops = new Array(Math.max(1, Math.ceil(canvas.width / FONT)))
        .fill(0)
        .map(() => Math.floor(Math.random() * -40))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    let raf = 0
    let previous = 0
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame)
      if (time - previous < 55) return
      previous = time

      context.fillStyle = 'rgba(11, 16, 32, 0.28)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.font = `${FONT}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const x = i * FONT
        const y = drops[i] * FONT
        context.fillStyle = '#c9ffe3'
        context.fillText(char, x, y)
        context.fillStyle = 'rgba(47, 227, 126, 0.6)'
        context.fillText(char, x, y - FONT)
        if (y > canvas.height && Math.random() > 0.97) drops[i] = 0
        else drops[i] += 1
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [reduce])

  return (
    <div
      role="presentation"
      onClick={onExit}
      className="absolute inset-0 z-10 cursor-pointer bg-[var(--tb,#0b1020)]"
    >
      {reduce ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center font-mono text-xs">
          <pre className="leading-tight text-[#2fe37e]">{'アイウエオ\n0110  1001\nﾊﾋﾌﾍﾎ'}</pre>
          <p className="text-desk-muted">Reduced-motion mode — picture it raining.</p>
          <p className="text-desk-muted">Press ESC or click to exit.</p>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="h-full w-full" />
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10px] text-desk-muted">
            ESC to exit
          </p>
        </>
      )}
    </div>
  )
}

/* A short confetti burst inside the terminal. Non-interactive, self-dismisses,
   and renders nothing under prefers-reduced-motion. */
export function PartyBurst({ onExit }: { onExit: () => void }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    const timer = window.setTimeout(onExit, reduce ? 300 : 2400)
    return () => clearTimeout(timer)
  }, [onExit, reduce])

  if (reduce) return null

  const bits = ['🎉', '✨', '🎊', '⭐', '💫', '🎈', '🥳']
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className="party-bit absolute text-lg"
          style={{ left: `${(i * 47) % 100}%`, animationDelay: `${(i % 5) * 0.16}s` }}
        >
          {bits[i % bits.length]}
        </span>
      ))}
    </div>
  )
}
