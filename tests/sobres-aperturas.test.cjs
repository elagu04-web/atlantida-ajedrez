const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
test('Los sobres guardan sólo la apertura de partidas oficiales propias, de forma idempotente y privada',async()=>{
 const db=new PGlite(),a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',j='11111111-1111-4111-8111-111111111111',k='22222222-2222-4222-8222-222222222222',partida='dddddddd-dddd-4ddd-8ddd-000000000001',ajena='dddddddd-dddd-4ddd-8ddd-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema album_privado;create schema club_online_privado;create schema partidas_publicas_privado;
   create table auth.users(id uuid primary key,jugador uuid,verificado boolean);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function club_online_privado.jugador(u uuid) returns uuid language sql stable as $$select jugador from auth.users where id=u and verificado$$;
   create table partidas_publicas_privado.oficiales(id uuid,blancas_id uuid,negras_id uuid,movimientos jsonb);
   grant usage on schema album_privado to authenticated;
   revoke all on auth.users,partidas_publicas_privado.oficiales from public,anon,authenticated;
  `);
  const f=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_sobres_aperturas_abiertos.sql'));await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  await db.query('insert into auth.users values($1,$2,true),($3,$4,true)',[a,j,b,k]);
  await db.query('insert into partidas_publicas_privado.oficiales values($1,$2,$3,$4),($5,$3,$3,$4)',[partida,j,k,['e2e4','e7e5','g1f3','b8c6'],ajena]);
  await db.exec('set role anon');await assert.rejects(db.query('select public.album_sobres_aperturas()'),/permission denied/);await db.exec('reset role;set role authenticated');
  await assert.rejects(db.query('select public.album_sobres_aperturas()'),/Iniciá sesión/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
  const leer=async(id=null,abrir=false)=>(await db.query('select public.album_sobres_aperturas($1,$2) r',[id,abrir])).rows[0].r;
  assert.deepEqual(await leer(),{abiertos:[]});
  await assert.rejects(leer(ajena,true),/no corresponde/);
  assert.deepEqual(await leer(partida,true),{abiertos:[partida]});assert.deepEqual(await leer(partida,true),{abiertos:[partida]});
  await assert.rejects(db.exec('select * from album_privado.sobres_aperturas_abiertos'),/permission denied/);
  await assert.rejects(db.exec('select * from partidas_publicas_privado.oficiales'),/permission denied/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);assert.deepEqual(await leer(),{abiertos:[]});
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from album_privado.sobres_aperturas_abiertos')).rows[0].n,1);
  await db.query('update auth.users set verificado=false where id=$1',[b]);await db.exec('set role authenticated');await assert.rejects(leer(partida,true),/Vinculá/);await db.exec('reset role');
 }finally{await db.close();}
});
