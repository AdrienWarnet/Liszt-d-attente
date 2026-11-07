// Tous les textes affichés de l'app. Aucun libellé en dur dans les composants.

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)

export const labels = {
  appName: 'Piano',
  appFullName: 'Piano — suivi de travail',
  /** Affiché à la place d'une valeur absente (`null`). */
  emptyValue: '—',
  /** Préfixe du libellé de semaine : « Semaine du 9 nov. ». */
  weekOf: 'Semaine du',

  /** Onglets de la barre du bas = titres des écrans. */
  tabs: {
    session: 'Session',
    week: 'Semaine',
    projects: 'Projets',
    review: 'Bilan',
    more: 'Plus',
  },
  mainNavigation: 'Navigation principale',

  common: {
    back: 'Retour',
    close: 'Fermer',
    cancel: 'Annuler',
    save: 'Enregistrer',
  },

  more: {
    backup: 'Sauvegarde',
    about: 'À propos',
    version: 'Version',
    theme: 'Thème',
    themes: { auto: 'Automatique', light: 'Clair', dark: 'Sombre' },
  },

  projects: {
    newProject: '+ Nouveau projet',
    newTitle: 'Nouveau projet',
    editTitle: 'Modifier le projet',
    name: 'Nom',
    namePlaceholder: 'Un morceau, le déchiffrage…',
    startDate: 'Date de début (facultative)',
    endDate: 'Date de fin (facultative)',
    empty: 'Aucun projet. Crée ton premier projet (un morceau, le déchiffrage…).',
    since: (date: string) => `depuis le ${date}`,
    sinceTitle: (date: string) => `Depuis le ${date}`,
    until: (date: string) => `jusqu'au ${date}`,
    noStart: 'Sans date de début',
    activeTasks: (n: number) => `${n} ${plural(n, 'tâche active', 'tâches actives')}`,
    notFound: 'Ce projet n’existe pas ou a été supprimé.',
    // Détail
    edit: 'Modifier',
    planning: 'Planning',
    report: 'Bilan du projet',
    delete: 'Supprimer',
    deleteTitle: (name: string) => `Supprimer « ${name} » ?`,
    deleteText:
      'Le projet, ses sections et ses tâches disparaîtront de tes listes. Le temps déjà passé reste compté dans tes bilans.',
    deleted: 'Projet supprimé',
    noSection: 'Commence par créer une section, puis ajoute ses tâches.',
    progressPlaceholder: 'Avancement : où en est cette section ?',
    progressLabel: (section: string) => `Avancement de ${section}`,
    addTask: '+ Ajouter une tâche',
    addTaskLabel: (section: string) => `Ajouter une tâche à ${section}`,
    newSection: '+ Nouvelle section',
    editTask: (label: string) => `Modifier la tâche ${label}`,
    // Archivage
    archive: 'Archiver',
    reactivate: 'Réactiver',
    archivedTasks: (n: number) => `Tâches archivées (${n})`,
    taskArchived: 'Tâche archivée',
    taskReactivated: 'Tâche réactivée',
    reviewLink: 'Revue de semaine',
  },

  review: {
    title: 'Revue de semaine',
    subtitle: 'Archive, ajoute, mets à jour l’avancement',
    hint: 'À droite : temps réel de la semaine.',
    archiveSelection: (n: number) => `Archiver la sélection (${n})`,
    archived: (n: number) => `${n} ${plural(n, 'tâche archivée', 'tâches archivées')}`,
    empty: 'Aucun projet pour l’instant.',
  },

  gap: {
    budget: { above: 'au-dessus du budget', below: 'sous le budget', even: 'pile dans le budget' },
    planned: { above: 'au-dessus du prévu', below: 'sous le prévu', even: 'pile dans le prévu' },
  },

  duration: {
    invalid: 'Durée non comprise : écris 45 ou 1:30',
  },

  week: {
    previous: 'Semaine précédente',
    next: 'Semaine suivante',
    progress: 'Avancement',
    enterBudget: 'Saisis ton budget jour par jour ci-dessous.',
    real: (gap: string) => `Réel ${gap}`,
    dailyBudgets: 'Budget de chaque jour',
    today: 'aujourd’hui',
    dayLine: (real: string, taskCount: number) =>
      taskCount > 0
        ? `Réel ${real} · ${taskCount} ${plural(taskCount, 'tâche', 'tâches')}`
        : `Réel ${real}`,
    dayDetail: (day: string) => `Détail du ${day}`,
    budgetOf: (day: string) => `Budget du ${day}`,
    weekBudget: 'Budget de la semaine',
    plannedByProject: 'Temps prévu par projet',
    plannedOf: (project: string) => `Temps prévu ${project}`,
    projectReal: (real: string) => `Réel ${real}`,
    plannedTotal: 'Total prévu',
    weekBudgetSmall: (budget: string) => `Budget de la semaine ${budget}`,
    ofTheWeek: (gap: string) => `${gap} de la semaine`,
    review: 'Revue de semaine',
  },

  day: {
    budget: 'Budget',
    real: 'Réel',
    plannedTasks: 'Tâches prévues',
    noPlannedTasks: 'Aucune tâche prévue ce jour.',
    planTasks: '+ Prévoir des tâches',
    planTitle: (day: string) => `Prévoir ${day}`,
    planned: (duration: string) => `Prévu ${duration}`,
    plannedOf: (task: string) => `Temps prévu ${task}`,
    unplan: (task: string) => `Retirer ${task}`,
    archived: '(archivée)',
    deleted: '(supprimé)',
    keyLabel: (day: string) => `Voir le ${day}`,
  },

  session: {
    start: 'Démarrer une session',
    startHint: 'Chronomètre tes tâches une par une',
    plannedToday: 'Prévu aujourd’hui',
    noPlannedToday: 'Aucune tâche prévue aujourd’hui.',
    manualAdd: 'Ajout manuel',
    history: 'Historique',
    addTasks: '+ Ajouter des tâches',
    addTasksTitle: 'Ajouter des tâches',
    addToSession: 'Ajouter à la session',
    createTask: 'Créer une tâche',
    sectionRequired: 'Section (obligatoire)',
    taskLabelPlaceholder: 'Libellé de la tâche',
    newTaskLabel: 'Libellé de la nouvelle tâche',
    chooseSection: 'Choisis une section pour la nouvelle tâche',
    empty: 'Ajoute les tâches que tu vas travailler.',
    startedAt: (time: string) => `Session démarrée à ${time}`,
    taskCount: (n: number) => `${n} ${plural(n, 'tâche', 'tâches')}`,
    total: 'Durée totale de la session',
    play: (task: string) => `Lancer ${task}`,
    pause: (task: string) => `Pause ${task}`,
    end: 'Terminer la session',
    endTitle: 'Terminer la session ?',
    endText: (total: string) => `Durée totale ${total}. Le chrono en cours sera arrêté.`,
    endConfirm: 'Terminer',
    saved: 'Session enregistrée',
  },

  banner: {
    paused: 'Session en cours · en pause',
    pause: 'Pause',
    resume: 'Reprendre',
    open: 'Ouvrir la session',
  },

  history: {
    title: 'Historique',
    subtitle: 'Sessions et ajouts manuels',
    inProgress: 'en cours',
    when: (day: string, time: string) => `${day} · ${time}`,
    path: (project: string, section: string) => `${project} › ${section}`,
    manualTag: 'Ajout manuel',
    corrected: '(corrigée)',
    correctHint: 'Modifie une durée pour la corriger (oubli d’arrêt du chrono).',
    correctLabel: (task: string) => `Durée de ${task}`,
    undoCorrection: (task: string) => `Annuler la correction de ${task}`,
    correctedToast: 'Durée corrigée',
    empty: 'Aucune session pour l’instant.',
    link: 'Historique des sessions',
  },

  manual: {
    title: 'Ajout manuel',
    subtitle: 'Une durée oubliée, sans heures',
    task: 'Tâche',
    chooseTask: 'Choisir une tâche',
    day: 'Jour',
    duration: 'Durée',
    durationPlaceholder: 'ex. 45 ou 1:30',
    add: 'Ajouter',
    added: 'Ajout manuel enregistré',
    errChooseTask: 'Choisis une tâche',
    errDuration: 'Indique une durée, par exemple 45 ou 1:30',
    recent: 'Derniers ajouts manuels',
    none: 'Aucun ajout manuel.',
    remove: (task: string) => `Supprimer l’ajout manuel ${task}`,
  },

  planning: {
    title: 'Planning',
    initial: 'Prévu initial',
    revised: 'Prévu revu',
    rowInitial: 'initial',
    rowRevised: 'revu',
    rowToPlace: 'à placer',
    hint: 'Touche une case pour placer ou retirer une semaine. Le premier placement d’une section est gardé comme prévu initial.',
    firstPlacement: 'Premier placement gardé comme prévu initial',
    progress: 'Avancement',
    progressPlaceholder: 'Où en est cette section ?',
    changed: 'modifié',
    cell: (section: string, week: string, placed: boolean) =>
      `${section}, ${week}, ${placed ? 'placée' : 'vide'}`,
    initialCell: (section: string, week: string, placed: boolean) =>
      `${section}, prévu initial, ${week}, ${placed ? 'placée' : 'vide'}`,
  },

  errors: {
    nameRequired: 'Donne un nom au projet.',
    endBeforeStart: 'La date de fin doit être après la date de début.',
  },
} as const
