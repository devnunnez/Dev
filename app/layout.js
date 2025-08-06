import './globals.css'

export const metadata = {
  title: 'AI Code Generator - Build Apps with AI',
  description: 'Generate full-stack applications using AI - React, Node.js, MongoDB. Inspired by Lovable.dev',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}