import './globals.css'

export const metadata = {
  title: 'Gerador de Código IA - Construa Apps com IA',
  description: 'Gere aplicações full-stack usando IA - React, Node.js, MongoDB. Inspirado no Lovable.dev',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}