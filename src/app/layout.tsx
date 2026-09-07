import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen">
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {FETCH_PATCH_SCRIPT && (
          // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
          <script dangerouslySetInnerHTML={{ __html: FETCH_PATCH_SCRIPT }} />
        )}
        {children}
      </body>
    </html>
  )
}
