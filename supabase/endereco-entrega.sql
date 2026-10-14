-- Adiciona o endereço de entrega aos pedidos.
-- A coluna "endereco" que já existia passa a ser o endereço de COLETA.
-- Rode no SQL Editor do Supabase ANTES de publicar a versão nova do site.

alter table public.pedidos
  add column if not exists endereco_entrega text not null default '';
