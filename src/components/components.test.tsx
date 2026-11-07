import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { labels } from '../labels'
import { Sheet } from './Sheet'
import { ToastProvider, useToast } from './Toast'

function SheetHarness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <Sheet
      open={open}
      title="Nouveau projet"
      onClose={() => setOpen(false)}
      confirmLabel="OK"
      onConfirm={onConfirm}
    >
      <input aria-label="Nom" />
    </Sheet>
  )
}

describe('Sheet', () => {
  it('s’ouvre avec son titre, met le focus sur le premier champ, se ferme avec Annuler', async () => {
    render(<SheetHarness />)
    expect(screen.getByRole('dialog', { name: 'Nouveau projet' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: labels.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('se ferme avec Échap ou la croix ; le bouton d’action appelle onConfirm', async () => {
    const onConfirm = vi.fn()
    render(<SheetHarness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

function ToastButton() {
  const toast = useToast()
  return <button onClick={() => toast('Tâche archivée')}>go</button>
}

describe('Toast', () => {
  it('affiche le message puis le retire après 2,2 s', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastButton />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'go' }).click())
    expect(screen.getByRole('status')).toHaveTextContent('Tâche archivée')
    act(() => vi.advanceTimersByTime(2300))
    expect(screen.queryByRole('status')).toBeNull()
    vi.useRealTimers()
  })
})
