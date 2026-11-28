const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');

test('Sólo partidas terminadas guardadas generan progreso: oficiales y amistosas propias, sin publicar mesas privadas',async()=>{
 const db=new PGlite(),a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',c='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const u='11111111-1111-4111-8111-111111111111',v='22222222-2222-4222-8222-222222222222',z='33333333-3333-4333-8333-333333333333';
 const id=n=>`dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12,'0')}`,mov=['e2e4','c7c5','g1f3','d7d6'];
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema album_privado;create schema club_online_privado;
   create table auth.users(id uuid primary key,jugador uuid,verificado boolean);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function club_online_privado.jugador(u uuid) returns uuid language sql stable security definer set search_path='' as $$select jugador from auth.users where id=u and verificado$$;
   create table public.jugadores(id uuid primary key,nombre text,apodo text);
   create table public.partidas_club_online(id uuid primary key,blancas_id uuid,negras_id uuid,resultado text,torneo text,created_at timestamptz,dia date);
   create table public.online_partidas(id uuid primary key,estado jsonb,torneo_id uuid,creador_id uuid,rival_id uuid,creada timestamptz default now(),actualizada timestamptz default now());
   alter table public.online_partidas enable row level security;
   revoke all on public.online_partidas,auth.users from public,anon,authenticated;
   grant usage on schema album_privado to authenticated;
  `);
  for(const sufijo of ['_partidas_publicas_perfiles.sql','_album_aperturas_jugadas.sql','_sobres_aperturas_abiertos.sql','_aperturas_amistosas_guardadas.sql']){const f=fs.readdirSync('supabase/migrations').find(f=>f.endsWith(sufijo));await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));}
  await db.query('insert into auth.users values($1,$2,true),($3,$4,true),($5,$6,true)',[u,a,v,b,z,c]);
  await db.query('insert into public.jugadores values($1,$2,null),($3,$4,null),($5,$6,null)',[a,'A',b,'B',c,'C']);
  for(const[n,extra,creador,rival]of[
   [1,{porElo:true},u,v],[2,{},u,v],[3,{fase:'activa'},u,v],[4,{fase:'cancelada'},u,v],
   [5,{movimientos:['e2e4']},u,v],[6,{},u,u],[7,{},v,z],[8,{porElo:true},u,v],
   [9,{},u,null],[10,{resultado:'*'},u,v],[11,{movimientos:'privado'},u,v],
   [12,{colorCreador:'b'},u,v],[13,{porElo:null},u,v],[14,{movimientos:Array(60).fill('e2e4')},u,v]
  ])await db.query('insert into public.online_partidas(id,estado,creador_id,rival_id,actualizada) values($1,$2,$3,$4,$5)',[id(n),{fase:'terminada',porElo:false,colorCreador:'w',resultado:'1-0',blancas:'A',negras:'B',movimientos:mov,pgn:'secreto@privado.invalid',secreto:'Nunca publicar',...extra},creador,rival,`2026-11-${String(n).padStart(2,'0')}T20:00:00Z`]);
  await db.query("insert into public.partidas_club_online values($1,$2,$3,'1-0','Copa','2026-11-01T20:00:00Z','2026-11-01')",[id(1),a,b]);
  const leer=async(j=a,desde=0,limite=100)=>(await db.query('select public.aperturas_partidas_jugador($1,$2,$3) r',[j,desde,limite])).rows[0].r;
  const abrir=async(n)=>(await db.query('select public.album_sobres_aperturas($1,true) r',[id(n)])).rows[0].r;
  await db.exec('set role anon');assert.equal((await leer()).total,1);await assert.rejects(abrir(2),/permission denied/);await db.exec('reset role;set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);
  const propia=await leer();assert.equal(propia.total,4);assert.deepEqual(propia.partidas.map(p=>p.id),[1,2,12,14].map(id));
  assert.equal(propia.partidas[0].amistosa,false);assert.equal(propia.partidas[1].amistosa,true);assert.equal(propia.partidas[2].color,'b');assert.equal(propia.partidas[3].movimientos.length,40);
  assert.deepEqual(Object.keys(propia.partidas[1]).sort(),['id','fecha','resultado','color','rival','movimientos','amistosa'].sort());assert.ok(!JSON.stringify(propia).includes('privado'));
  assert.equal((await leer(a,1,1)).partidas[0].id,id(2));assert.equal((await leer(b)).total,1);
  assert.deepEqual(await abrir(2),{abiertos:[id(2)]});assert.deepEqual(await abrir(2),{abiertos:[id(2)]});
  for(const n of [3,4,5,6,7,8,9,10,11,13,99])await assert.rejects(abrir(n),/no corresponde/);
  await assert.rejects(db.exec('select * from public.online_partidas'),/permission denied/);
  await assert.rejects(db.query('select * from partidas_publicas_privado.para_aperturas($1)',[a]),/permission denied/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[z]);assert.equal((await leer()).total,1);await assert.rejects(abrir(2),/no corresponde/);
  const ajeno=(await leer(c)).partidas;assert.deepEqual(ajeno.map(p=>p.id),[id(7)]);assert.equal(ajeno[0].color,'b');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[v]);const rival=(await leer(b)).partidas;assert.equal(rival.find(p=>p.id===id(2)).color,'b');assert.equal(rival.find(p=>p.id===id(12)).color,'w');
  await db.query("select set_config('request.jwt.claim.sub','',false)");assert.equal((await leer()).total,1);
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from album_privado.sobres_aperturas_abiertos')).rows[0].n,1);
 }finally{await db.close();}
});
