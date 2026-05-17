# Plantec BOM Builder

Gerador de propostas comerciais e BOMs técnicas para a **Plantec Distribuidora de Tecnologia**.

## Funcionalidades

- **Cadastro de Produtos** — catálogo com preço, custo, margem, atributos técnicos e relações de compatibilidade
- **Cadastro de Clientes** — CNPJ, contato, endereço
- **Gerador de Soluções** — monte BOMs por vertical (CFTV, Redes, Energia, etc.)
- **Engine de Regras** — alertas automáticos de compatibilidade, itens obrigatórios e sugestões
- **BOM Comercial e Técnica** — tabelas editáveis com margem em tempo real
- **Proposta PDF** — template profissional com capa, BOM, condições comerciais e campo de aceite
- **Status de proposta** — draft → generated → sent → approved / rejected

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Instalação

```bash
# 1. Entrar no diretório
cd bom-builder

# 2. Instalar dependências
npm install

# 3. Configurar banco de dados
cp .env.example .env
# Editar .env com suas credenciais PostgreSQL
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/plantec_bom"

# 4. Criar banco e aplicar migrations
npx prisma migrate dev --name init

# 5. Popular com dados de demonstração
npm run seed

# 6. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://postgres:pass@localhost:5432/plantec_bom` |

## Estrutura do Projeto

```
bom-builder/
├── prisma/
│   ├── schema.prisma      # Modelos do banco
│   └── seed.ts            # Dados de demonstração
├── src/
│   ├── app/
│   │   ├── api/           # API Routes (Next.js)
│   │   ├── dashboard/     # Dashboard
│   │   ├── products/      # Cadastro de produtos
│   │   ├── customers/     # Cadastro de clientes
│   │   └── proposals/     # Propostas e editor de BOM
│   ├── components/        # Componentes reutilizáveis
│   ├── lib/prisma.ts      # Cliente Prisma singleton
│   ├── services/
│   │   └── ruleEngine.ts  # Engine de regras
│   └── types/index.ts     # Tipos TypeScript
└── package.json
```

## Rotas Disponíveis

| Rota | Descrição |
|---|---|
| `/dashboard` | Visão geral com KPIs |
| `/products` | CRUD de produtos |
| `/customers` | CRUD de clientes |
| `/proposals` | Lista de propostas |
| `/proposals/new` | Nova proposta |
| `/proposals/[id]` | Editor de BOM e proposta |
| `/proposals/[id]/pdf` | Visualização e exportação PDF |

## API Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/products` | Listar produtos (filtros: search, category) |
| POST | `/api/products` | Criar produto |
| GET | `/api/customers` | Listar clientes |
| POST | `/api/customers` | Criar cliente |
| GET | `/api/proposals` | Listar propostas |
| POST | `/api/proposals` | Criar proposta |
| GET | `/api/proposals/:id` | Detalhes da proposta |
| PUT | `/api/proposals/:id` | Atualizar proposta |
| POST | `/api/proposals/:id/items` | Adicionar item à BOM |
| PUT | `/api/proposals/:id/items` | Atualizar item (qty, desconto) |
| DELETE | `/api/proposals/:id/items?itemId=` | Remover item |
| POST | `/api/proposals/:id/evaluate` | Executar engine de regras |
| GET | `/api/dashboard` | Estatísticas do dashboard |
| GET | `/api/rules` | Listar regras ativas |

## Engine de Regras

As regras estão no banco de dados (tabela `Rule`) e são configuráveis. Exemplos incluídos no seed:

| Gatilho | Ação |
|---|---|
| Câmera PoE na BOM | Sugerir Switch PoE |
| > 8 câmeras | Sugerir NVR 16 canais |
| NVR adicionado | HD Surveillance obrigatório |
| Rack adicionado | Sugerir Nobreak |
| Margem < 10% | Alerta de margem baixa |

## Categorias de Produtos

- CFTV
- Energia
- Redes
- Controle de Acesso
- Cabeamento
- Nobreaks
- Racks
- Serviços

## Status das Propostas

```
draft → generated → sent → approved
                         ↘ rejected
```

## Integrações Futuras Planejadas

- **Plantec.com** — sincronização de catálogo
- **ERP VSI** — preços e estoque em tempo real
- **CRM** — sincronização de clientes e oportunidades
- **Portal Plantec** — publicação de propostas
- **Autenticação** — estrutura preparada (modelo `User` no schema)
