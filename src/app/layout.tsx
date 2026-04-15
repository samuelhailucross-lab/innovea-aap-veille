import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AAP MedTech — INNOVÉA Veille',
  description: 'Calendrier des appels à projets MedTech FR & EU',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #111827;
            font-size: 15px;
            line-height: 1.6;
          }
          a { color: inherit; }
          button { cursor: pointer; font-family: inherit; }
          input, select, textarea { font-family: inherit; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
