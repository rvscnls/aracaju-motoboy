-- Aperta a segurança do banco depois que o login foi adicionado ao painel.
-- Antes, qualquer pessoa com a chave pública (anon) podia ler/gravar nas
-- tabelas. Agora só quem estiver autenticado (logado) consegue.
--
-- Rode este script no SQL Editor do Supabase DEPOIS de criar o usuário de
-- login em Authentication > Users.

drop policy if exists "clientes: acesso total (anon)" on public.clientes;
drop policy if exists "motoboys: acesso total (anon)" on public.motoboys;
drop policy if exists "pedidos: acesso total (anon)" on public.pedidos;

create policy "clientes: acesso autenticado" on public.clientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "motoboys: acesso autenticado" on public.motoboys
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "pedidos: acesso autenticado" on public.pedidos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
