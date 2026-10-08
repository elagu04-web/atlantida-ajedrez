-- Pagos y asistencia privados. No altera resultados, Elo ni políticas de torneos.
begin;
create table if not exists public.torneos_control (
  id uuid primary key references public.torneos(id) on delete cascade,
  pagaron_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(pagaron_ids) = 'array'),
  asistieron_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(asistieron_ids) = 'array'),
  created_at timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table public.torneos_control enable row level security;
revoke all on public.torneos_control from public, anon, authenticated;
grant select, insert, update on public.torneos_control to authenticated;

drop policy if exists control_admin_lectura on public.torneos_control;
create policy control_admin_lectura on public.torneos_control for select to authenticated
  using ((select auth.uid()) is not null and lower((select auth.jwt())->>'email') = 'elagu04@gmail.com');
drop policy if exists control_admin_alta on public.torneos_control;
create policy control_admin_alta on public.torneos_control for insert to authenticated
  with check ((select auth.uid()) is not null and lower((select auth.jwt())->>'email') = 'elagu04@gmail.com');
drop policy if exists control_admin_cambio on public.torneos_control;
create policy control_admin_cambio on public.torneos_control for update to authenticated
  using ((select auth.uid()) is not null and lower((select auth.jwt())->>'email') = 'elagu04@gmail.com')
  with check ((select auth.uid()) is not null and lower((select auth.jwt())->>'email') = 'elagu04@gmail.com');

notify pgrst, 'reload schema';
commit;
