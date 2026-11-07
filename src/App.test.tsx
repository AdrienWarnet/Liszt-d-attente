import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { labels } from './labels'

describe('App', () => {
  it("affiche le nom de l'app", () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: labels.appName })).toBeInTheDocument()
  })
})
