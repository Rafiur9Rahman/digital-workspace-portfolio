import { useEffect, useRef, useState } from 'react'
import { loadPrefs, savePrefs } from '../prefs'

const COLS = 24
const ROWS = 16
const CELL = 18
const SPEED_MS = 115

interface Cell {
  x: number
  y: number
}

/* A small Snake, scoped to the terminal content area. Arrows / WASD to steer,
   Space to restart, Esc to quit. High score persists in ws-terminal-prefs-v1.
   The rAF loop + key listener are cleaned up on unmount. */
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

    let snake: Cell[] = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ]
    let dir: Cell = { x: 1, y: 0 }
    let queued: Cell = dir
    let food = spawnFood()
    let alive = true
    let points = 0

    function spawnFood(): Cell {
      let f: Cell
      do {
        f = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        }
      } while (snake.some((s) => s.x === f.x && s.y === f.y))
      return f
    }

    function restart() {
      snake = [
        { x: 6, y: 8 },
        { x: 5, y: 8 },
        { x: 4, y: 8 },
      ]
      dir = { x: 1, y: 0 }
      queued = dir
      food = spawnFood()
      alive = true
      points = 0
      setScore(0)
      setDead(false)
    }

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
      if (head.x === food.x && head.y === food.y) {
        points += 1
        setScore(points)
        food = spawnFood()
      } else {
        snake.pop()
      }
    }

    function draw() {
      const css = getComputedStyle(canvas)
      const dim = css.getPropertyValue('--td').trim() || '#8b97b8'
      const ok = css.getPropertyValue('--tk').trim() || '#34d399'
      const err = css.getPropertyValue('--te').trim() || '#f87171'
      const bg = css.getPropertyValue('--tb').trim() || '#0b1020'

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = err
      ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6)
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
          ? 'game over - Space to restart · Esc to quit'
          : 'arrows / wasd to steer · Esc to quit'}
      </p>
    </div>
  )
}
