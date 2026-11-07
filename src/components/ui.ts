// Classes des éléments récurrents du proto (boutons, puces, cartes…).

export const ui = {
  primary:
    'w-full rounded-[14px] bg-ink p-[15px] font-bold text-screen disabled:cursor-default disabled:opacity-35',
  secondary:
    'w-full rounded-[14px] border-[1.5px] border-dashed border-line p-[14px] font-semibold text-muted',
  ghost: 'rounded-[14px] border border-line p-[15px] font-bold',
  link: 'min-h-11 py-2.5 text-left text-sm font-semibold text-felt',
  chip: 'min-h-11 rounded-full border border-line px-3.5 text-[13px] font-semibold',
  chipDanger:
    'min-h-11 rounded-full border border-current px-3.5 text-[13px] font-semibold text-danger',
  card: 'mb-3 rounded-2xl border border-line px-4 py-3',
  input: 'w-full rounded-[10px] border border-line bg-screen px-3 py-2.5',
  label: 'mt-[18px] mb-1.5 block text-[13px] font-semibold text-muted',
  fact: 'mt-1 text-[13px] leading-snug text-muted',
  crumb: 'text-xs text-muted',
  iconButton: 'grid size-11 shrink-0 place-items-center rounded-full text-muted',
} as const

/** Classe de fond Tailwind pour une couleur de projet (`c0` … `c5`). */
export const projectBg = {
  c0: 'bg-c0',
  c1: 'bg-c1',
  c2: 'bg-c2',
  c3: 'bg-c3',
  c4: 'bg-c4',
  c5: 'bg-c5',
} as const
