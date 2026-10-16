begin;
alter table atlantida_privado.analisis_config add column clave_publica text;
grant usage on schema atlantida_privado to service_role;
-- pg_net keeps only a wake-up request and the project's public key. Per-job
-- capabilities are fetched by a trusted relay and never stored in net tables.
create or replace function atlantida_privado.despachar_analisis() returns void language plpgsql security definer set search_path='' as $$
declare clave text;
begin
 select clave_publica into clave from atlantida_privado.analisis_config where id and activo;
 if clave is null then return;end if;
 if exists(select 1 from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id) where j.estado='procesando' and d.vence>now()) then return;end if;
 if not exists(select 1 from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id) where j.estado in ('pendiente','procesando') and d.siguiente<=now() and (d.vence is null or d.vence<now())) then return;end if;
 perform net.http_post(url:='https://xewtgrrsepjlzwvknkxb.supabase.co/functions/v1/analisis-entrenamiento-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||clave),body:='{}'::jsonb,timeout_milliseconds:=60000);
end;$$;
revoke all on function atlantida_privado.despachar_analisis() from public,anon,authenticated;

create function atlantida_privado.reclamar_analisis() returns jsonb language plpgsql security definer set search_path='' as $$
declare trabajo public.entrenamiento_analisis; cred uuid;
begin
 if not (select activo from atlantida_privado.analisis_config where id) then return null;end if;
 if not pg_try_advisory_xact_lock(142856,1) then return null;end if;
 update public.entrenamiento_analisis j set estado='error',error='El servidor no pudo completar el trabajo. Podés reintentarlo.',actualizada=now()
 from atlantida_privado.analisis_datos d where d.id=j.id and j.estado in ('pendiente','procesando') and d.intentos>=5 and (d.vence is null or d.vence<now());
 if exists(select 1 from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id) where j.estado='procesando' and d.vence>now()) then return null;end if;
 select j.* into trabajo from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id)
 where j.estado in ('pendiente','procesando') and d.siguiente<=now() and (d.vence is null or d.vence<now()) and d.intentos<5 order by j.actualizada,j.id limit 1 for update of j skip locked;
 if not found then return null;end if;
 cred:=gen_random_uuid();update atlantida_privado.analisis_datos set token=cred,vence=now()+interval '90 seconds',iniciada=false,intentos=intentos+1 where id=trabajo.id;
 update public.entrenamiento_analisis set estado='procesando',error=null,actualizada=now() where id=trabajo.id;
 return jsonb_build_object('id',trabajo.id,'token',cred);
end;$$;
revoke all on function atlantida_privado.reclamar_analisis() from public,anon,authenticated;
grant execute on function atlantida_privado.reclamar_analisis() to service_role;
create function public.reclamar_entrenamiento_analisis() returns jsonb language sql security invoker set search_path='' as $$select atlantida_privado.reclamar_analisis();$$;
revoke all on function public.reclamar_entrenamiento_analisis() from public,anon,authenticated;
grant execute on function public.reclamar_entrenamiento_analisis() to service_role;
notify pgrst,'reload schema';
commit;
