import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sans `globals: true`, Testing Library ne démonte pas l'écran tout seul entre deux tests.
afterEach(() => cleanup())
