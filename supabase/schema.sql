-- Schema do painel de despacho da Aracaju Motoboy
-- Rode este script inteiro no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- ========== CLIENTES ==========
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  endereco text not null default '',
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

-- ========== MOTOBOYS ==========
create table if not exists public.motoboys (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  credencial text not null default '',
  celular text not null,
  cpf text not null default '',
  endereco text not null default '',
  placa text not null,
  created_at timestamptz not null default now()
);

-- ========== PEDIDOS ==========
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  motoboy_id uuid references public.motoboys(id) on delete set null,
  cliente text not null,
  telefone text not null default '',
  endereco text not null,
  valor numeric(10, 2) not null,
  pagamento text not null check (pagamento in ('pix', 'dinheiro', 'cartao')),
  status text not null default 'pendente' check (status in ('pendente', 'em_rota', 'entregue')),
  created_at timestamptz not null default now()
);

create index if not exists pedidos_status_idx on public.pedidos (status);
create index if not exists pedidos_cliente_id_idx on public.pedidos (cliente_id);
create index if not exists pedidos_motoboy_id_idx on public.pedidos (motoboy_id);

-- ========== RLS (Row Level Security) ==========
-- Este é um painel interno, sem tela de login. Para o app funcionar direto
-- com a chave pública (anon key), liberamos leitura/escrita para qualquer
-- requisição que use essa chave.
--
-- ATENÇÃO: isso significa que qualquer pessoa que descobrir a URL e a chave
-- anon do seu projeto (que ficam visíveis no código do site publicado)
-- consegue ler e alterar os dados — incluindo CPF e endereço de motoboys e
-- clientes. Para um painel interno de uso restrito da equipe, o risco é
-- baixo, mas se isso te preocupar, o próximo passo recomendado é adicionar
-- login (Supabase Auth) e trocar essas políticas por regras que exigem
-- usuário autenticado.

alter table public.clientes enable row level security;
alter table public.motoboys enable row level security;
alter table public.pedidos enable row level security;

create policy "clientes: acesso total (anon)" on public.clientes
  for all using (true) with check (true);

create policy "motoboys: acesso total (anon)" on public.motoboys
  for all using (true) with check (true);

create policy "pedidos: acesso total (anon)" on public.pedidos
  for all using (true) with check (true);

-- ========== REALTIME ==========
-- Habilita a transmissão de mudanças em tempo real para essas tabelas,
-- assim a fila de despacho atualiza sozinha em qualquer tela aberta.
alter publication supabase_realtime add table public.clientes;
alter publication supabase_realtime add table public.motoboys;
alter publication supabase_realtime add table public.pedidos;

-- ========== DADOS DE EXEMPLO (opcional) ==========
-- Descomente as linhas abaixo se quiser começar com os mesmos dados de
-- exemplo que já apareciam no protótipo.

-- with novos_clientes as (
--   insert into public.clientes (nome, telefone, endereco, observacoes) values
--     ('Ana Beatriz', '(79) 99911-2233', 'Rua Laranjeiras, 210 — Jardins', ''),
--     ('Ricardo Melo', '(79) 98822-1144', 'Av. Beira Mar, 1900 — Atalaia', 'prefere pagar em dinheiro'),
--     ('Fernanda Alves', '(79) 99700-5566', 'Rua Itabaianinha, 88 — Centro', '')
--   returning id, nome
-- ),
-- novos_motoboys as (
--   insert into public.motoboys (nome_completo, credencial, celular, cpf, endereco, placa) values
--     ('Carlos Eduardo Santos', 'MT-2024-0113', '(79) 99123-4455', '123.456.789-00', 'Rua dos Coqueiros, 45 — Coroa do Meio', 'QRS1A23'),
--     ('Junior Pereira Lima', 'MT-2024-0114', '(79) 99234-5566', '234.567.890-11', 'Av. Ivo do Prado, 302 — Centro', 'QRS2B34'),
--     ('Marcos Vinícius Souza', 'MT-2024-0115', '(79) 99345-6677', '345.678.901-22', 'Rua São Cristóvão, 78 — Getúlio Vargas', 'QRS3C45')
--   returning id, nome_completo
-- )
-- insert into public.pedidos (cliente_id, motoboy_id, cliente, telefone, endereco, valor, pagamento, status)
-- select c.id, m.id, c.nome, '', c.endereco, 22, 'pix', 'entregue'
-- from novos_clientes c, novos_motoboys m
-- where c.nome = 'Ana Beatriz' and m.nome_completo = 'Junior Pereira Lima';
