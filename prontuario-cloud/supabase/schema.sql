-- =====================================================================
-- PRONTUÁRIO CLOUD — DR. REGINALDO CHIARINI (CRM-SP 122194)
-- Schema Supabase (PostgreSQL). Cole no SQL Editor do Supabase e rode.
-- Projeto SEPARADO do MedScribe PEP (index.html) — não afeta aquele app.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PACIENTES
-- ---------------------------------------------------------------------
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  nascimento date,
  sexo text check (sexo in ('M','F','X')),
  telefone text,
  email text,
  endereco text,
  cid text,
  ciap text,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_pacientes_user on public.pacientes(user_id);
create index if not exists idx_pacientes_nome on public.pacientes(user_id, nome);

-- ---------------------------------------------------------------------
-- 2. CONSULTAS (SOAP expandido — registro completo, imutável após salvar)
-- ---------------------------------------------------------------------
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null default current_date,
  tipo text not null check (tipo in ('primeira_consulta','retorno','evolucao')),
  cenario text not null check (cenario in ('particular','unimed','santa_casa')),
  subjetivo text,
  objetivo text,
  avaliacao text,
  plano text,
  anotacao_bruta text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_consultas_paciente on public.consultas(paciente_id, data desc);
create index if not exists idx_consultas_user on public.consultas(user_id);

-- ---------------------------------------------------------------------
-- 3. PROBLEMAS — lista persistente. NUNCA deletar (ver policies abaixo).
-- ---------------------------------------------------------------------
create table if not exists public.problemas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  condicao text not null,
  data_inicio date,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  cid_10 text,
  codigo_ciap text,
  data_resolucao date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_problemas_paciente on public.problemas(paciente_id, status);

-- ---------------------------------------------------------------------
-- 4. MEDICAÇÕES — lista persistente. NUNCA deletar (ver policies abaixo).
-- ---------------------------------------------------------------------
create table if not exists public.medicacoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  farmaco text not null,
  dose text,
  posologia text,
  data_inicio date,
  prescritor text,
  status text not null default 'ativo' check (status in ('ativo','suspenso')),
  data_suspensao date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_medicacoes_paciente on public.medicacoes(paciente_id, status);

-- ---------------------------------------------------------------------
-- 5. AGENDA
-- ---------------------------------------------------------------------
create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references public.pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data_hora timestamptz not null,
  motivo text,
  status text not null default 'agendado' check (status in ('agendado','realizado','faltou','cancelado')),
  criado_em timestamptz not null default now()
);
create index if not exists idx_agenda_user_data on public.agenda(user_id, data_hora);

-- ---------------------------------------------------------------------
-- 6. DOCUMENTOS DERIVADOS (atestado, receita, encaminhamento, relatório)
-- ---------------------------------------------------------------------
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('atestado','receita','encaminhamento','relatorio')),
  conteudo text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_documentos_paciente on public.documentos(paciente_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Trigger genérico para manter atualizado_em em problemas/medicacoes
-- ---------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_problemas_atualizado_em on public.problemas;
create trigger trg_problemas_atualizado_em
  before update on public.problemas
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_medicacoes_atualizado_em on public.medicacoes;
create trigger trg_medicacoes_atualizado_em
  before update on public.medicacoes
  for each row execute function public.set_atualizado_em();

-- =====================================================================
-- SEGURANÇA (RLS) — cada médico (auth.uid()) só vê e altera o que é seu
-- =====================================================================
alter table public.pacientes enable row level security;
alter table public.consultas enable row level security;
alter table public.problemas enable row level security;
alter table public.medicacoes enable row level security;
alter table public.agenda enable row level security;
alter table public.documentos enable row level security;

-- Pacientes: CRUD completo restrito ao dono
create policy "pacientes_select" on public.pacientes for select using (user_id = auth.uid());
create policy "pacientes_insert" on public.pacientes for insert with check (user_id = auth.uid());
create policy "pacientes_update" on public.pacientes for update using (user_id = auth.uid());
create policy "pacientes_delete" on public.pacientes for delete using (user_id = auth.uid());

-- Consultas: registro do SOAP não é apagado (sem policy de delete)
create policy "consultas_select" on public.consultas for select using (user_id = auth.uid());
create policy "consultas_insert" on public.consultas for insert with check (user_id = auth.uid());
create policy "consultas_update" on public.consultas for update using (user_id = auth.uid());

-- Problemas: REGRA DE OURO — sem policy de delete. Só select/insert/update.
create policy "problemas_select" on public.problemas for select using (user_id = auth.uid());
create policy "problemas_insert" on public.problemas for insert with check (user_id = auth.uid());
create policy "problemas_update" on public.problemas for update using (user_id = auth.uid());

-- Medicações: REGRA DE OURO — sem policy de delete. Só select/insert/update.
create policy "medicacoes_select" on public.medicacoes for select using (user_id = auth.uid());
create policy "medicacoes_insert" on public.medicacoes for insert with check (user_id = auth.uid());
create policy "medicacoes_update" on public.medicacoes for update using (user_id = auth.uid());

-- Agenda: CRUD completo restrito ao dono
create policy "agenda_select" on public.agenda for select using (user_id = auth.uid());
create policy "agenda_insert" on public.agenda for insert with check (user_id = auth.uid());
create policy "agenda_update" on public.agenda for update using (user_id = auth.uid());
create policy "agenda_delete" on public.agenda for delete using (user_id = auth.uid());

-- Documentos: gerados uma vez, não são apagados (sem policy de delete)
create policy "documentos_select" on public.documentos for select using (user_id = auth.uid());
create policy "documentos_insert" on public.documentos for insert with check (user_id = auth.uid());

-- Reforço em nível de privilégio: revoga DELETE em problemas/medicacoes
-- mesmo para o role authenticated, para que a regra de ouro não dependa
-- só de RLS (defesa em profundidade).
revoke delete on public.problemas from authenticated;
revoke delete on public.medicacoes from authenticated;
