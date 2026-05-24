# Plantec BOM Builder — Especificação Operacional

Sistema de geração de propostas comerciais para distribuidoras de tecnologia (segurança eletrônica, redes, infraestrutura). O operador monta uma lista de materiais (BOM), o sistema calcula margens, aplica regras de negócio, gera textos com IA e exporta um documento PDF A4 profissional.

---

## Entidades de Dados

### Produto
Representa um item do catálogo comercial.

| Campo | Tipo | Descrição |
|---|---|---|
| sku | texto único | Código identificador (ex: CAM-IP-POE-4MP) |
| nome | texto | Nome comercial |
| descrição | texto opcional | Especificação técnica |
| fabricante | texto opcional | Marca |
| categoria | texto | Agrupamento principal (ex: CFTV, Redes, Racks) |
| subcategoria | texto opcional | Agrupamento secundário (ex: Câmeras IP) |
| preço_base | decimal | Preço de venda sugerido |
| custo | decimal | Custo de aquisição |
| estoque | inteiro | Quantidade em estoque |
| unidade | texto | Unidade de medida (un, m, serv) |
| ativo | booleano | Visível no catálogo |
| atributos | mapa chave-valor | Características técnicas livres (ex: resolução, potência, portas) |
| compatíveis | lista de SKUs | Produtos que funcionam junto |
| obrigatórios | lista de SKUs | Produtos que devem ser incluídos junto |
| sugeridos | lista de SKUs | Produtos recomendados junto |

### Cliente
Empresa compradora.

| Campo | Tipo |
|---|---|
| razão_social | texto |
| nome_fantasia | texto opcional |
| cnpj | texto único opcional |
| contato | texto opcional |
| email | texto opcional |
| telefone | texto opcional |
| cidade / estado | texto opcional |
| ativo | booleano |

### Proposta
Documento comercial em construção ou finalizado.

| Campo | Tipo | Descrição |
|---|---|---|
| número | texto único | Gerado automaticamente: PLT-AAAA-NNN (sequencial por ano) |
| título | texto | Nome do projeto |
| vertical | texto | Segmento (CFTV, Redes, Controle de Acesso, etc.) |
| status | enum | Ciclo de vida (ver abaixo) |
| cliente | FK Cliente | |
| resumo_executivo | texto longo opcional | Gerado por IA ou manual |
| escopo | texto longo opcional | O que está e não está incluído |
| condições_comerciais | texto longo opcional | Pagamento, prazo de entrega, garantia |
| validade_dias | inteiro | Prazo de validade da proposta (padrão: 30 dias) |
| desconto_global | decimal % | Desconto aplicado sobre todos os itens |
| total_custo | decimal | Soma dos custos (recalculado automaticamente) |
| total_preço | decimal | Soma dos subtotais após descontos |
| total_desconto | decimal | Valor total descontado |
| margem | decimal % | (total_preço − total_custo) / total_preço × 100 |
| perfil_capa | FK PerfilEmpresa opcional | Dados/logo para a capa do PDF |
| perfil_intro | FK PerfilEmpresa opcional | Dados/logo para a página de apresentação |
| descrição_cenário | texto longo opcional | Descrição técnica do ambiente |
| diagrama_cenário | texto longo opcional | Código Mermaid da topologia de rede |
| estilo_capa | enum | Visual da capa: teal, carbon, ocean, burgundy, pearl |

**Ciclo de vida do status:**
```
rascunho → gerada → enviada → aprovada
                            → recusada
```
A transição é sempre para o próximo estado (não permite pular). Somente rascunho pode ser editado livremente.

### Item de Proposta (BOM)
Linha da lista de materiais, vinculada a uma proposta.

| Campo | Tipo | Descrição |
|---|---|---|
| produto | FK Produto | |
| quantidade | inteiro | |
| preço_unitário | decimal | Snapshot do preço_base no momento da adição |
| desconto | decimal % | Desconto específico deste item |
| subtotal | decimal | preço_unitário × quantidade × (1 − desconto/100) |
| custo | decimal | Snapshot do custo do produto |
| margem | decimal % | (subtotal − custo×qtd) / subtotal × 100 |
| função | texto opcional | Papel deste produto na solução (gerado por IA) |
| notas_técnicas | texto opcional | Observações de instalação |

Ao excluir uma proposta, todos os seus itens são excluídos em cascata.

### Perfil de Empresa
Dados da empresa emissora (pode haver múltiplos perfis, ex: matriz e filial).

| Campo | Tipo |
|---|---|
| nome | texto |
| tipo | enum (plantec, parceiro) |
| logo | imagem em base64 opcional |
| descrição | texto opcional |
| website / telefone / email / endereço | texto opcional |

### Regra de Negócio
Regra avaliada automaticamente sobre a BOM.

| Campo | Tipo | Descrição |
|---|---|---|
| nome | texto | |
| tipo | enum | sugestão, obrigatório, alerta |
| condição | estrutura | Critério de disparo (ver Motor de Regras) |
| ação | estrutura | O que fazer quando disparada |
| prioridade | inteiro | Ordem de avaliação |
| ativa | booleano | |

---

## Motor de Regras

Avaliado sempre que a BOM é modificada. Recebe a lista de itens e retorna três listas: alertas, sugestões e obrigatórios faltando.

### Condições suportadas

| Condição | Dispara quando |
|---|---|
| `{ categoria }` | Algum item pertence à categoria |
| `{ categoria, atributo, valor }` | Algum item da categoria tem o atributo com o valor especificado |
| `{ categoria, subcategoria, quantidade_maior_que: N }` | Soma das quantidades de itens dessa subcategoria excede N |
| `{ margem_menor_que: N }` | Margem global da proposta está abaixo de N% |

### Ações suportadas

| Tipo | Comportamento |
|---|---|
| `sugerir` | Exibe card de sugestão com lista de SKUs e mensagem explicativa |
| `exigir` | Verifica se os SKUs estão na BOM; se não, exibe alerta de item obrigatório faltando |
| `alertar` | Exibe mensagem de aviso (warning ou error) com texto configurável |

### Regras padrão do seed
1. Câmera com atributo `interface=PoE` → sugerir switch PoE
2. Mais de 8 câmeras IP → sugerir NVR de 16 canais
3. NVR presente → HD surveillance obrigatório
4. Rack presente → sugerir nobreak
5. Margem global < 10% → alerta de revisão de descontos

---

## Cálculos Financeiros

Todos os recálculos ocorrem no servidor após qualquer alteração na BOM.

```
subtotal_item  = preço_unitário × quantidade × (1 − desconto_item/100)
custo_item     = custo_produto × quantidade

total_preço    = Σ subtotal_item
total_custo    = Σ custo_item
total_desconto = Σ (preço_unitário × quantidade × desconto_item/100)
margem_global  = (total_preço − total_custo) / total_preço × 100

margem_item    = (subtotal_item − custo_item) / subtotal_item × 100
```

O desconto_global da proposta é informacional (usado no motor de regras); o cálculo financeiro usa os descontos por item.

Semáforo de margem: ≥15% verde · ≥10% amarelo · <10% vermelho.

---

## Geração de IA

Chamada via API própria (`POST /api/ai/generate`) com `{ tipo, contexto }`. O contexto inclui dados da proposta, itens da BOM, vertical e título.

| Tipo | Saída | Formato |
|---|---|---|
| `resumoExecutivo` | 3–5 parágrafos profissionais destacando valor entregue | Texto corrido |
| `escopo` | Documento estruturado em 3 seções | "Está incluso: •…" / "Não está incluso: •…" / "Condições: •…" |
| `descriçãoCenário` | 2–3 parágrafos descrevendo o ambiente físico e as interconexões | Texto corrido |
| `funçõesBOM` | Função de cada produto neste projeto específico (máx 60 chars) | JSON `[{sku, função}]` |
| `diagramaCenário` | Topologia de rede com subgraphs por função, setas rotuladas, estilos visuais | Código Mermaid puro |
| `textoIntro` | Apresentação institucional da empresa emissora | Texto corrido |

O modelo usa raciocínio interno (thinking) antes de gerar o texto, mas apenas o texto final é retornado.

### Diagrama Mermaid — regras de geração
- Formato: `graph TD` ou `graph LR`
- Subgraphs por função: Câmeras, Rede, Armazenamento, Internet, Sistemas Existentes
- Nós propostos (da BOM), existentes (do cliente) e externos (dependências não fornecidas)
- Setas rotuladas com tipo de conexão (PoE, IP/LAN, Fibra, RS-485, VPN)
- Estilos visuais diferenciados: propostos (verde), existentes (laranja), externos (tracejado cinza), internet (azul)
- Máximo 25 nós para legibilidade

---

## Telas e Funcionalidades

### Dashboard
- KPIs: total de propostas, rascunhos, aprovadas, produtos ativos, clientes ativos, receita pipeline
- Lista das 5 propostas mais recentes

### Lista de Propostas
- Filtros: status, cliente, busca por título/número
- Colunas: número, título, cliente, vertical, status, valor total, data
- Ação de criação e de acesso ao editor

### Nova Proposta
- Formulário: título, vertical, cliente (select), validade
- Ao salvar: gera número sequencial e redireciona ao editor

### Editor de Proposta — 4 abas

#### Aba BOM
- Tabela de itens com edição inline de quantidade, desconto, função e notas técnicas
- Margem por item com semáforo de cor
- Botão "Adicionar Produto" → modal de busca
- Painel de alertas do motor de regras (atualizado a cada mudança)
- Campo de desconto global %
- Rodapé com subtotal, total de descontos, total, margem global
- Botão "Avançar Status"
- Botão "Gerar PDF" (abre em nova aba)

#### Aba Capa
- Seletor visual de 5 temas com preview ao vivo (cores dinâmicas aplicadas ao preview)
- Seletor de perfil de empresa (para logo e nome na capa)
- Temas: Emerald (verde escuro), Carbon (cinza azulado), Ocean (azul), Executive (bordô), Pearl (branco)

#### Aba Introdução
- Campo: Resumo Executivo (textarea + botão "Gerar com IA")
- Campo: Escopo do Projeto (textarea + botão "Gerar com IA" + preview visual estruturado)
  - Preview interpreta bullet points e seções com ícones ✓/✕ e cores
- Campo: Condições Comerciais (textarea livre)
- Campo: Validade em dias
- Seletor de perfil de introdução (logo + texto institucional na página seguinte)

#### Aba Cenário
- Campo: Descrição Técnica (textarea + botão "Gerar com IA")
- Campo: Diagrama Mermaid (textarea + botão "Gerar com IA" + preview renderizado ao vivo)
- Geração em 2 passos: (1) gera descrição → (2) usa descrição como contexto para gerar diagrama
- Botão "Gerar Funções" na aba BOM aplica funções de IA em todos os itens de uma vez

### Catálogo de Produtos
- Lista com filtros por categoria, fabricante, busca textual
- Exibe: SKU, nome, categoria, preço base, custo, margem, estoque
- Criação e edição de produtos (incluindo atributos técnicos livres)

### Modal de Busca de Produtos
- Busca por nome, SKU, categoria, fabricante
- Exibe: estoque, preço base, margem estimada
- Ao selecionar: mostra sugestões automáticas (campo `sugeridos` do produto)

### Clientes
- Lista com busca
- Criação e edição com todos os campos da entidade

### Perfis de Empresa
- Lista de perfis (plantec / parceiro)
- Upload de logo (convertido em base64)
- Campos: nome, tipo, descrição, website, telefone, email, endereço

---

## Documento PDF

Gerado no servidor como HTML que o browser imprime/salva como PDF A4.

### Estrutura de páginas
Cada página é um container de altura exata 297mm. O servidor controla onde cada conteúdo começa — o browser não decide quebras.

| # | Página | Condição |
|---|---|---|
| 1 | Capa | Sempre |
| 2 | Dados da Proposta (Fornecedor + Cliente) | Sempre |
| 3+ | Resumo Executivo | Se preenchido |
| 3+ | Escopo do Projeto | Se preenchido |
| 3+ | Sobre a Empresa | Se perfil com descrição selecionado |
| 3+ | Cenário Técnico | Se descrição ou diagrama preenchidos |
| 3+ | BOM Comercial | Sempre (auto-dividida em múltiplas páginas se necessário) |
| 3+ | BOM Técnica | Sempre (auto-dividida em múltiplas páginas se necessário) |
| N | Condições & Aceite | Sempre (última página) |

### Divisão automática das tabelas BOM
O servidor estima a altura de cada linha e calcula quantas cabem por página. A última página da BOM sempre exibe o rodapé com o total e o card de resumo financeiro. Páginas intermediárias não têm rodapé de total.

### Capa
- Full bleed com tema de cor escolhido
- Logo da empresa (se configurado), vertical, título, nome do cliente
- Rodapé: número da proposta, data de emissão, validade

### Páginas de conteúdo
- Cabeçalho: logo da empresa + número da proposta + nome do cliente
- Conteúdo
- Rodapé: nome da empresa + número da proposta + data

### BOM Comercial
Colunas: SKU · Produto · Qtd · Preço Unit. · Desc. · Subtotal · Margem

### BOM Técnica
Colunas: SKU · Produto · Qtd · Categoria · Função na Solução · Descritivo

### Condições & Aceite
- Termos comerciais (se preenchidos)
- Texto de validade com datas calculadas
- Blocos de assinatura: Fornecedor e Cliente
- Badge de status atual

---

## Numeração de Propostas

Formato: `PLT-AAAA-NNN`
- `AAAA` = ano corrente
- `NNN` = sequencial com 3 dígitos, reinicia todo ano
- Gerado no momento da criação, imutável após criação

---

## Regras de Negócio Gerais

- Preço e custo de um item são fixados (snapshot) no momento em que o produto é adicionado à BOM. Mudanças posteriores no catálogo não afetam propostas existentes.
- Recálculo financeiro ocorre sempre no servidor, nunca no cliente.
- Propostas com status diferente de `rascunho` não devem ser editáveis (exceto avanço de status).
- Um produto pode ser adicionado múltiplas vezes à mesma proposta (linhas separadas com configurações diferentes).
- O campo `função` de cada item é independente — pode ser gerado por IA em lote ou editado individualmente.
