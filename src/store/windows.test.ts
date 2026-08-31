import { beforeEach, describe, expect, it } from 'vitest'
import { useWindows } from './windows'

const reset = () => useWindows.setState({ windows: [], topZ: 1 })
const state = () => useWindows.getState()
const maxZ = () => Math.max(...state().windows.map((w) => w.z))

beforeEach(reset)

describe('useWindows', () => {
  it('opens an app window', () => {
    state().openApp('terminal')
    expect(state().windows).toHaveLength(1)
    expect(state().windows[0]).toMatchObject({ appId: 'terminal', minimized: false, maximized: false })
  })

  it('does not duplicate an already-open app — it focuses it instead', () => {
    state().openApp('terminal')
    const terminalId = state().windows[0].id
    state().openApp('projects')
    state().openApp('terminal')

    expect(state().windows).toHaveLength(2)
    const terminal = state().windows.find((w) => w.appId === 'terminal')!
    expect(terminal.id).toBe(terminalId)
    expect(terminal.z).toBe(maxZ())
  })

  it('re-opening a minimized app un-minimizes and focuses it', () => {
    state().openApp('terminal')
    const id = state().windows[0].id
    state().minimize(id)
    expect(state().windows[0].minimized).toBe(true)

    state().openApp('terminal')
    expect(state().windows[0].minimized).toBe(false)
    expect(state().windows[0].z).toBe(maxZ())
  })

  it('focus raises a window above the rest', () => {
    state().openApp('about')
    state().openApp('projects')
    const about = state().windows.find((w) => w.appId === 'about')!
    expect(about.z).not.toBe(maxZ())

    state().focus(about.id)
    expect(state().windows.find((w) => w.id === about.id)!.z).toBe(maxZ())
  })

  it('close removes the window', () => {
    state().openApp('terminal')
    state().close(state().windows[0].id)
    expect(state().windows).toHaveLength(0)
  })

  it('closeAll clears every window', () => {
    state().openApp('terminal')
    state().openApp('projects')
    state().openApp('about')
    state().closeAll()
    expect(state().windows).toEqual([])
  })

  it('toggleMaximize fills the desktop then restores the previous bounds', () => {
    state().openApp('terminal')
    const id = state().windows[0].id
    state().move(id, 120, 90)
    state().resize(id, 400, 300)

    state().toggleMaximize(id, 1440, 900)
    let win = state().windows[0]
    expect(win.maximized).toBe(true)
    expect([win.x, win.y, win.width, win.height]).toEqual([0, 0, 1440, 900])

    state().toggleMaximize(id, 1440, 900)
    win = state().windows[0]
    expect(win.maximized).toBe(false)
    expect([win.x, win.y, win.width, win.height]).toEqual([120, 90, 400, 300])
  })

  it('stacks new windows with increasing z', () => {
    state().openApp('about')
    state().openApp('projects')
    state().openApp('terminal')
    const zs = state().windows.map((w) => w.z)
    expect(zs).toEqual([...zs].sort((a, b) => a - b))
    expect(new Set(zs).size).toBe(3)
  })
})
