begin;
create schema torneos_online_privado;
revoke all on schema torneos_online_privado from public,anon;
grant usage on schema torneos_online_privado to authenticated,service_role;
create table public.online_torneos(
 id uuid primary key,organizador_id uuid not null references auth.users(id),nombre text not null check(length(nombre) between 3 and 90),
 formato text not null check(formato in('suizo','round-robin')),ritmo text not null check(ritmo in('10+3','5+3','3+2')),por_elo boolean not null default false,
 estado text not null default 'abierto' check(estado in('abierto','en_curso','finalizado','cancelado')),
 max_rondas integer not null check(max_rondas between 1 and 31),dias_ronda integer not null default 3 check(dias_ronda between 1 and 14),
 ronda_actual integer not null default 0,version integer not null default 1,limite_ronda timestamptz,creada timestamptz not null default now(),actualizada timestamptz not null default now()
);
create table public.online_torneo_jugadores(
 torneo_id uuid references public.online_torneos(id) on delete cascade,usuario_id uuid references auth.users(id) on delete cascade,
 nombre text not null check(length(nombre) between 1 and 70),elo integer not null,creada timestamptz not null default now(),primary key(torneo_id,usuario_id)
);
create table public.online_torneo_cruces(
 torneo_id uuid not null references public.online_torneos(id) on delete cascade,ronda integer not null check(ronda between 1 and 31),mesa integer not null check(mesa between 1 and 16),
 blancas_id uuid not null,negras_id uuid,partida_id uuid unique references public.online_partidas(id) on delete set null,
 resultado_manual text check(resultado_manual in('1-0','0-1','1/2-1/2','0-0')),primary key(torneo_id,ronda,mesa),check(negras_id is null or blancas_id<>negras_id)
);
create table torneos_online_privado.coordinacion(
 torneo_id uuid not null,ronda integer not null,mesa integer not null,propuesta timestamptz,propuesta_por uuid,aceptada boolean not null default false,
 listo_w timestamptz,listo_b timestamptz,mensajes jsonb not null default '[]' check(jsonb_typeof(mensajes)='array' and jsonb_array_length(mensajes)<=40),
 primary key(torneo_id,ronda,mesa),foreign key(torneo_id,ronda,mesa) references public.online_torneo_cruces(torneo_id,ronda,mesa) on delete cascade
);
alter table public.online_torneos enable row level security;
alter table public.online_torneo_jugadores enable row level security;
alter table public.online_torneo_cruces enable row level security;
alter table torneos_online_privado.coordinacion enable row level security;
revoke all on public.online_torneos,public.online_torneo_jugadores,public.online_torneo_cruces,torneos_online_privado.coordinacion from public,anon,authenticated;
grant select on public.online_torneos,public.online_torneo_jugadores,public.online_torneo_cruces to authenticated;
grant all on public.online_torneos,public.online_torneo_jugadores,public.online_torneo_cruces,torneos_online_privado.coordinacion to service_role;
create policy torneos_online_lectura on public.online_torneos for select to authenticated using((select auth.uid()) is not null and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create policy torneos_online_jugadores on public.online_torneo_jugadores for select to authenticated using((select auth.uid()) is not null and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create policy torneos_online_cruces on public.online_torneo_cruces for select to authenticated using((select auth.uid()) is not null and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create index torneos_online_creados on public.online_torneos(creada desc);
create index torneos_online_organizador on public.online_torneos(organizador_id);
create index torneos_online_usuario on public.online_torneo_jugadores(usuario_id,torneo_id);
alter table public.online_partidas add column torneo_id uuid references public.online_torneos(id);
create index online_partidas_torneo on public.online_partidas(torneo_id) where torneo_id is not null;
drop index public.online_una_invitacion;
create unique index online_una_invitacion on public.online_partidas(creador_id) where estado->>'fase'='espera' and torneo_id is null;

create function torneos_online_privado.usuario() returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Iniciá sesión para entrar al torneo.';end if;return auth.uid();
end $$;
create function torneos_online_privado.crear(p_id uuid,p_nombre text,p_formato text,p_ritmo text,p_rondas integer,p_elo boolean,p_dias integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();begin
 if u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid then raise exception 'Solo el organizador del club puede crear torneos.';end if;
 if p_id is null or p_nombre is null or length(trim(p_nombre)) not between 3 and 90 or p_formato not in('suizo','round-robin') or p_ritmo not in('3+2','5+3','10+3') or p_rondas is null or p_rondas not between 1 and 15 or p_dias is null or p_dias not between 1 and 14 or p_elo is null then raise exception 'Revisá el nombre, formato, ritmo y rondas.';end if;
 insert into public.online_torneos(id,organizador_id,nombre,formato,ritmo,max_rondas,por_elo,dias_ronda) values(p_id,u,trim(p_nombre),p_formato,p_ritmo,p_rondas,p_elo,p_dias) on conflict(id) do nothing;
 return p_id;
end $$;
create function torneos_online_privado.inscribir(p_id uuid,p_anotar boolean,p_acepta_elo boolean) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;n text;cuenta auth.users;cantidad integer;begin
 select * into t from public.online_torneos where id=p_id for update;
 if not found or t.estado<>'abierto' then raise exception 'La inscripción ya está cerrada.';end if;
 if p_anotar is not true then delete from public.online_torneo_jugadores where torneo_id=p_id and usuario_id=u;update public.online_torneos set version=version+1,actualizada=now() where id=p_id;return;end if;
 if t.por_elo and p_acepta_elo is not true then raise exception 'Confirmá que las partidas cuentan para el Elo online.';end if;
 if exists(select 1 from public.online_torneo_jugadores where torneo_id=p_id and usuario_id=u) then return;end if;
 if (select count(*) from public.online_torneo_jugadores where torneo_id=p_id)>=32 then raise exception 'El torneo llegó a 32 jugadores.';end if;
 select * into cuenta from auth.users where id=u;
 select count(*),min(coalesce(nullif(trim(j.apodo),''),trim(j.nombre))) into cantidad,n from public.jugadores j where lower(trim(j.email))=lower(trim(cuenta.email));
 if cantidad<>1 then n:=coalesce(nullif(trim(cuenta.raw_user_meta_data->>'full_name'),''),'Jugador del club');end if;
 n:=left(regexp_replace(n,E'[\\x00-\\x1f\\x7f\\[\\]"\\\\]','','g'),70);
 insert into public.online_torneo_jugadores(torneo_id,usuario_id,nombre,elo) values(p_id,u,coalesce(nullif(n,''),'Jugador del club'),coalesce((select elo from public.online_elo where usuario_id=u),1400));
 update public.online_torneos set version=version+1,actualizada=now() where id=p_id;
end $$;
create function torneos_online_privado.obtener(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;begin
 select * into t from public.online_torneos where id=p_id;
 if not found then raise exception 'No encontramos el torneo.';end if;
 if t.estado='en_curso' and t.ronda_actual>=t.max_rondas and not exists(
 select 1 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id and c.negras_id is not null and c.resultado_manual is null and coalesce(p.estado->>'fase','pendiente')<>'terminada') then
 update public.online_torneos set estado='finalizado',version=version+1,actualizada=now() where id=p_id and estado='en_curso' returning * into t;
 if not found then select * into t from public.online_torneos where id=p_id;end if;
 end if;
 return jsonb_build_object('torneo',to_jsonb(t),'jugadores',coalesce((select jsonb_agg(to_jsonb(j) order by j.creada,j.usuario_id) from public.online_torneo_jugadores j where j.torneo_id=p_id),'[]'),
 'cruces',coalesce((select jsonb_agg(jsonb_build_object('ronda',c.ronda,'mesa',c.mesa,'blancasId',c.blancas_id,'negrasId',c.negras_id,'partidaId',c.partida_id,
 'resultado',coalesce(c.resultado_manual,case when p.estado->>'fase'='terminada' then p.estado->>'resultado' else null end),'manual',c.resultado_manual is not null,
 'fase',case when c.negras_id is null then 'descanso' when c.resultado_manual is not null then 'terminada' else coalesce(p.estado->>'fase','coordinar') end,
 'vence',case when p.estado->>'fase'='activa' then (p.estado->>'desde')::numeric+case p.estado->>'turno' when 'w' then (p.estado->>'blancasMs')::numeric else (p.estado->>'negrasMs')::numeric end else null end,
 'coordinacion',case when u in(c.blancas_id,c.negras_id) then (select to_jsonb(co)-'torneo_id'-'ronda'-'mesa' from torneos_online_privado.coordinacion co where (co.torneo_id,co.ronda,co.mesa)=(c.torneo_id,c.ronda,c.mesa)) else null end) order by c.ronda,c.mesa)
 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id),'[]'));
end $$;
create function torneos_online_privado.listar() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();begin
 return coalesce((select jsonb_agg(x order by x.creada desc) from (select t.*,(select count(*) from public.online_torneo_jugadores j where j.torneo_id=t.id) as inscriptos,exists(select 1 from public.online_torneo_jugadores j where j.torneo_id=t.id and j.usuario_id=u) as anotado from public.online_torneos t order by t.creada desc limit 40)x),'[]');
end $$;
create function torneos_online_privado.publicar(p_id uuid,p_version integer,p_cruces jsonb) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;e jsonb;w uuid;b uuid;ids uuid[];jugadores uuid[];n integer;r integer;cantidad integer;objetivo integer;begin
 select * into t from public.online_torneos where id=p_id for update;
 if not found or t.organizador_id<>u then raise exception 'Solo el organizador puede publicar una ronda.';end if;
 if t.version is distinct from p_version then raise exception 'Cambió la inscripción o la ronda. Actualizá antes de publicar.';end if;
 if t.estado not in('abierto','en_curso') then raise exception 'El torneo está cerrado.';end if;
 if exists(select 1 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id and c.negras_id is not null and c.resultado_manual is null and coalesce(p.estado->>'fase','pendiente')<>'terminada') then raise exception 'Faltan partidas de la ronda anterior.';end if;
 select array_agg(usuario_id order by creada,usuario_id),count(*) into jugadores,n from public.online_torneo_jugadores where torneo_id=p_id;
 if n<2 then raise exception 'Se necesitan al menos dos jugadores.';end if;
 objetivo:=case when t.formato='round-robin' then n-1+(n%2) else least(t.max_rondas,n-1+(n%2)) end;r:=t.ronda_actual+1;
 if r>objetivo then raise exception 'Ya se jugaron todas las rondas.';end if;
 if p_cruces is null or jsonb_typeof(p_cruces)<>'array' or jsonb_array_length(p_cruces)<>(n+1)/2 then raise exception 'Emparejamiento incompleto.';end if;
 ids:=array[]::uuid[];cantidad:=0;
 for e in select value from jsonb_array_elements(p_cruces) loop
 w:=(e->>'blancasId')::uuid;b:=(e->>'negrasId')::uuid;
 if w is null or not(w=any(jugadores)) or w=any(ids) then raise exception 'Jugador repetido o ajeno al torneo.';end if;ids:=array_append(ids,w);
 if b is not null then
 if b=w or not(b=any(jugadores)) or b=any(ids) then raise exception 'Jugador repetido o ajeno al torneo.';end if;ids:=array_append(ids,b);
 if exists(select 1 from public.online_torneo_cruces c where c.torneo_id=p_id and ((c.blancas_id=w and c.negras_id=b) or (c.blancas_id=b and c.negras_id=w)) and c.resultado_manual is distinct from '0-0') then raise exception 'Ese enfrentamiento ya se jugó.';end if;
 else cantidad:=cantidad+1;end if;
 end loop;
 if cardinality(ids)<>n or cantidad<>n%2 then raise exception 'Hay jugadores sin asignar o descansos de más.';end if;
 cantidad:=0;for e in select value from jsonb_array_elements(p_cruces) loop
 cantidad:=cantidad+1;w:=(e->>'blancasId')::uuid;b:=(e->>'negrasId')::uuid;
 insert into public.online_torneo_cruces(torneo_id,ronda,mesa,blancas_id,negras_id) values(p_id,r,cantidad,w,b);
 if b is not null then insert into torneos_online_privado.coordinacion(torneo_id,ronda,mesa) values(p_id,r,cantidad);end if;
 end loop;
 update public.online_torneos set estado='en_curso',ronda_actual=r,max_rondas=objetivo,limite_ronda=clock_timestamp()+make_interval(days=>t.dias_ronda),version=version+1,actualizada=now() where id=p_id;
end $$;
create function torneos_online_privado.coordinar(p_id uuid,p_ronda integer,p_mesa integer,p_accion text,p_texto text,p_hora timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;c public.online_torneo_cruces;co torneos_online_privado.coordinacion;n text;w text;b text;gid uuid;ms integer;est jsonb;x uuid;reloj numeric;begin
 select * into t from public.online_torneos where id=p_id for update;
 select * into c from public.online_torneo_cruces where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa) for update;
 if not found or c.negras_id is null or u not in(c.blancas_id,c.negras_id) then raise exception 'Este espacio pertenece a los dos rivales.';end if;
 if t.estado<>'en_curso' or t.ronda_actual<>p_ronda or c.resultado_manual is not null then raise exception 'Este cruce ya está cerrado.';end if;
 select * into co from torneos_online_privado.coordinacion where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa) for update;
 if p_accion='mensaje' then
 if p_texto is null or length(trim(p_texto)) not between 1 and 500 then raise exception 'Escribí un mensaje de hasta 500 caracteres.';end if;
 select nombre into n from public.online_torneo_jugadores where torneo_id=p_id and usuario_id=u;
 co.mensajes:=(case when jsonb_array_length(co.mensajes)>=40 then co.mensajes-0 else co.mensajes end)||jsonb_build_array(jsonb_build_object('usuario',u,'nombre',n,'texto',trim(p_texto),'fecha',clock_timestamp()));
 elsif c.partida_id is not null then raise exception 'La partida ya está creada. Entrá a tu mesa.';
 elsif p_accion='proponer' then
 if p_hora is null or p_hora<clock_timestamp()-interval '1 minute' or p_hora>clock_timestamp()+interval '90 days' then raise exception 'Elegí un horario futuro, dentro de los próximos 90 días.';end if;
 co.propuesta:=p_hora;co.propuesta_por:=u;co.aceptada:=false;co.listo_w:=null;co.listo_b:=null;
 elsif p_accion='aceptar' then
 if co.propuesta is null or co.propuesta_por=u then raise exception 'No hay una propuesta del rival para aceptar.';end if;co.aceptada:=true;
 elsif p_accion in('listo','no_listo') then
 if u=c.blancas_id then co.listo_w:=case when p_accion='listo' then clock_timestamp() else null end;else co.listo_b:=case when p_accion='listo' then clock_timestamp() else null end;end if;
 if co.listo_w>clock_timestamp()-interval '2 minutes' and co.listo_b>clock_timestamp()-interval '2 minutes' then
 -- Lock both accounts in a stable order before checking active games.
 for x in select z from unnest(array[c.blancas_id,c.negras_id]) z order by z loop perform pg_advisory_xact_lock(hashtextextended(x::text,0));end loop;
 if exists(select 1 from public.online_partidas p where p.estado->>'fase'='activa' and (p.creador_id in(c.blancas_id,c.negras_id) or p.rival_id in(c.blancas_id,c.negras_id))) then raise exception 'Uno de los dos tiene otra partida en juego. Termínenla antes de empezar.';end if;
 select nombre into w from public.online_torneo_jugadores where torneo_id=p_id and usuario_id=c.blancas_id;
 select nombre into b from public.online_torneo_jugadores where torneo_id=p_id and usuario_id=c.negras_id;
 if w is null or b is null then raise exception 'Una de las cuentas ya no está disponible.';end if;
 gid:=gen_random_uuid();ms:=case t.ritmo when '3+2' then 180000 when '5+3' then 300000 else 600000 end;
 est:=jsonb_build_object('torneoNombre',t.nombre,'torneoRonda',p_ronda,'porElo',t.por_elo,'fase','espera','ritmo',t.ritmo,'colorCreador','w','blancas',w,'negras',b,'fen','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','movimientos','[]'::jsonb,'pgn','','turno','w','blancasMs',ms,'negrasMs',ms,'desde',null,'oferta',null,'resultado','*','motivo','');
 insert into public.online_partidas(id,creador_id,rival_id,estado,torneo_id) values(gid,c.blancas_id,c.negras_id,est,p_id);
 reloj:=floor(extract(epoch from clock_timestamp())*1000);
 update public.online_partidas set estado=estado||jsonb_build_object('fase','activa','desde',reloj),version=version+1,actualizada=clock_timestamp() where id=gid;
 update public.online_torneo_cruces set partida_id=gid where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa);
 end if;
 else raise exception 'Acción de coordinación no válida.';end if;
 update torneos_online_privado.coordinacion set propuesta=co.propuesta,propuesta_por=co.propuesta_por,aceptada=co.aceptada,listo_w=co.listo_w,listo_b=co.listo_b,mensajes=co.mensajes where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa);
end $$;
create function torneos_online_privado.resolver(p_id uuid,p_ronda integer,p_mesa integer,p_resultado text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;c public.online_torneo_cruces;begin
 select * into t from public.online_torneos where id=p_id for update;
 if not found or t.organizador_id<>u or t.estado<>'en_curso' or t.ronda_actual<>p_ronda then raise exception 'Solo el organizador puede resolver un cruce pendiente de esta ronda.';end if;
 select * into c from public.online_torneo_cruces where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa) for update;
 if not found or c.negras_id is null or c.partida_id is not null then raise exception 'Solo se resuelven cruces que todavía no comenzaron.';end if;
 if p_resultado is null or p_resultado not in('1-0','0-1','1/2-1/2','0-0') then raise exception 'Resultado no válido.';end if;
 update public.online_torneo_cruces set resultado_manual=p_resultado where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa);
 update torneos_online_privado.coordinacion set listo_w=null,listo_b=null where (torneo_id,ronda,mesa)=(p_id,p_ronda,p_mesa);
 update public.online_torneos set version=version+1,actualizada=now() where id=p_id;
end $$;
create function torneos_online_privado.cancelar(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();begin
 perform 1 from public.online_torneos where id=p_id and organizador_id=u and estado in('abierto','en_curso') for update;
 if not found then raise exception 'No se puede cancelar este torneo.';end if;
 if exists(select 1 from public.online_partidas where torneo_id=p_id and estado->>'fase'='activa') then raise exception 'Primero deben terminar las partidas en juego.';end if;
 update public.online_torneos set estado='cancelado',version=version+1,actualizada=now() where id=p_id;
end $$;
-- Public entry points are invokers; privileged implementations live outside the Data API schema.
create function public.crear_torneo_online(p_id uuid,p_nombre text,p_formato text,p_ritmo text,p_rondas integer,p_elo boolean,p_dias integer) returns uuid language sql security invoker set search_path='' as $$select torneos_online_privado.crear(p_id,p_nombre,p_formato,p_ritmo,p_rondas,p_elo,p_dias)$$;
create function public.inscribir_torneo_online(p_id uuid,p_anotar boolean,p_acepta_elo boolean default false) returns void language sql security invoker set search_path='' as $$select torneos_online_privado.inscribir(p_id,p_anotar,p_acepta_elo)$$;
create function public.obtener_torneo_online(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select torneos_online_privado.obtener(p_id)$$;
create function public.listar_torneos_online() returns jsonb language sql security invoker set search_path='' as $$select torneos_online_privado.listar()$$;
create function public.publicar_ronda_online(p_id uuid,p_version integer,p_cruces jsonb) returns void language sql security invoker set search_path='' as $$select torneos_online_privado.publicar(p_id,p_version,p_cruces)$$;
create function public.coordinar_torneo_online(p_id uuid,p_ronda integer,p_mesa integer,p_accion text,p_texto text default null,p_hora timestamptz default null) returns void language sql security invoker set search_path='' as $$select torneos_online_privado.coordinar(p_id,p_ronda,p_mesa,p_accion,p_texto,p_hora)$$;
create function public.resolver_cruce_online(p_id uuid,p_ronda integer,p_mesa integer,p_resultado text) returns void language sql security invoker set search_path='' as $$select torneos_online_privado.resolver(p_id,p_ronda,p_mesa,p_resultado)$$;
create function public.cancelar_torneo_online(p_id uuid) returns void language sql security invoker set search_path='' as $$select torneos_online_privado.cancelar(p_id)$$;
revoke all on all functions in schema torneos_online_privado from public,anon;
grant execute on all functions in schema torneos_online_privado to authenticated,service_role;
revoke all on function public.crear_torneo_online(uuid,text,text,text,integer,boolean,integer),public.inscribir_torneo_online(uuid,boolean,boolean),public.obtener_torneo_online(uuid),public.listar_torneos_online(),public.publicar_ronda_online(uuid,integer,jsonb),public.coordinar_torneo_online(uuid,integer,integer,text,text,timestamptz),public.resolver_cruce_online(uuid,integer,integer,text),public.cancelar_torneo_online(uuid) from public,anon;
grant execute on function public.crear_torneo_online(uuid,text,text,text,integer,boolean,integer),public.inscribir_torneo_online(uuid,boolean,boolean),public.obtener_torneo_online(uuid),public.listar_torneos_online(),public.publicar_ronda_online(uuid,integer,jsonb),public.coordinar_torneo_online(uuid,integer,integer,text,text,timestamptz),public.resolver_cruce_online(uuid,integer,integer,text),public.cancelar_torneo_online(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
