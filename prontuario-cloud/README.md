# Prontuário Cloud — Dr. Reginaldo Chiarini

Aplicativo web de prontuário médico pessoal (Next.js 14 + Supabase + IA), separado
do MedScribe PEP (`index.html` na raiz do repositório) e do gerador de conteúdo
(`gerador-conteudo.html`). Este é um projeto novo e independente, na pasta
`prontuario-cloud/`.

## Stack

- **Frontend + Backend:** Next.js 14 (App Router, TypeScript)
- **Banco + Auth:** Supabase (PostgreSQL + Row Level Security)
- **IA:** Anthropic Claude (`claude-opus-5`) via rota de API do Next.js
- **PDF:** `@react-pdf/renderer` (atestado, receita, encaminhamento, relatório)
- **Estilo:** Tailwind CSS, pt-BR

## 1. Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. Vá em **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql`
   e clique em **Run**. Isso cria as 6 tabelas (`pacientes`, `consultas`,
   `problemas`, `medicacoes`, `agenda`, `documentos`), os índices, os
   triggers e as políticas de RLS.
3. Em **Authentication → Users**, crie manualmente o usuário do Dr. Reginaldo
   Chiarini (e-mail + senha). Este app não tem tela pública de cadastro —
   por design, é um prontuário pessoal de uso único/restrito.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

## 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_MEDICO_NOME="Dr. Reginaldo Chiarini"
NEXT_PUBLIC_MEDICO_CRM="CRM-SP 122194"
```

A `ANTHROPIC_API_KEY` é obtida em [console.anthropic.com](https://console.anthropic.com/settings/keys).

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` — você será redirecionado para `/login`.

## 4. Deploy na Vercel

1. Suba este repositório (ou apenas a pasta `prontuario-cloud/`) para o GitHub.
2. Em [vercel.com](https://vercel.com), importe o projeto apontando o
   **Root Directory** para `prontuario-cloud`.
3. Configure as mesmas variáveis de ambiente do `.env.local` em
   **Project Settings → Environment Variables**.
4. Deploy.

## Regra de ouro (implementada)

Problemas e medicações **nunca são deletados**:

- Um problema resolvido migra para `status = 'inativo'` com `data_resolucao`
  preenchida — a linha permanece.
- Uma medicação suspensa migra para `status = 'suspenso'` com
  `data_suspensao` preenchida — a linha permanece.
- Um ajuste de dose/posologia suspende a linha antiga (datada) e cria uma
  linha nova — nunca sobrescreve o histórico.
- Isso é reforçado em duas camadas: lógica em `lib/registros.ts` e, no
  banco, `REVOKE DELETE` + ausência de política RLS de `DELETE` para
  `problemas` e `medicacoes` (ver `supabase/schema.sql`).

Toda consulta salva mantém o SOAP completo (S/O/A/P) e a anotação bruta
original em `consultas.anotacao_bruta`, para auditoria.

## Estrutura

```
app/
  login/                        — autenticação
  page.tsx                      — dashboard
  pacientes/                    — lista + cadastro
  pacientes/[id]/               — ficha do paciente (histórico, problemas, medicações)
  pacientes/[id]/consulta/      — nova consulta (fluxo SOAP com IA)
  agenda/                       — agenda do dia
  documentos/                   — documentos gerados (+ exportação PDF)
  api/gerar-prontuario/         — chama a IA para estruturar o SOAP
  api/salvar-consulta/          — persiste consulta e aplica a regra de ouro
  api/chat-clinico/             — chat de apoio clínico (fase 2)
  api/gerar-pdf/                — renderiza documentos em PDF
lib/
  prompt-prontuario.ts          — prompt-mestre do motor de prontuário (Padrão Chiarini)
  prontuario.ts                 — chamada à IA (Anthropic) + validação do JSON
  registros.ts                  — aplica a regra de ouro em problemas/medicações
  pdf.tsx                       — layout dos documentos em PDF
  supabase/                     — clientes Supabase (browser, server, middleware)
supabase/schema.sql             — schema completo + RLS
```

## Fluxo da consulta

1. Médico abre a ficha do paciente e clica em **Nova consulta**.
2. Digita ou cola a anotação bruta (texto livre).
3. Clica em **Gerar prontuário** → `POST /api/gerar-prontuario` monta o
   contexto do paciente (histórico, problemas ativos, medicações em uso) e
   chama o Claude com o prompt do Padrão Chiarini.
4. A IA retorna o SOAP expandido estruturado (JSON).
5. Médico revisa e edita livremente os campos S/O/A/P na tela.
6. Ao clicar em **Salvar consulta**, `POST /api/salvar-consulta` grava o
   registro e aplica as atualizações de problemas/medicações sugeridas
   pela IA, respeitando a regra de ouro.

## Fase 2 (já com rota pronta, sem tela dedicada)

`POST /api/chat-clinico` — chat de apoio clínico contextualizado ao
paciente em tela, para consulta rápida durante o atendimento.
