begin;
create table if not exists public.entrenamiento_documentos (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 clave text not null check(clave='guiado:v1' or clave ~ '^sesion:.{1,100}$'),
 datos jsonb not null check(jsonb_typeof(datos)='object' and octet_length(datos::text)<=1500000),
 revision bigint not null default 1 check(revision>=1),
 actualizado_en timestamptz not null default now(),
 primary key(usuario_id,clave)
);
alter table public.entrenamiento_documentos enable row level security;
revoke all on public.entrenamiento_documentos from public,anon,authenticated;
grant select,insert,update on public.entrenamiento_documentos to authenticated;
drop policy if exists entrenamiento_propio on public.entrenamiento_documentos;
create policy entrenamiento_propio on public.entrenamiento_documentos
 for all to authenticated
 using ((select auth.uid())=usuario_id)
 with check ((select auth.uid())=usuario_id);

-- Optimistic concurrency: an outdated device receives the current document,
-- merges only its changed exercises/notes, and retries with the latest revision.
create or replace function public.guardar_entrenamiento_documento(p_clave text,p_datos jsonb,p_revision bigint default 0,p_usuario uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); d public.entrenamiento_documentos;
begin
 if u is null then raise exception 'Iniciá sesión para guardar tu entrenamiento.';end if;
 if p_usuario is null or p_usuario<>u then raise exception 'La cuenta cambió. Volvé a abrir tu entrenamiento.';end if;
 if p_clave is null or not (p_clave='guiado:v1' or p_clave ~ '^sesion:.{1,100}$') then raise exception 'Documento inválido.';end if;
 if p_datos is null or jsonb_typeof(p_datos)<>'object' or octet_length(p_datos::text)>1500000 then raise exception 'Entrenamiento demasiado grande o inválido.';end if;
 if p_revision is null or p_revision<0 then raise exception 'Revisión inválida.';end if;
 if p_revision=0 then
  insert into public.entrenamiento_documentos(usuario_id,clave,datos)
  values(u,p_clave,p_datos) on conflict(usuario_id,clave) do nothing returning * into d;
 else
  update public.entrenamiento_documentos set datos=p_datos,revision=revision+1,actualizado_en=now()
  where usuario_id=u and clave=p_clave and revision=p_revision returning * into d;
 end if;
 if found then return jsonb_build_object('conflicto',false,'revision',d.revision,'datos',d.datos);end if;
 select * into d from public.entrenamiento_documentos where usuario_id=u and clave=p_clave;
 return jsonb_build_object('conflicto',true,'revision',coalesce(d.revision,0),'datos',d.datos);
end;
$$;
revoke all on function public.guardar_entrenamiento_documento(text,jsonb,bigint,uuid) from public,anon;
grant execute on function public.guardar_entrenamiento_documento(text,jsonb,bigint,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
