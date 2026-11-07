import { createHashRouter, RouterProvider } from 'react-router'
import { ToastProvider } from './components/Toast'
import { routes } from './routes'

const router = createHashRouter(routes)

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
