import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'
import { labels } from './labels'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const title = () => screen.getByRole('heading', { level: 1 })
const nav = () => screen.getByRole('navigation', { name: labels.mainNavigation })
const activeTab = () =>
  within(nav())
    .getAllByRole('link')
    .find((l) => l.getAttribute('aria-current') === 'page')

describe('navigation', () => {
  it("l'app démarre sur l'écran Session", () => {
    render(<App />)
    expect(title()).toHaveTextContent(labels.tabs.session)
  })

  it('affiche les 5 onglets dans l’ordre', () => {
    renderAt('/')
    expect(
      within(nav())
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Session', 'Semaine', 'Projets', 'Bilan', 'Plus'])
  })

  it.each([
    ['/', 'Session'],
    ['/semaine', 'Semaine'],
    ['/projets', 'Projets'],
    ['/bilan', 'Bilan'],
    ['/plus', 'Plus'],
  ])('%s affiche le titre « %s » et met son onglet en évidence', (path, name) => {
    renderAt(path)
    expect(title()).toHaveTextContent(name)
    expect(activeTab()).toHaveTextContent(name)
  })

  it('un tap sur un onglet change d’écran', async () => {
    const router = renderAt('/')
    await userEvent.click(within(nav()).getByRole('link', { name: 'Bilan' }))
    expect(title()).toHaveTextContent('Bilan')
    expect(router.state.location.pathname).toBe('/bilan')
  })

  it('Plus → Sauvegarde ouvre l’écran Sauvegarde, onglet Plus toujours actif', async () => {
    renderAt('/plus')
    await userEvent.click(screen.getByRole('link', { name: labels.more.backup }))
    expect(title()).toHaveTextContent(labels.more.backup)
    expect(activeTab()).toHaveTextContent('Plus')
  })

  it('Plus affiche la version de l’app', () => {
    renderAt('/plus')
    expect(screen.getByText(labels.more.about)).toBeInTheDocument()
    expect(screen.getByText(`${labels.more.version} ${__APP_VERSION__}`)).toBeInTheDocument()
  })

  it('une adresse inconnue ramène à Session', () => {
    renderAt('/nimporte-quoi')
    expect(title()).toHaveTextContent('Session')
  })

  it('la zone du bandeau de chrono est vide (donc masquée), et absente de l’onglet Session', () => {
    renderAt('/bilan')
    expect(document.querySelector('[data-slot="chrono-banner"]')).toBeEmptyDOMElement()
    cleanup()
    renderAt('/')
    expect(document.querySelector('[data-slot="chrono-banner"]')).toBeNull()
  })

  it('un sous-écran a un bouton retour ; ouvert directement, il ramène à son parent', async () => {
    const router = renderAt('/plus/sauvegarde')
    expect(screen.queryByRole('button', { name: labels.common.back })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    expect(router.state.location.pathname).toBe('/plus')
    expect(screen.queryByRole('button', { name: labels.common.back })).toBeNull()
  })

  it('le retour revient à l’écran précédent dans l’historique', async () => {
    const router = renderAt('/plus')
    await userEvent.click(screen.getByRole('link', { name: labels.more.backup }))
    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    expect(router.state.location.pathname).toBe('/plus')
  })
})
