import './globals.css'
import { ReactNode } from 'react'
import Header from '../components/Header'
import GAListener from './analytics/GAListener' // importa il listener

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-900 text-gray-100">
        {/* GA Listener */}
        <GAListener />
        <Header />
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
