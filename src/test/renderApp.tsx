import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '../components/Toast'
import { db } from '../data/db'
import { routes } from '../routes'

/** Rend l'app à une adresse donnée, avec le vrai routage et les messages brefs. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  return router
}

export async function clearDb() {
  await Promise.all(db.tables.map((t) => t.clear()))
}
