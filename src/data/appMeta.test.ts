import { describe, expect, it } from 'vitest'
import { APP_ICONS, APP_IDS, APP_TITLES } from './appMeta'

describe('appMeta', () => {
  it('has a title and icon for every app id', () => {
    for (const id of APP_IDS) {
      expect(APP_TITLES[id], id).toBeTruthy()
      expect(APP_ICONS[id], id).toBeTruthy()
    }
  })

  it('includes the file explorer', () => {
    expect(APP_IDS).toContain('files')
  })
})
