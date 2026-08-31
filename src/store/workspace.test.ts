import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspace } from './workspace'
import { useWindows } from './windows'

beforeEach(() => {
  useWorkspace.setState({ power: 'booting' })
  useWindows.setState({ windows: [], topZ: 1 })
})

const power = () => useWorkspace.getState().power

describe('useWorkspace', () => {
  it('starts in the booting state', () => {
    expect(power()).toBe('booting')
  })

  it('powerOn lands on the running desktop', () => {
    useWorkspace.getState().powerOn()
    expect(power()).toBe('running')
  })

  it('shutdown enters the powered-off state', () => {
    useWorkspace.getState().powerOn()
    useWorkspace.getState().shutdown()
    expect(power()).toBe('shutdown')
  })

  it('reboot returns to booting and clears open windows', () => {
    useWorkspace.getState().powerOn()
    useWindows.getState().openApp('terminal')
    useWindows.getState().openApp('projects')

    useWorkspace.getState().reboot()

    expect(power()).toBe('booting')
    expect(useWindows.getState().windows).toEqual([])
  })

  it('reboot from shutdown also replays the boot sequence', () => {
    useWorkspace.getState().shutdown()
    useWorkspace.getState().reboot()
    expect(power()).toBe('booting')
  })
})
