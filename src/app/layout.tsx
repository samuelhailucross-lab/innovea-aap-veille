import type { Metadata } from 'next'
import { Instrument_Sans } from 'next/font/google'

const sans = Instrument_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Veille AAP MedTech — INNOVÉA',
  description: 'Calendrier des appels à projets MedTech FR & EU',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sans.variable}>
      <head>
        <style>{`
          :root {
            --petrol: #009999;
            --petrol-deep: #005F66;
            --petrol-tint: #E3F3F3;
            --ink: #17292B;
            --muted: #5A6E70;
            --line: #DCE4E5;
            --bg: #F3F6F6;
            --surface: #FFFFFF;
            --orange: #EC6602;
            --orange-text: #B34D00;
            --orange-tint: #FDF0E7;
          }
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: var(--font-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--ink);
            font-size: 15px;
            line-height: 1.55;
            -webkit-font-smoothing: antialiased;
          }
          a { color: inherit; }
          button { cursor: pointer; font-family: inherit; }
          input, select, textarea { font-family: inherit; }
          :focus-visible { outline: 2px solid var(--petrol); outline-offset: 2px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
