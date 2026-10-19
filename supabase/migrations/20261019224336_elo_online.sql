begin;
create table public.online_elo (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 elo integer not null default 1400 check(elo>=100),
 partidas integer not null default 0 check(partidas>=0),
 victorias integer not null default 0 check(victorias>=0),
 tablas integer not null default 0 check(tablas>=0),
 derrotas integer not null default 0 check(derrotas>=0),
 actualizada timestamptz not null default now(),
 check(partidas=victorias+tablas+derrotas)
);
alter table public.online_elo enable row level security;
revoke all on public.online_elo from public,anon,authenticated;
grant select on public.online_elo to authenticated;
grant all on public.online_elo to service_role;
create policy online_elo_propio on public.online_elo for select to authenticated using(usuario_id=(select auth.uid()));

-- Runs inside the same transaction that confirms the terminal game state.
-- No service call can commit a result without committing both ratings too.
create function public.online_actualizar_elo() returns trigger
language plpgsql security invoker set search_path='' as $$
declare w uuid;b uuid;ew integer;eb integer;d integer;s numeric;calculo jsonb;es_elo boolean;
begin
 es_elo:=coalesce((new.estado->>'porElo')::boolean,false);
 if tg_op='UPDATE' then
  if es_elo is distinct from coalesce((old.estado->>'porElo')::boolean,false) then
   raise exception 'La modalidad se elige al crear la mesa y no se puede cambiar.';
  end if;
 end if;
 if not es_elo then return new;end if;
 if tg_op='INSERT' then
  select elo into ew from public.online_elo where usuario_id=new.creador_id;
  new.estado:=new.estado||jsonb_build_object('eloCreador',coalesce(ew,1400));
  return new;
 end if;
 if new.rival_id is null then return new;end if;
 if new.estado->>'colorCreador'='w' then w:=new.creador_id;b:=new.rival_id;else w:=new.rival_id;b:=new.creador_id;end if;
 if old.estado->>'fase'='espera' and new.estado->>'fase'='activa' then
  -- Always insert/lock in UUID order, including concurrent games with colors reversed.
  insert into public.online_elo(usuario_id) select u from unnest(array[w,b]) u order by u on conflict do nothing;
  select elo into ew from public.online_elo where usuario_id=w;
  select elo into eb from public.online_elo where usuario_id=b;
  new.estado:=new.estado||jsonb_build_object('eloInicio',jsonb_build_object('w',ew,'b',eb));
 end if;
 if old.estado->>'fase'<>'activa' or new.estado->>'fase'<>'terminada' then return new;end if;
 if new.estado->>'resultado' not in ('1-0','0-1','1/2-1/2') then raise exception 'Resultado no válido para Elo.';end if;
 insert into public.online_elo(usuario_id) select u from unnest(array[w,b]) u order by u on conflict do nothing;
 perform usuario_id from public.online_elo where usuario_id in(w,b) order by usuario_id for update;
 select elo into ew from public.online_elo where usuario_id=w;
 select elo into eb from public.online_elo where usuario_id=b;
 s:=case new.estado->>'resultado' when '1-0' then 1 when '0-1' then 0 else 0.5 end;
 d:=round(32*(s-1/(1+power(10::numeric,(eb-ew)::numeric/400))))::integer;
 -- Minimum 100, preserving the same signed exchange for both participants.
 d:=greatest(100-ew,least(eb-100,d));
 update public.online_elo set elo=elo+d,partidas=partidas+1,victorias=victorias+(s=1)::int,tablas=tablas+(s=0.5)::int,derrotas=derrotas+(s=0)::int,actualizada=clock_timestamp() where usuario_id=w;
 update public.online_elo set elo=elo-d,partidas=partidas+1,victorias=victorias+(s=0)::int,tablas=tablas+(s=0.5)::int,derrotas=derrotas+(s=1)::int,actualizada=clock_timestamp() where usuario_id=b;
 calculo:=jsonb_build_object('w',jsonb_build_object('antes',ew,'despues',ew+d,'variacion',d),'b',jsonb_build_object('antes',eb,'despues',eb-d,'variacion',-d));
 new.estado:=new.estado||jsonb_build_object('elo',calculo,'pgn',
  format(E'[WhiteElo "%s"]\n[BlackElo "%s"]\n[WhiteRatingDiff "%s"]\n[BlackRatingDiff "%s"]\n',ew,eb,d,-d)||coalesce(new.estado->>'pgn',''));
 return new;
end $$;
revoke all on function public.online_actualizar_elo() from public,anon,authenticated;
grant execute on function public.online_actualizar_elo() to service_role;
create trigger online_aplicar_elo before insert or update of estado on public.online_partidas for each row execute function public.online_actualizar_elo();
notify pgrst,'reload schema';
commit;
