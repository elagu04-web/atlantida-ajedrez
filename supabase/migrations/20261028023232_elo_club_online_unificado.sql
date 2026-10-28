begin;
create schema club_online_privado;
revoke all on schema club_online_privado from public,anon;
grant usage on schema club_online_privado to authenticated,service_role;
-- Public sporting results contain player ids, never Auth ids, email or PGN.
create table public.partidas_club_online(
 id uuid primary key,blancas_id uuid not null references public.jugadores(id),negras_id uuid not null references public.jugadores(id),
 resultado text not null check(resultado in('1-0','0-1','1/2-1/2')),torneo text not null,
 created_at timestamptz not null default clock_timestamp(),dia date generated always as ((created_at at time zone 'America/Montevideo')::date) stored,
 check(blancas_id<>negras_id)
);
create index club_online_blancas on public.partidas_club_online(blancas_id,created_at);
create index club_online_negras on public.partidas_club_online(negras_id,created_at);
alter table public.partidas_club_online enable row level security;
revoke all on public.partidas_club_online from public,anon,authenticated;
grant select on public.partidas_club_online to anon,authenticated;
grant all on public.partidas_club_online to service_role;
create policy resultados_club_publicos on public.partidas_club_online for select to anon,authenticated using(true);

create function club_online_privado.jugador(p_usuario uuid) returns uuid language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then min(j.id::text)::uuid else null end
 from auth.users u join public.jugadores j on lower(trim(j.email))=lower(trim(u.email))
 where u.id=p_usuario and u.email_confirmed_at is not null
$$;

-- Replay the same chronological K=20, minimum=1400 rules as lib/elo.ts.
-- Historical imports marked excluir_elo contribute history, not rating twice.
create function club_online_privado.ratings() returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ratings jsonb;f record;w jsonb;b jsonb;ew integer;eb integer;nw integer;nb integer;s double precision;begin
 select coalesce(jsonb_object_agg(id::text,jsonb_build_object('elo',elo_inicial,'partidas',0,'victorias',0,'tablas',0,'derrotas',0)),'{}') into ratings from public.jugadores;
 for f in
  select * from (
   select coalesce(t.iniciado_en,t.created_at) fecha,t.id::text llave,coalesce((r->>'numero')::int,0) ronda,e.orden,
    e.valor->>'blancasId' blancas,e.valor->>'negrasId' negras,e.valor->>'resultado' resultado,not coalesce(t.excluir_elo,false) aplica
   from public.torneos t cross join lateral jsonb_array_elements(coalesce(t.rondas,'[]')) r
   cross join lateral jsonb_array_elements(coalesce(r->'emparejamientos','[]')) with ordinality e(valor,orden)
   where e.valor->>'negrasId' is not null and e.valor->>'resultado' in('1-0','0-1','1/2-1/2')
   union all
   select created_at,'online:'||id::text,1,1,blancas_id::text,negras_id::text,resultado,true from public.partidas_club_online
  ) eventos order by fecha,llave,ronda,orden
 loop
  w:=ratings->f.blancas;b:=ratings->f.negras;if w is null or b is null then continue;end if;
  ew:=(w->>'elo')::int;eb:=(b->>'elo')::int;s:=case f.resultado when '1-0' then 1 when '0-1' then 0 else 0.5 end;
  nw:=ew;nb:=eb;if f.aplica then
   nw:=greatest(1400,floor(ew+20*(s-1/(1+power(10::double precision,(eb-ew)::double precision/400)))+0.5)::int);
   nb:=greatest(1400,floor(eb+20*((1-s)-1/(1+power(10::double precision,(ew-eb)::double precision/400)))+0.5)::int);
  end if;
  w:=jsonb_build_object('elo',nw,'partidas',(w->>'partidas')::int+1,'victorias',(w->>'victorias')::int+(s=1)::int,'tablas',(w->>'tablas')::int+(s=0.5)::int,'derrotas',(w->>'derrotas')::int+(s=0)::int);
  b:=jsonb_build_object('elo',nb,'partidas',(b->>'partidas')::int+1,'victorias',(b->>'victorias')::int+(s=0)::int,'tablas',(b->>'tablas')::int+(s=0.5)::int,'derrotas',(b->>'derrotas')::int+(s=1)::int);
  ratings:=jsonb_set(jsonb_set(ratings,array[f.blancas],w),array[f.negras],b);
 end loop;return ratings;
end $$;
create function club_online_privado.bloquear() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform pg_advisory_xact_lock(hashtextextended('atlantida-elo-club',0));return null;end $$;
create trigger club_elo_torneos before insert or update or delete on public.torneos for each statement execute function club_online_privado.bloquear();
create trigger club_elo_jugadores before insert or update or delete on public.jugadores for each statement execute function club_online_privado.bloquear();

create function club_online_privado.mi_resumen() returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare u uuid:=auth.uid();j uuid;begin
 if u is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Iniciá sesión para consultar tu Elo.';end if;
 j:=club_online_privado.jugador(u);if j is null then return jsonb_build_object('vinculado',false,'elo',null,'partidas',0,'victorias',0,'tablas',0,'derrotas',0);end if;
 return (club_online_privado.ratings()->j::text)||jsonb_build_object('vinculado',true,'jugadorId',j);
end $$;
create function public.mi_elo_club() returns jsonb language sql security invoker set search_path='' as $$select club_online_privado.mi_resumen()$$;

lock table public.online_partidas in share row exclusive mode;
do $$begin
 if exists(select 1 from public.online_partidas where estado->>'fase'='activa' and coalesce((estado->>'porElo')::boolean,false)) then raise exception 'Hay partidas por Elo en curso. Terminen esas partidas antes de activar el Elo unificado.';end if;
 if exists(select 1 from public.online_partidas p where p.estado->>'fase'='terminada' and coalesce((p.estado->>'porElo')::boolean,false) and (club_online_privado.jugador(p.creador_id) is null or club_online_privado.jugador(p.rival_id) is null)) then raise exception 'Hay una partida por Elo anterior sin ambos perfiles vinculados. Revisá el vínculo antes de unificar.';end if;
end $$;
insert into public.partidas_club_online(id,blancas_id,negras_id,resultado,torneo,created_at)
 select p.id,club_online_privado.jugador(case p.estado->>'colorCreador' when 'w' then p.creador_id else p.rival_id end),club_online_privado.jugador(case p.estado->>'colorCreador' when 'w' then p.rival_id else p.creador_id end),p.estado->>'resultado','Online · '||coalesce(nullif(p.estado->>'torneoNombre',''),'Partida del club'),p.actualizada
 from public.online_partidas p where p.estado->>'fase'='terminada' and coalesce((p.estado->>'porElo')::boolean,false);

create or replace function public.online_actualizar_elo() returns trigger language plpgsql security invoker set search_path='' as $$
declare w uuid;b uuid;creador uuid;ew integer;eb integer;nw integer;nb integer;s double precision;r jsonb;n text;begin
 if tg_op='UPDATE' and coalesce((new.estado->>'porElo')::boolean,false) is distinct from coalesce((old.estado->>'porElo')::boolean,false) then raise exception 'La modalidad se elige al crear la mesa y no se puede cambiar.';end if;
 if not coalesce((new.estado->>'porElo')::boolean,false) then return new;end if;
 if tg_op='INSERT' then
  creador:=club_online_privado.jugador(new.creador_id);
  if creador is null then raise exception 'Vinculá tu jugador del club antes de jugar por Elo.';end if;
  r:=club_online_privado.ratings();new.estado:=new.estado||jsonb_build_object('eloTipo','club','eloCreador',(r->creador::text->>'elo')::int);return new;
 end if;
 if new.rival_id is null then return new;end if;
 if old.estado->>'fase'='espera' and new.estado->>'fase'='activa' then
  perform pg_advisory_xact_lock(hashtextextended('atlantida-elo-club',0));
  if new.estado->>'colorCreador'='w' then w:=club_online_privado.jugador(new.creador_id);b:=club_online_privado.jugador(new.rival_id);else w:=club_online_privado.jugador(new.rival_id);b:=club_online_privado.jugador(new.creador_id);end if;
  if w is null or b is null or w=b then raise exception 'Los dos jugadores deben vincular su propio perfil del club para jugar por Elo.';end if;
  r:=club_online_privado.ratings();
  select coalesce(nullif(trim(apodo),''),nombre) into n from public.jugadores where id=w;new.estado:=new.estado||jsonb_build_object('blancas',n);
  select coalesce(nullif(trim(apodo),''),nombre) into n from public.jugadores where id=b;new.estado:=new.estado||jsonb_build_object('negras',n);
  new.estado:=new.estado||jsonb_build_object('eloTipo','club','clubBlancasId',w,'clubNegrasId',b,'eloInicio',jsonb_build_object('w',(r->w::text->>'elo')::int,'b',(r->b::text->>'elo')::int));return new;
 end if;
 if old.estado->>'fase'<>'activa' or new.estado->>'fase'<>'terminada' then return new;end if;
 if new.estado->>'resultado' not in('1-0','0-1','1/2-1/2') then raise exception 'Resultado no válido para Elo.';end if;
 perform pg_advisory_xact_lock(hashtextextended('atlantida-elo-club',0));
 w:=nullif(old.estado->>'clubBlancasId','')::uuid;b:=nullif(old.estado->>'clubNegrasId','')::uuid;
 if w is null or b is null then
  if new.estado->>'colorCreador'='w' then w:=club_online_privado.jugador(new.creador_id);b:=club_online_privado.jugador(new.rival_id);else w:=club_online_privado.jugador(new.rival_id);b:=club_online_privado.jugador(new.creador_id);end if;
 end if;
 if w is null or b is null or w=b then raise exception 'Falta vincular los perfiles para registrar el Elo del club.';end if;
 r:=club_online_privado.ratings();ew:=(r->w::text->>'elo')::int;eb:=(r->b::text->>'elo')::int;
 s:=case new.estado->>'resultado' when '1-0' then 1 when '0-1' then 0 else 0.5 end;
 nw:=greatest(1400,floor(ew+20*(s-1/(1+power(10::double precision,(eb-ew)::double precision/400)))+0.5)::int);
 nb:=greatest(1400,floor(eb+20*((1-s)-1/(1+power(10::double precision,(ew-eb)::double precision/400)))+0.5)::int);
 insert into public.partidas_club_online(id,blancas_id,negras_id,resultado,torneo) values(new.id,w,b,new.estado->>'resultado','Online · '||coalesce(nullif(new.estado->>'torneoNombre',''),'Partida del club')) on conflict(id) do nothing;
 new.estado:=new.estado||jsonb_build_object('eloTipo','club','elo',jsonb_build_object('w',jsonb_build_object('antes',ew,'despues',nw,'variacion',nw-ew),'b',jsonb_build_object('antes',eb,'despues',nb,'variacion',nb-eb)),'pgn',format(E'[WhiteElo "%s"]\n[BlackElo "%s"]\n[WhiteRatingDiff "%s"]\n[BlackRatingDiff "%s"]\n',ew,eb,nw-ew,nb-eb)||coalesce(new.estado->>'pgn',''));
 return new;
end $$;

alter table public.online_torneo_jugadores add column jugador_id uuid references public.jugadores(id) on delete set null;
create index torneo_online_perfil on public.online_torneo_jugadores(jugador_id) where jugador_id is not null;
create function club_online_privado.inscripcion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.jugador_id:=club_online_privado.jugador(new.usuario_id);
 if exists(select 1 from public.online_torneos where id=new.torneo_id and por_elo) and new.jugador_id is null then raise exception 'Vinculá tu jugador del club antes de anotarte por Elo.';end if;
 if new.jugador_id is not null then new.elo:=(club_online_privado.ratings()->new.jugador_id::text->>'elo')::int;end if;
 return new;
end $$;
create trigger torneo_online_identidad before insert or update of usuario_id on public.online_torneo_jugadores for each row execute function club_online_privado.inscripcion();
update public.online_torneo_jugadores set jugador_id=club_online_privado.jugador(usuario_id);
-- Preserve the existing open tournament and all registrations. Only references
-- and the Elo used for seeding change; no rounds/results are regenerated.
update public.online_torneo_jugadores j set elo=(club_online_privado.ratings()->j.jugador_id::text->>'elo')::int where j.jugador_id is not null and exists(select 1 from public.online_torneos t where t.id=j.torneo_id and t.estado='abierto');

create or replace function torneos_online_privado.obtener(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;begin
 select * into t from public.online_torneos where id=p_id;
 if not found then raise exception 'No encontramos el torneo.';end if;
 if t.estado='en_curso' and t.ronda_actual>=t.max_rondas and not exists(
 select 1 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id and c.negras_id is not null and c.resultado_manual is null and coalesce(p.estado->>'fase','pendiente')<>'terminada') then
 update public.online_torneos set estado='finalizado',version=version+1,actualizada=now() where id=p_id and estado='en_curso' returning * into t;
 if not found then select * into t from public.online_torneos where id=p_id;end if;
 end if;
 return jsonb_build_object('torneo',to_jsonb(t),'jugadores',coalesce((select jsonb_agg((to_jsonb(j)||jsonb_build_object('jugador_id',coalesce(j.jugador_id,club_online_privado.jugador(j.usuario_id)))) order by j.creada,j.usuario_id) from public.online_torneo_jugadores j where j.torneo_id=p_id),'[]'),
 'cruces',coalesce((select jsonb_agg(jsonb_build_object('ronda',c.ronda,'mesa',c.mesa,'blancasId',c.blancas_id,'negrasId',c.negras_id,'partidaId',c.partida_id,
 'resultado',coalesce(c.resultado_manual,case when p.estado->>'fase'='terminada' then p.estado->>'resultado' else null end),'manual',c.resultado_manual is not null,
 'fase',case when c.negras_id is null then 'descanso' when c.resultado_manual is not null then 'terminada' else coalesce(p.estado->>'fase','coordinar') end,
 'vence',case when p.estado->>'fase'='activa' then (p.estado->>'desde')::numeric+case p.estado->>'turno' when 'w' then (p.estado->>'blancasMs')::numeric else (p.estado->>'negrasMs')::numeric end else null end,
 'coordinacion',case when u in(c.blancas_id,c.negras_id) then (select to_jsonb(co)-'torneo_id'-'ronda'-'mesa' from torneos_online_privado.coordinacion co where (co.torneo_id,co.ronda,co.mesa)=(c.torneo_id,c.ronda,c.mesa)) else null end) order by c.ronda,c.mesa)
 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id),'[]'));
end $$;

revoke all on all functions in schema club_online_privado from public,anon,authenticated;
grant execute on all functions in schema club_online_privado to service_role;
grant execute on function club_online_privado.mi_resumen() to authenticated;
revoke all on function public.mi_elo_club() from public,anon;
grant execute on function public.mi_elo_club() to authenticated;
-- Trigger functions run with the mutating role, but expose no callable data API.
grant execute on function club_online_privado.bloquear() to authenticated;
alter publication supabase_realtime add table public.partidas_club_online;
notify pgrst,'reload schema';
commit;
