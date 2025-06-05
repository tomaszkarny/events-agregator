import toast, { Toaster } from 'react-hot-toast'

// Add custom toast.info method
const toastWithInfo = Object.assign(toast, {
  info: (message: string) => toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#3B82F6',
      color: '#fff',
    },
  }),
})

export { toastWithInfo as toast, Toaster }

// Custom toast styles
export const toastOptions = {
  success: {
    duration: 4000,
    style: {
      background: '#10B981',
      color: '#fff',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  },
  error: {
    duration: 5000,
    style: {
      background: '#EF4444',
      color: '#fff',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  },
}