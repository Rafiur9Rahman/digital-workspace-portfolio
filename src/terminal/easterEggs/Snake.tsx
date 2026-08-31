import { useEffect, useRef, useState } from 'react'
import { loadPrefs, savePrefs } from '../prefs'

const COLS = 24
const ROWS = 16
const CELL = 18
const SPEED_MS = 115
const FOOD_COUNT = 3
const BONUS_CHANCE = 0.28 // odds a new food is worth 3 instead of 1

interface Cell {
  x: number
  y: number
}

interface Food extends Cell {
  value: 1 | 3
}

/* A small Snake, scoped to the terminal content area. Several pieces of food on
   the board at once; the blue ones are worth 3, the red ones 1, picked at
   random. Arrows / WASD to steer, Space to restart, Esc to quit. High score
   persists in ws-terminal-prefs-v1. rAF loop + key listener cleaned up on
   unmount. */
export function Snake({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadPrefs().snakeBest)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const context = el.getContext('2d')
    if (!context) return
    // Re-bind with non-nullable types so the hoisted helpers below see them.
    const canvas: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = context

    canvas.width = COLS * CELL
    canvas.height = ROWS * CELL

    const START: Cell[] = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ]

    let snake: Cell[] = START.map((c) => ({ ...c }))
    let dir: Cell = { x: 1, y: 0 }
    let queued: Cell = dir
    let foods: Food[] = []
    let alive = true
    let points = 0

    function occupied(x: number, y: number): boolean {
      return (
        snake.some((s) => s.x === x && s.y === y) ||
        foods.some((f) => f.x === x && f.y === y)
      )
    }

    function topUpFood() {
      let guard = 0
      while (foods.length < FOOD_COUNT && guard++ < 300) {
        const x = Math.floor(Math.random() * COLS)
        const y = Math.floor(Math.random() * ROWS)
        if (!occupied(x, y)) {
          foods.push({ x, y, value: Math.random() < BONUS_CHANCE ? 3 : 1 })
        }
      }
    }

    function restart() {
      snake = START.map((c) => ({ ...c }))
      dir = { x: 1, y: 0 }
      queued = dir
      foods = []
      topUpFood()
      alive = true
      points = 0
      setScore(0)
      setDead(false)
    }

    topUpFood()

    const TURNS: Record<string, Cell> = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    }

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'escape') {
        onExit()
        return
      }
      if (!alive && (key === ' ' || key === 'enter')) {
        e.preventDefault()
        restart()
        return
      }
      const turn = TURNS[key]
      if (turn && !(turn.x === -dir.x && turn.y === -dir.y)) {
        queued = turn
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)

    function step() {
      dir = queued
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
      const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS
      const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y)
      if (hitWall || hitSelf) {
        alive = false
        setDead(true)
        if (points > loadPrefs().snakeBest) {
          savePrefs({ snakeBest: points })
          setBest(points)
        }
        return
      }
      snake.unshift(head)
      const eaten = foods.findIndex((f) => f.x === head.x && f.y === head.y)
      if (eaten !== -1) {
        points += foods[eaten].value
        setScore(points)
        foods.splice(eaten, 1)
        topUpFood()
      } else {
        snake.pop()
      }
    }

    function draw() {
      const css = getComputedStyle(canvas)
      const dim = css.getPropertyValue('--td').trim() || '#8b97b8'
      const ok = css.getPropertyValue('--tk').trim() || '#34d399'
      const err = css.getPropertyValue('--te').trim() || '#f87171'
      const accent = css.getPropertyValue('--ta').trim() || '#7aa2f7'
      const fg = css.getPropertyValue('--tf').trim() || '#d7dcef'
      const bg = css.getPropertyValue('--tb').trim() || '#0b1020'

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const f of foods) {
        if (f.value === 3) {
          ctx.fillStyle = accent
          ctx.fillRect(f.x * CELL + 2, f.y * CELL + 2, CELL - 4, CELL - 4)
          ctx.fillStyle = fg
          ctx.fillRect(f.x * CELL + 6, f.y * CELL + 6, CELL - 12, CELL - 12)
        } else {
          ctx.fillStyle = err
          ctx.fillRect(f.x * CELL + 3, f.y * CELL + 3, CELL - 6, CELL - 6)
        }
      }

      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? ok : dim
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    let raf = 0
    let acc = 0
    let last = performance.now()
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      acc += t - last
      last = t
      if (acc >= SPEED_MS) {
        acc = 0
        if (alive) step()
      }
      draw()
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onExit])

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--tb,#0b1020)] font-mono"
      role="presentation"
    >
      <div className="flex gap-6 text-xs text-[var(--td)]">
        <span>score {score}</span>
        <span>best {best}</span>
      </div>
      <canvas ref={canvasRef} className="rounded border border-white/10" />
      <p className="text-[11px] text-[var(--td)]">
        {dead
          ? 'game over. Space to restart · Esc to quit'
          : 'arrows / wasd to steer · blue food = 3 · Esc to quit'}
      </p>
    </div>
  )
}
