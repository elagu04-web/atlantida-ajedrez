-- Private distribution only; app source and assets are NOT committed to Git.
-- The snapshot is uploaded separately through Storage API.
insert into storage.buckets(id,name,public,file_size_limit)
values ('clases-mesa','clases-mesa',false,52428800);
create policy "Mesa privada de Agustin" on storage.objects
for select to authenticated
using (bucket_id='clases-mesa' and (select auth.uid())='f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid);
