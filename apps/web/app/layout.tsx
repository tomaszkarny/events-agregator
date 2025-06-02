import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Agregator Wydarzeń dla Dzieci',
  description: 'Znajdź najlepsze wydarzenia dla Twojego dziecka',
}

import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}