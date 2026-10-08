-- Alta propia: crea y vincula un jugador a la cuenta autenticada.
-- No abre permisos de inserción/edición de jugadores a los socios.
begin;

create or replace function public.email_cuenta_jugador()
returns text language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare d_email text;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión para participar.'; end if;
  select lower(trim(u.email)) into d_email from auth.users u
    where u.id=auth.uid() and u.email_confirmed_at is not null;
  if d_email is null or d_email='' then raise exception 'Confirmá el correo de tu cuenta antes de crear tu jugador.'; end if;
  return d_email;
end;
$$;
revoke all on function public.email_cuenta_jugador() from public,anon,authenticated;

create or replace function public.crear_mi_jugador(p_nombre text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare d_email text := public.email_cuenta_jugador(); d_nombre text; d_cantidad integer; d_jugador public.jugadores%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('atlantida-jugador:'||d_email,0));
  select count(*) into d_cantidad from public.jugadores where lower(trim(email))=d_email;
  if d_cantidad>1 then raise exception 'Tu cuenta tiene varios jugadores vinculados. Avisale al club.'; end if;
  if d_cantidad=1 then
    select * into d_jugador from public.jugadores where lower(trim(email))=d_email;
    return to_jsonb(d_jugador);
  end if;
  d_nombre := trim(regexp_replace(p_nombre,'[[:space:]]+',' ','g'));
  if p_nombre is null or char_length(d_nombre) not between 2 and 80 or p_nombre ~ '[[:cntrl:]]' then
    raise exception 'Escribí tu nombre y apellido, entre 2 y 80 caracteres.';
  end if;
  -- El Elo inicial sigue el valor habitual de alta del club. El usuario no lo elige.
  insert into public.jugadores(nombre,elo_inicial,apodo,email)
    values(d_nombre,1500,null,d_email) returning * into d_jugador;
  return to_jsonb(d_jugador);
end;
$$;
revoke all on function public.crear_mi_jugador(text) from public,anon;
grant execute on function public.crear_mi_jugador(text) to authenticated;

-- Comparten el mismo bloqueo con el alta: elegir y crear a la vez no duplica vínculos.
create or replace function public.vincular_mi_jugador(p_jugador_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare d_email text := public.email_cuenta_jugador(); d_cantidad integer; d_jugador public.jugadores%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('atlantida-jugador:'||d_email,0));
  select count(*) into d_cantidad from public.jugadores where lower(trim(email))=d_email;
  if d_cantidad>1 then raise exception 'Tu cuenta tiene varios jugadores vinculados. Avisale al club.'; end if;
  if d_cantidad=1 then
    select * into d_jugador from public.jugadores where lower(trim(email))=d_email;
    if d_jugador.id::text<>p_jugador_id then raise exception 'Tu cuenta ya tiene un jugador. Usá ese perfil o corregí el vínculo.'; end if;
    return to_jsonb(d_jugador);
  end if;
  select * into d_jugador from public.jugadores where id::text=p_jugador_id for update;
  if not found then raise exception 'Ese jugador ya no está disponible.'; end if;
  if d_jugador.email is not null then raise exception 'Ese jugador ya está vinculado a otra cuenta.'; end if;
  update public.jugadores set email=d_email where id=d_jugador.id returning * into d_jugador;
  return to_jsonb(d_jugador);
end;
$$;
revoke all on function public.vincular_mi_jugador(text) from public,anon;
grant execute on function public.vincular_mi_jugador(text) to authenticated;

create or replace function public.desvincular_mi_jugador(p_jugador_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare d_email text := public.email_cuenta_jugador(); d_jugador public.jugadores%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('atlantida-jugador:'||d_email,0));
  update public.jugadores set email=null where id::text=p_jugador_id and lower(trim(email))=d_email returning * into d_jugador;
  if not found then raise exception 'No se pudo desvincular ese jugador de tu cuenta.'; end if;
  return to_jsonb(d_jugador);
end;
$$;
revoke all on function public.desvincular_mi_jugador(text) from public,anon;
grant execute on function public.desvincular_mi_jugador(text) to authenticated;

notify pgrst, 'reload schema';
commit;
