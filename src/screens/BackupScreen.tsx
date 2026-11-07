import { useRef, useState } from 'react'
import { Screen } from '../components/Screen'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import {
  backupFileName,
  exportData,
  importData,
  lastExportText,
  markExported,
  validateImport,
  type BackupCheck,
} from '../data/backup'
import { formatDayLabel, toDay } from '../data/dates'
import { useLastExportAt } from '../data/hooks'
import { labels } from '../labels'

/** Partage le fichier (mail, Drive…) si le téléphone le permet, sinon le télécharge. */
async function shareOrDownload(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false // partage annulé
      throw e
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
  return true
}

interface Pending {
  name: string
  json: unknown
  check: Extract<BackupCheck, { ok: true }>
}

/** Écran Sauvegarde (proto `V.sauvegarde`, feuille `SH.restore`). */
export function BackupScreen() {
  const lastAt = useLastExportAt()
  const now = useNow(60_000)
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const doExport = async () => {
    const data = await exportData({ markExported: false })
    const file = new File([JSON.stringify(data)], backupFileName(data.exportedAt), {
      type: 'application/json',
    })
    if (await shareOrDownload(file)) {
      await markExported(data.exportedAt)
      toast(labels.backup.exported)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    let json: unknown = null
    try {
      json = JSON.parse(await file.text())
    } catch {
      // illisible : traité comme « pas une sauvegarde »
    }
    const check = validateImport(json)
    if (check.ok) setPending({ name: file.name, json, check })
    else
      toast(check.error === 'newerVersion' ? labels.backup.newerVersion : labels.backup.notBackup)
    if (input.current) input.current.value = ''
  }

  return (
    <Screen title={labels.more.backup} back="/plus">
      <p className={`${ui.fact} mb-4 text-sm`}>{labels.backup.intro}</p>
      <div className="flex items-center justify-between py-1.5">
        <span>{labels.backup.last}</span>
        <span className="font-semibold tabular-nums">{lastExportText(lastAt, now)}</span>
      </div>
      <button type="button" className={`${ui.primary} mt-3.5`} onClick={doExport}>
        {labels.backup.export}
      </button>
      <button
        type="button"
        className={`${ui.secondary} mt-2.5`}
        onClick={() => input.current?.click()}
      >
        {labels.backup.restore}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label={labels.backup.fileInput}
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {pending && (
        <Sheet
          open
          title={labels.backup.restoreTitle}
          onClose={() => setPending(null)}
          confirmLabel={labels.backup.confirm}
          onConfirm={async () => {
            await importData(pending.json)
            setPending(null)
            toast(labels.backup.restored)
          }}
        >
          <p className={`${ui.fact} text-[15px]`}>
            {labels.backup.chosenFile(pending.name)}
            <br />
            {labels.backup.summary(
              pending.check.counts.projects,
              pending.check.counts.tasks,
              pending.check.counts.sessions,
              formatDayLabel(toDay(pending.check.exportedAt)),
            )}
          </p>
          <p className={`${ui.fact} text-[15px]`}>{labels.backup.warning}</p>
        </Sheet>
      )}
    </Screen>
  )
}
