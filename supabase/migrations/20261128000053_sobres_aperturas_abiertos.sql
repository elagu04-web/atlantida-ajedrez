-- Sólo registra la presentación de un sobre ya ganado por una partida oficial.
-- No concede cartas, modifica premios, cuentas ni inventarios de figuritas.
create table album_privado.sobres_aperturas_abiertos(
 usuario_id uuid not null references auth.users(id) on delete cascade,
 partida_id uuid not null,
 abierto_en timestamptz not null default now(),
 primary key(usuario_id,partida_id)
);
alter table album_privado.sobres_aperturas_abiertos enable row level security;
revoke all on album_privado.sobres_aperturas_abiertos from public,anon,authenticated;

create function album_privado.sobre_aperturas(p_partida uuid,p_abrir boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare usuario uuid:=auth.uid();jugador uuid;
begin
 if usuario is null then raise exception 'Iniciá sesión para abrir tus sobres.' using errcode='42501';end if;
 jugador:=club_online_privado.jugador(usuario);
 if jugador is null then raise exception 'Vinculá tu jugador del club.' using errcode='42501';end if;
 if p_abrir then
  if p_partida is null or not exists(
   select 1 from partidas_publicas_privado.oficiales
   where id=p_partida and jugador in(blancas_id,negras_id)
    and jsonb_array_length(movimientos) between 4 and 2000
  ) then raise exception 'Ese sobre no corresponde a una partida oficial tuya.' using errcode='42501';end if;
  insert into album_privado.sobres_aperturas_abiertos(usuario_id,partida_id)
   values(usuario,p_partida) on conflict do nothing;
 end if;
 return jsonb_build_object('abiertos',coalesce((select jsonb_agg(partida_id order by abierto_en,partida_id)
  from album_privado.sobres_aperturas_abiertos where usuario_id=usuario),'[]'::jsonb));
end;
$$;
revoke all on function album_privado.sobre_aperturas(uuid,boolean) from public,anon;
grant execute on function album_privado.sobre_aperturas(uuid,boolean) to authenticated;

create function public.album_sobres_aperturas(p_partida uuid default null,p_abrir boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select album_privado.sobre_aperturas(p_partida,p_abrir);
$$;
revoke all on function public.album_sobres_aperturas(uuid,boolean) from public,anon;
grant execute on function public.album_sobres_aperturas(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
