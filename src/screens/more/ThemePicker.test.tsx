import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { labels } from '../../labels'
import { clearDb, renderApp } from '../../test/renderApp'
import { THEME_STORAGE_KEY } from '../../theme'

beforeEach(async () => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.head.innerHTML =
    '<meta name="theme-color" content="#2E5E4E" media="(prefers-color-scheme: light)">' +
    '<meta name="theme-color" content="#161B19" media="(prefers-color-scheme: dark)">'
  await clearDb()
})

const metas = () =>
  [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content)

describe('Choix du thème (lot 2)', () => {
  it('Automatique par défaut ; Sombre puis Clair appliqués et mémorisés ; Automatique efface le choix', async () => {
    renderApp('/plus')
    const radio = (name: string) => screen.getByRole('radio', { name })
    expect(await screen.findByRole('radiogroup', { name: labels.more.theme })).toBeInTheDocument()
    expect(radio(labels.more.themes.auto)).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(radio(labels.more.themes.dark))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(metas()).toEqual(['#161B19', '#161B19'])
    expect(radio(labels.more.themes.dark)).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(radio(labels.more.themes.light))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(metas()).toEqual(['#2E5E4E', '#2E5E4E'])

    await userEvent.click(radio(labels.more.themes.auto))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(metas()).toEqual(['#2E5E4E', '#161B19'])
  })

  it('le choix enregistré est repris à la réouverture', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderApp('/plus')
    expect(await screen.findByRole('radio', { name: labels.more.themes.dark })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
