export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { chromium } from 'playwright'

/**
 * Abre o PDF no mesmo Chromium do download e mede cada página: `.pc` com
 * conteúdo mais alto que a página é texto que some no papel (overflow:hidden).
 * A paginação do servidor é estimativa (altura de linha, caracteres por
 * linha); isto é a prova de fato, antes de mandar ao cliente.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const url = `${req.nextUrl.origin}${process.env.NEXT_BASE_PATH ?? ''}/proposals/${params.id}/pdf`
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    if (!res?.ok()) return Response.json({ error: `PDF respondeu ${res?.status()}` }, { status: 502 })
    await page.waitForTimeout(800)  // fontes

    const paginas = await page.$$eval('.page', els => {
      let secao = 'Capa'
      return els.map((el, i) => {
        const h2 = el.querySelector('h2')
        if (h2?.textContent) secao = h2.textContent.trim()
        const pc = el.querySelector('.pc') as HTMLElement | null
        return { pagina: i + 1, secao, excesso: pc ? Math.max(0, pc.scrollHeight - pc.clientHeight) : 0 }
      })
    })
    const cortes = paginas.filter(p => p.excesso > 2)
    return Response.json({ paginas: paginas.length, cortes })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  } finally {
    await browser.close()
  }
}
