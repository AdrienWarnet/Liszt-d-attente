// Choix du thème (lot 2) : préférence d'affichage, gardée dans le navigateur.
// Le script en tête de index.html applique le choix avant le premier affichage.

export type ThemeChoice = 'auto' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'piano.theme'

/** Couleur de la barre d'état Android pour chaque thème. */
const THEME_COLOR = { light: '#2E5E4E', dark: '#161B19' } as const

export function getThemeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'auto') delete root.dataset.theme
  else root.dataset.theme = choice

  // Deux balises theme-color (clair / sombre) : en automatique chacune garde sa couleur.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = (meta.getAttribute('media') ?? '').includes('dark') ? 'dark' : 'light'
    meta.content = THEME_COLOR[choice === 'auto' ? own : choice]
  })
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // Stockage indisponible : le choix vaut pour cette ouverture seulement.
  }
  applyTheme(choice)
}
