# Plantec BOM Builder — Especificação Completa

Gerador de propostas comerciais para distribuidoras de tecnologia (CFTV, redes, infraestrutura). O usuário monta uma BOM (Bill of Materials), o sistema calcula margens, aplica regras de negócio, gera textos com IA e exporta um PDF A4 paginado de alta qualidade.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS 3 |
| Fonte | Montserrat (Google Fonts) |
| Banco | PostgreSQL via Neon (serverless) |
| ORM | Prisma 5 |
| IA | Anthropic SDK (`claude-opus-4-7`) |
| Deploy | Vercel (functions + edge) |
| PDF | HTML/CSS server-rendered (Route Handler) |
| Diagramas | Mermaid via mermaid.ink (server-side SVG) |

---

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...
PLANTEC_HUB_TOKEN=...   # opcional: integração com catálogo externo
```

`DATABASE_URL` deve apontar para a **URL direta** do Neon (não pooler), pois Prisma em serverless não funciona com PgBouncer por padrão.

Build script em `package.json`:
```json
"build": "prisma generate && next build"
```
**Nunca** rodar `prisma migrate deploy` no build — trava em ambiente Vercel. Migrations são aplicadas manualmente no Neon SQL Editor.

---

## Estrutura de Arquivos

```
src/
  app/
    layout.tsx                          # Root layout com sidebar
    page.tsx                            # Redirect para /dashboard
    globals.css                         # Tailwind + componentes globais
    dashboard/page.tsx                  # KPIs + propostas recentes
    proposals/
      page.tsx                          # Lista de propostas
      new/page.tsx                      # Criação de proposta
      [id]/
        page.tsx                        # Editor completo (BOM + abas)
        pdf/route.tsx                   # HTML→PDF server-rendered
    products/page.tsx                   # Catálogo de produtos
    customers/page.tsx                  # Clientes
    settings/profiles/page.tsx          # Perfis da empresa (logos, textos)
    api/
      health/route.ts                   # Diagnóstico de conexão BD
      dashboard/route.ts
      proposals/route.ts                # GET list, POST create
      proposals/[id]/route.ts           # GET, PUT, DELETE
      proposals/[id]/items/route.ts     # POST, PUT, DELETE itens BOM
      proposals/[id]/evaluate/route.ts  # POST — motor de regras
      products/route.ts                 # GET list, POST create
      products/[id]/route.ts
      customers/route.ts
      customers/[id]/route.ts
      company-profiles/route.ts
      company-profiles/[id]/route.ts
      ai/generate/route.ts              # POST — geração de texto/diagrama IA
      plantec/products/route.ts         # GET — catálogo externo (PLANTEC_HUB_TOKEN)
      rules/route.ts
  components/
    AppLayout.tsx                       # Wrapper com Sidebar
    Sidebar.tsx                         # Nav lateral com logo SVG
    BOMTable.tsx                        # Tabela de itens editável
    ProductSearchModal.tsx              # Modal de busca de produtos
    AlertPanel.tsx                      # Alertas do motor de regras
    AIGenerateButton.tsx                # Botão de geração IA com loading
    MermaidDiagram.tsx                  # Renderização client-side de diagramas
    LogoUpload.tsx                      # Upload de logo (base64)
    StatusBadge.tsx                     # Badge colorido de status
  lib/
    prisma.ts                           # Singleton PrismaClient (globalThis)
    coverStyles.ts                      # 5 temas de capa do PDF
  services/
    ruleEngine.ts                       # Motor de regras puro (sem BD)
  types/
    index.ts                            # Tipos compartilhados
prisma/
  schema.prisma
  seed.ts                               # Dados iniciais (10 produtos, 3 clientes, 5 regras)
public/
  plantec-icon.svg                      # Cubo isométrico SVG (logo)
```

---

## Schema do Banco de Dados

### `Product`
| Campo | Tipo | Descrição |
|---|---|---|
| id | String (cuid) | PK |
| sku | String (unique) | Código único |
| name | String | Nome comercial |
| description | String? | Descrição técnica |
| brand | String? | Fabricante |
| category | String | Ex: CFTV, Redes, Racks |
| subcategory | String? | Ex: Câmeras IP, Switches |
| basePrice | Decimal | Preço de venda base |
| cost | Decimal | Custo de aquisição |
| stock | Int | Estoque atual |
| unit | String | "un", "m", "serv" etc. |
| active | Boolean | Ativo no catálogo |
| attributes | Json | Atributos técnicos livres |
| compatible | String[] | SKUs compatíveis |
| required | String[] | SKUs obrigatórios junto |
| suggested | String[] | SKUs sugeridos |

### `Customer`
| Campo | Tipo |
|---|---|
| id | String (cuid) |
| companyName | String |
| tradeName | String? |
| cnpj | String? (unique) |
| contactName | String? |
| email | String? |
| phone | String? |
| city / state | String? |
| active | Boolean |

### `Proposal`
| Campo | Tipo | Descrição |
|---|---|---|
| id | String (cuid) | PK |
| number | String (unique) | "PLT-2026-001" |
| title | String | Título da proposta |
| vertical | String | Segmento (CFTV, Redes, etc.) |
| status | String | draft → generated → sent → approved / rejected |
| customerId | String | FK Customer |
| userId | String? | FK User |
| executiveSummary | String? | Gerado por IA ou manual |
| scope | String? | Escopo do projeto |
| commercialTerms | String? | Condições comerciais |
| validityDays | Int | Validade (padrão 30) |
| discount | Decimal | Desconto global % |
| totalCost | Decimal | Custo total recalculado |
| totalPrice | Decimal | Preço total |
| totalDiscount | Decimal | Valor do desconto |
| margin | Decimal | Margem % |
| coverProfileId | String? | FK CompanyProfile (capa) |
| introProfileId | String? | FK CompanyProfile (intro) |
| scenarioDesc | String? | Descrição do cenário técnico |
| scenarioDiagram | String? | Código Mermaid do diagrama |
| coverStyle | String | "teal" \| "carbon" \| "ocean" \| "burgundy" \| "pearl" |

### `ProposalItem`
| Campo | Tipo |
|---|---|
| id | String (cuid) |
| proposalId | String (FK, cascade delete) |
| productId | String (FK) |
| quantity | Int |
| unitPrice | Decimal (snapshot do basePrice no momento) |
| discount | Decimal (% por item) |
| subtotal | Decimal |
| cost | Decimal |
| margin | Decimal |
| role | String? | Função na solução (gerado por IA) |
| technicalNotes | String? |

### `CompanyProfile`
Perfil da empresa emissora. Pode ser o perfil de capa (logo grande) ou o perfil de introdução (texto institucional).

| Campo | Tipo |
|---|---|
| id | String (cuid) |
| name | String |
| type | String ("plantec" \| "partner") |
| logoBase64 | String? (data URI) |
| description | String? |
| website / phone / email / address | String? |

### `Rule`
Motor de regras de negócio.

| Campo | Tipo | Descrição |
|---|---|---|
| type | String | "suggestion" \| "required" \| "alert" |
| condition | Json | Ex: `{category:"CFTV", attribute:"interface", value:"PoE"}` |
| action | Json | Ex: `{type:"suggest", skus:["SW-POE-8P"], message:"..."}` |
| priority | Int | Ordem de avaliação |

### `User`, `Template`
Modelos presentes no schema, ainda sem fluxo implementado.

---

## API Routes

### `POST /api/proposals`
Cria proposta. Body: `{ title, vertical, customerId, executiveSummary?, scope?, commercialTerms?, validityDays? }`.
Gera `number` sequencial por ano: `PLT-{YYYY}-{NNN}`.

### `GET /api/proposals?status=&customerId=&search=`
Lista propostas com filtros. Inclui `customer` e `_count.items`.

### `PUT /api/proposals/[id]`
Atualiza qualquer campo da proposta. Recalculo financeiro só ocorre via `/items`.

### `POST /api/proposals/[id]/items`
Adiciona produto à BOM. Calcula `unitPrice` (snapshot), `subtotal`, `margin` e chama `recalcProposal()` que atualiza totais na `Proposal`.

### `PUT /api/proposals/[id]/items`
Atualiza `quantity`, `discount`, `role`, `technicalNotes` de um item. Recalcula tudo.

### `DELETE /api/proposals/[id]/items?itemId=`
Remove item e recalcula.

### `POST /api/proposals/[id]/evaluate`
Executa o motor de regras. Retorna `{ alerts, suggestions, required }`.

### `POST /api/ai/generate`
Body: `{ type, context }`. Tipos disponíveis:
- `executiveSummary` — 3-5 parágrafos profissionais
- `scope` — formato estruturado (Está incluso / Não está incluso / Condições)
- `scenarioDescription` — 2-3 parágrafos técnicos do cenário
- `bomRoles` — JSON `[{sku, role}]` com função de cada produto
- `scenarioDiagram` — código Mermaid puro (graph TD/LR com classDef e subgraphs)
- `introText` — texto institucional da empresa

Usa `claude-opus-4-7` com `thinking: { type: 'adaptive' }` e `max_tokens: 1500`.

---

## Motor de Regras (`src/services/ruleEngine.ts`)

Função pura `evaluateRules(items, rules, globalDiscount)`. Avalia cada `Rule` contra os itens da BOM:

**Condições suportadas:**
- `{ category }` — se algum item é da categoria
- `{ category, attribute, value }` — se item tem atributo com valor
- `{ category, subcategory, quantityGt }` — se soma de qtd > N
- `{ marginLt }` — se margem global < N%

**Ações:**
- `suggest` → lista de SKUs sugeridos (não obrigatórios)
- `require` → SKUs obrigatórios (alerta se ausentes)
- `alert` → warning/error com mensagem

---

## Geração de PDF (`src/app/proposals/[id]/pdf/route.tsx`)

Route Handler que retorna HTML puro (`Content-Type: text/html`). O usuário clica "Imprimir / PDF" e o browser salva como PDF.

### Princípio de paginação
Cada página é um `<div class="page">` com `height: 297mm; overflow: hidden`. O browser não decide onde quebrar — o servidor pré-calcula os limites.

### Estrutura de cada página
```
.page (height:297mm, display:flex, flex-direction:column)
  .ph (page header — logo + número da proposta)
  .pc (page content — flex:1, padding:36px 56px)
  .pf (page footer — nome empresa + data)
```

### Páginas geradas
1. **Capa** — full bleed, sem header/footer, com tema de cor aplicado
2. **Dados da Proposta** — grid 2 colunas (Fornecedor / Cliente)
3. **Resumo Executivo** — se preenchido (página própria)
4. **Escopo do Projeto** — se preenchido (página própria)
5. **Sobre a Empresa** — se preenchido (página própria)
6. **Cenário Técnico** — descrição + diagrama Mermaid (SVG, max-height:420px)
7. **BOM Comercial** — auto-split: servidor calcula quantas linhas cabem por página
8. **BOM Técnica** — auto-split (mesmo algoritmo)
9. **Condições & Aceite** — termos + assinaturas + status badge

### Constantes de paginação (px a 96dpi)
```typescript
const CONTENT_H = 927   // área útil por página
const BOM_ROW_H  = 44   // altura estimada de linha BOM
const TECH_ROW_H = 54   // altura estimada de linha técnica
const S_HDG      = 44   // section-heading + margin
const TBL_HDR    = 30   // thead
const TBL_FTR    = 37   // tfoot (linha de total)
const TOTALS_BLK = 200  // card de resumo financeiro
```

### Print CSS
```css
@page { size: A4 portrait; margin: 0 }
@media print {
  .page { break-after: page; page-break-after: always }
  .page:last-child { break-after: auto }
}
```

---

## Temas de Capa (`src/lib/coverStyles.ts`)

5 temas: `teal` (Emerald), `carbon`, `ocean`, `burgundy` (Executive), `pearl`.

Cada tema tem: `bg` (gradient), `pattern` (overlay CSS), `accent`, `accentLight`, `text`, `subText`, `footerBg`, `dark` (boolean para contraste).

O tema é injetado como override CSS direto no `<style>` do PDF:
```css
.cover { background: ${coverSt.bg} !important }
```

---

## Design System

### Cores de marca
```
brand-50  → #E6F5F4
brand-500 → #00928E (primária)
brand-900 → #002827 (sidebar, headers escuros)
```

### Componentes globais (globals.css)
- `.sidebar-link` / `.sidebar-link.active` — nav lateral
- `.card` — container branco com borda sutil
- `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.input`, `.label`
- `.page-title`, `.page-subtitle`

### Logo Plantec
SVG em `public/plantec-icon.svg` — cubo isométrico com 3 faces, cada face com 3 retângulos arredondados brancos, usando `clipPath` + `matrix()` transforms.

---

## Componentes Principais

### `BOMTable`
Tabela interativa de itens. Permite editar quantidade, desconto por item, função na solução e notas técnicas inline. Mostra margem por item com semáforo de cor (≥15% verde, ≥10% amarelo, <10% vermelho).

### `ProductSearchModal`
Modal de busca com filtro por nome/SKU/categoria/marca. Exibe estoque, preço base e margem estimada. Sugestões automáticas baseadas nos `suggested[]` do produto selecionado.

### `AlertPanel`
Exibe os resultados do motor de regras: alertas de margem, produtos obrigatórios faltando, sugestões de produtos complementares.

### `AIGenerateButton`
Botão que chama `POST /api/ai/generate`. Mostra spinner durante geração. Suporta callback `onGenerated(text)` para preencher campos.

### `MermaidDiagram`
Renderiza código Mermaid client-side. Fallback para `<pre>` se `mermaid.js` não carregar.

### `MermaidDiagram` (server-side no PDF)
No PDF, usa `mermaid.ink` via fetch com timeout de 4s. Se falhar, inclui `<pre class="mermaid">` + CDN do mermaid.js para renderização client-side no browser antes de imprimir.

---

## Editor de Proposta (`/proposals/[id]`)

4 abas:

### BOM (aba principal)
- Tabela de itens com edição inline
- Botão "Adicionar Produto" → `ProductSearchModal`
- Painel de alertas (motor de regras)
- Desconto global %
- Totais: subtotal, desconto, total, margem

### Capa
- Seletor de 5 temas visuais com preview ao vivo
- Seletor de perfil da empresa para capa
- Preview da capa com cores dinâmicas aplicadas

### Introdução
- Editor de resumo executivo (textarea + botão IA)
- Editor de escopo (textarea + botão IA + preview visual estruturado)
- Condições comerciais
- Validade (dias)
- Seletor de perfil de introdução

### Cenário
- Descrição técnica do cenário (textarea + botão IA)
- Diagrama Mermaid (textarea + botão IA + preview renderizado)
- Geração em 2 passos: primeiro descrição, depois diagrama baseado na descrição

### Status e exportação
- Flow: `draft → generated → sent → approved` (botão "Avançar Status")
- Botão "Gerar PDF" → abre `/proposals/[id]/pdf` em nova aba

---

## Fluxo de Criação de Proposta

1. `/proposals/new` — selecionar cliente + título + vertical
2. `POST /api/proposals` — gera número sequencial
3. Redirect para `/proposals/[id]`
4. Aba BOM: adicionar produtos → motor de regras avalia automaticamente
5. Aba Capa: escolher tema
6. Aba Introdução: gerar textos com IA ou escrever manualmente
7. Aba Cenário: gerar descrição + diagrama com IA
8. Avançar status para `generated`
9. Abrir PDF → Imprimir / Salvar como PDF

---

## Seed de Dados (`prisma/seed.ts`)

Executar com: `npm run seed`

Cria:
- **10 produtos**: câmeras IP PoE, NVRs 8/16 canais, switches PoE 8/16p, HD surveillance 4TB, rack 12U, nobreak 1200VA, patch cord Cat6, serviço de configuração
- **3 clientes**: Bom Preço (SP), Construtora Horizonte (Campinas), Hospital São Lucas (SP)
- **5 regras**: câmera PoE → sugerir switch, >8 câmeras → NVR 16ch, NVR → HD obrigatório, rack → nobreak, margem <10% → alerta

---

## Configuração do Projeto (do zero)

```bash
npx create-next-app@14 plantec-bom-builder --typescript --tailwind --app --src-dir
cd plantec-bom-builder
npm install @prisma/client prisma @anthropic-ai/sdk react-hot-toast react-icons mermaid
npm install -D ts-node

# Inicializar Prisma
npx prisma init

# Configurar DATABASE_URL no .env
# Copiar schema.prisma com todos os models
# Criar tabelas manualmente no Neon SQL Editor (não usar migrate deploy)
npx prisma generate

# Instalar fonte Montserrat
# Adicionar em globals.css:
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

# Configurar tailwind.config.ts com brand colors e font Montserrat
# Popular BD
npm run seed

npm run dev
```

---

## Notas de Implementação

### Prisma singleton
```typescript
// src/lib/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma  // cache em TODOS os envs
```

### `export const dynamic = 'force-dynamic'`
Necessário em todos os Route Handlers que acessam o banco, para evitar caching estático no Vercel.

### Recálculo financeiro
Sempre feito no servidor via `recalcProposal()` após qualquer mudança em itens. Nunca confiar em cálculos do cliente.

### IA com thinking
O modelo `claude-opus-4-7` é usado com `thinking: { type: 'adaptive' }`. O conteúdo de thinking não é retornado ao cliente — apenas o bloco `text`.

### PDF e iOS Safari
iOS Safari ignora `overflow:hidden` em modo print. Por isso cada página deve ter conteúdo que cabe naturalmente em 297mm — não depender de clipping CSS. Seções longas (resumo executivo, escopo) devem ser páginas separadas.
