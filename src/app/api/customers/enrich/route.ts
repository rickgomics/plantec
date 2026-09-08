export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * Enriquecimento de cadastro pelo CNPJ, via BrasilAPI (Receita Federal).
 *
 * A página "Dados da Proposta" só é boa se o cadastro do cliente for. Hoje
 * 17 dos 21 clientes têm apenas a razão social, e digitar endereço e telefone
 * à mão é o que não acontece. Aqui basta o CNPJ.
 *
 * Serviço público, sem chave. Devolve os campos já no formato do model
 * Customer — quem chama decide o que gravar.
 */
export async function POST(req: NextRequest) {
  const { cnpj } = await req.json()
  const limpo = String(cnpj ?? '').replace(/\D/g, '')

  if (limpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`, {
      // A BrasilAPI devolve 403 para o User-Agent padrão do fetch do Node.
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PlantecBOMBuilder/1.0 (+https://institucional.plantec.com)',
      },
      signal: AbortSignal.timeout(20_000),
    })

    if (res.status === 404 || res.status === 400) {
      return NextResponse.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Consulta indisponível (HTTP ${res.status})` }, { status: 502 })
    }

    const d = await res.json()

    // A Receita devolve o telefone como "DDD + número" colado.
    const formataTelefone = (t?: string): string | null => {
      const n = String(t ?? '').replace(/\D/g, '')
      if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
      if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
      return n || null
    }

    const endereco = [
      [d.logradouro, d.numero].filter(Boolean).join(', '),
      d.complemento || null,
      d.bairro || null,
      d.cep ? `CEP ${String(d.cep).replace(/(\d{5})(\d{3})/, '$1-$2')}` : null,
    ].filter(Boolean).join(' — ')

    const formatado = `${limpo.slice(0,2)}.${limpo.slice(2,5)}.${limpo.slice(5,8)}/${limpo.slice(8,12)}-${limpo.slice(12)}`

    return NextResponse.json({
      cnpj:        formatado,
      companyName: d.razao_social ?? null,
      tradeName:   d.nome_fantasia || null,
      phone:       formataTelefone(d.ddd_telefone_1),
      phone2:      formataTelefone(d.ddd_telefone_2),
      email:       d.email || null,
      city:        d.municipio ?? null,
      state:       d.uf ?? null,
      address:     endereco || null,
      // Situação cadastral: proposta para empresa BAIXADA ou SUSPENSA é
      // risco comercial, então o dado sobe junto em vez de ficar escondido.
      situacao:    d.descricao_situacao_cadastral ?? null,
      atividade:   d.cnae_fiscal_descricao ?? null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[customers/enrich]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
