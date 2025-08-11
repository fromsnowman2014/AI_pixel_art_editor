import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'PixelBuddy - AI Pixel Art Studio for Kids',
  description: 'A kids-friendly AI-assisted pixel art and GIF studio. Create amazing pixel art and animations with the power of AI!',
  keywords: ['pixel art', 'gif', 'kids', 'ai', 'drawing', 'animation'],
  authors: [{ name: 'PixelBuddy Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  robots: 'index, follow',
  openGraph: {
    title: 'PixelBuddy - AI Pixel Art Studio for Kids',
    description: 'Create amazing pixel art and animations with AI assistance!',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}