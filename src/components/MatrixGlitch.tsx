import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

/* Ambient "matrix spillage" behind the desktop - sparse transient character
   streams that spill down random columns and fade, plus the odd horizontal
   glitch tear. Deliberately faint: it's texture, not a screensaver. Sits below
   every window, is non-interactive, pauses when the tab is hidden, and renders
   a near-invisible static hint under prefers-reduced-motion. */

const GLYPHS =
  'アイウエオカキクケコサシスセソタチツテトﾊﾋﾌﾍﾎ0123456789<>[]{}/\\=*+-|:.'

interface Stream {
  x: number
  y: number
  speed: number
  len: number
  life: number
  maxLife: number
}

export function MatrixGlitch() {
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduce) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const FONT = 15
    let width = 0
    let height = 0
    const streams: Stream[] = []

    const resize = () => {
      width = canvas.width = canvas.clientWidth
      height = canvas.height = canvas.clientHeight
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const spawn = () => {
      const maxLife = 45 + Math.random() * 70
      streams.push({
        x: Math.floor((Math.random() * width) / FONT) * FONT,
        y: -Math.random() * 160,
        speed: FONT * (0.5 + Math.random() * 0.85),
        len: 5 + Math.floor(Math.random() * 13),
        life: maxLife,
        maxLife,
      })
    }

    let raf = 0
    let last = 0
    let hidden = document.hidden
    const onVisibility = () => {
      hidden = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)

    const frame = (time: number) => {
      raf = requestAnimationFrame(frame)
      if (hidden || time - last < 55) return
      last = time

      // erase a little of everything each frame -> soft trailing, canvas stays
      // transparent where nothing is drawn
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.font = `${FONT}px monospace`

      if (streams.length < 5 && Math.random() < 0.05) spawn()

      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i]
        s.y += s.speed
        s.life -= 1
        const fade =
          Math.min(1, s.life / 22) * Math.min(1, (s.maxLife - s.life) / 12)

        for (let j = 0; j < s.len; j++) {
          const cy = s.y - j * FONT
          if (cy < -FONT || cy > height) continue
          const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0]
          if (j === 0) {
            ctx.fillStyle = `rgba(190,255,215,${0.4 * fade})`
          } else {
            ctx.fillStyle = `rgba(47,227,126,${(1 - j / s.len) * 0.13 * fade})`
          }
          ctx.fillText(ch, s.x, cy)
        }

        if (s.life <= 0 || s.y - s.len * FONT > height) streams.splice(i, 1)
      }

      // rare horizontal glitch tear
      if (Math.random() < 0.005) {
        ctx.fillStyle = 'rgba(47,227,126,0.045)'
        ctx.fillRect(0, Math.random() * height, width, 2 + Math.random() * 6)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduce])

  if (reduce) {
    return (
      <pre
        aria-hidden
        className="pointer-events-none absolute right-[10%] top-0 font-mono text-[13px] leading-tight text-[#2fe37e] opacity-[0.035]"
      >
        {'ｱ\n1\nｳ\n0\nｵ\nﾊ\n1\nｾ\n0'}
      </pre>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
    />
  )
}
