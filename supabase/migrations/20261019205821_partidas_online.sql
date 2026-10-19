begin;
create table public.online_partidas (
 id uuid primary key,
 creador_id uuid not null references auth.users(id) on delete cascade,
 rival_id uuid references auth.users(id) on delete cascade,
 estado jsonb not null check(jsonb_typeof(estado)='object' and estado->>'fase' in ('espera','activa','terminada','cancelada')),
 version integer not null default 1 check(version>0),
 ultima_accion uuid,
 creada timestamptz not null default now(),
 actualizada timestamptz not null default now(),
 expira timestamptz not null default (now()+interval '30 minutes'),
 check(rival_id is null or rival_id<>creador_id)
);
alter table public.online_partidas enable row level security;
revoke all on public.online_partidas from public,anon,authenticated;
grant select on public.online_partidas to authenticated;
grant all on public.online_partidas to service_role;
create policy online_leer on public.online_partidas for select to authenticated using (
 (select auth.uid())=creador_id or (select auth.uid())=rival_id
 or (estado->>'fase'='espera' and expira>now())
);
-- All mutations go through the authenticated Edge Function. Browser clients
-- cannot edit clocks, colors, participants, results or legal move history.
create unique index online_una_invitacion on public.online_partidas(creador_id) where estado->>'fase'='espera';
create index online_creador_historial on public.online_partidas(creador_id,actualizada desc);
create index online_rival_historial on public.online_partidas(rival_id,actualizada desc) where rival_id is not null;
create index online_espera on public.online_partidas(expira desc) where estado->>'fase'='espera';
alter publication supabase_realtime add table public.online_partidas;
notify pgrst,'reload schema';
commit;
