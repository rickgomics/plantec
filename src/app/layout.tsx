import type { Metadata } from 'next'
import { Big_Shoulders_Display, IBM_Plex_Mono, Work_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

// Fontes do Padrão Visual do Portal, via next/font — self-hosted no build,
// sem chamada ao Google Fonts em runtime. Viram variáveis CSS consumidas
// pelos tokens --pt-* em globals.css.
const fontDisplay = Big_Shoulders_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})
const fontBody = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})
const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Plantec BOM Builder',
  description: 'Gerador de Propostas Comerciais e BOM Técnica - Plantec Distribuidora',
}

// Blocking script — runs before first paint to avoid dark-mode flash
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("plantec-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`

// When served under a basePath (e.g. reverse-proxied at /plantecia/bom), Next.js
// doesn't auto-prefix raw fetch() calls to internal /api routes — only next/link,
// next/router and next/image get that treatment. This patches window.fetch so
// existing fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/...`) call sites keep working unmodified under the prefix.
// No-op (empty string) when NEXT_PUBLIC_BASE_PATH isn't set, so the default
// instance's behavior is untouched.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const FETCH_PATCH_SCRIPT = BASE_PATH
  ? `(function(){var b=${JSON.stringify(BASE_PATH)};var f=window.fetch.bind(window);window.fetch=function(input,init){if(typeof input==="string"&&input.charAt(0)==="/"&&input.indexOf(b)!==0){input=b+input;}return f(input,init);};})();`
  : ''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen">
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {FETCH_PATCH_SCRIPT && (
          // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
          <script dangerouslySetInnerHTML={{ __html: FETCH_PATCH_SCRIPT }} />
        )}
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  )
}
