const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('La sala solo publica invitaciones vigentes y partidas propias; nadie puede escribir desde el cliente',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;
   create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant execute on function auth.uid() to authenticated;`);
  const sql=fs.readFileSync('supabase/migrations/20261019205821_partidas_online.sql','utf8').replace('alter publication supabase_realtime add table public.online_partidas;','');
  await db.exec(sql);
  const uno='11111111-1111-4111-8111-111111111111',dos='22222222-2222-4222-8222-222222222222',tres='33333333-3333-4333-8333-333333333333';
  await db.exec(`insert into auth.users values('${uno}'),('${dos}'),('${tres}');
   insert into public.online_partidas(id,creador_id,rival_id,estado) values
   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${uno}','${dos}','{"fase":"activa"}'),
   ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${uno}',null,'{"fase":"espera"}');
   insert into public.online_partidas(id,creador_id,estado,expira) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','${tres}','{"fase":"espera"}',now()-interval '1 hour');
   set role authenticated;set request.jwt.claim.sub='${dos}';`);
  assert.equal((await db.query('select id from public.online_partidas')).rows.length,2);
  await db.exec(`set request.jwt.claim.sub='${tres}'`);assert.deepEqual((await db.query('select id from public.online_partidas order by id')).rows.map(x=>x.id),['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc']);
  await assert.rejects(db.query(`update public.online_partidas set version=99`),/permission denied/i);
  await assert.rejects(db.query(`insert into public.online_partidas(id,creador_id,estado) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','${tres}','{"fase":"espera"}')`),/permission denied/i);
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from public.online_partidas'),/permission denied/i);
  await db.exec('reset role');
  await assert.rejects(db.query(`insert into public.online_partidas(id,creador_id,estado) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${uno}','{"fase":"espera"}')`),/duplicate key/i);
 }finally{await db.close();}
});
