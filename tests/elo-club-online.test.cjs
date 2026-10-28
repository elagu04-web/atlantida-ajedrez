const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {PGlite}=require('@electric-sql/pglite'),{calcularEloYHistorialEnVivo}=require('../lib/elo.ts'),{resultadoClubDesdeFila}=require('../lib/resultadosClubOnline.ts'),o=require('../lib/partidaOnline.ts');
const ua='11111111-1111-4111-8111-111111111111',ub='22222222-2222-4222-8222-222222222222',uc='33333333-3333-4333-8333-333333333333',ja='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',jb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',jt='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
test('Un solo Elo: replay presencial+online, identidad verificada, guardado atómico, amistosas y permisos',async()=>{
 const db=new PGlite();let numero=0;try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;create table public.jugadores(id uuid primary key,nombre text,apodo text,email text,elo_inicial integer);create table public.torneos(id uuid primary key,nombre text,iniciado_en timestamptz,created_at timestamptz,excluir_elo boolean,rondas jsonb);`);
  for(const f of ['20261019205821_partidas_online.sql','20261019224336_elo_online.sql','20261028011711_torneos_online.sql','20261028023232_elo_club_online_unificado.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8').replace(/alter publication supabase_realtime add table [^;]+;/g,''));
  await db.exec('grant all on public.jugadores,public.torneos to service_role');
  await db.query(`insert into auth.users values($1,'a@test.invalid',now(),'{}'),($2,'b@test.invalid',now(),'{}'),($3,'c@test.invalid',now(),'{}')`,[ua,ub,uc]);
  await db.query(`insert into public.jugadores values($1,'Jugador A','A','a@test.invalid',1800),($2,'Jugador B','B','b@test.invalid',1600)`,[ja,jb]);
  const base=[{id:ja,nombre:'Jugador A',apodo:'A',eloAtlantida:1800,partidas:[]},{id:jb,nombre:'Jugador B',apodo:'B',eloAtlantida:1600,partidas:[]}];
  const torneo={id:jt,nombre:'Presencial',creadoEn:'2026-10-20T21:00:00.000Z',formato:'match',rondas:[{numero:1,emparejamientos:[{numero:1,blancasId:ja,negrasId:jb,resultado:'0-1'}]}]};
  await db.query('insert into public.torneos values($1,$2,null,$3,false,$4)',[jt,torneo.nombre,torneo.creadoEn,torneo.rondas]);
  async function comparar(){
   const rows=(await db.query('select * from public.partidas_club_online order by created_at,id')).rows;
   const esperado=calcularEloYHistorialEnVivo(base,[torneo],rows.map(resultadoClubDesdeFila));
   const real=(await db.query('select club_online_privado.ratings() r')).rows[0].r;
   for(const j of esperado){assert.equal(real[j.id].elo,j.eloAtlantida);assert.equal(real[j.id].partidas,j.jugadas);assert.equal(real[j.id].victorias,j.victorias);assert.equal(real[j.id].derrotas,j.derrotas);}
   return {real,esperado,rows};
  }
  const inicial=await comparar();
  async function crear(rated=true,usuario=ua){const id=`dddddddd-dddd-4ddd-8ddd-${String(++numero).padStart(12,'0')}`;return (await db.query('insert into public.online_partidas(id,creador_id,estado) values($1,$2,$3) returning *',[id,usuario,o.crearEstadoOnline('10+3','w','Nombre editable',rated)])).rows[0];}
  async function actualizar(p,e,rival=p.rival_id){return (await db.query('update public.online_partidas set estado=$1,rival_id=$2,version=version+1 where id=$3 returning *',[e,rival,p.id])).rows[0];}
  await db.exec('set role service_role');
  await assert.rejects(crear(true,uc),/Vinculá/);
  let p=await crear();assert.equal(p.estado.eloCreador,inicial.real[ja].elo);
  p=await actualizar(p,o.unirEstadoOnline(p.estado,'Otro nombre',Date.now()),ub);assert.equal(p.estado.blancas,'A');assert.equal(p.estado.negras,'B');assert.equal(p.estado.eloTipo,'club');assert.equal(p.estado.eloInicio.w,inicial.real[ja].elo);
  const hora=Number(p.estado.desde);p=await actualizar(p,o.aplicarAccionOnline(p.estado,'w',{tipo:'mover',uci:'e2e4'},hora+100));p=await actualizar(p,o.aplicarAccionOnline(p.estado,'b',{tipo:'mover',uci:'e7e5'},hora+200));
  const activa=p;
  await db.exec('begin');await actualizar(p,o.aplicarAccionOnline(p.estado,'b',{tipo:'rendirse'},hora+300));assert.equal((await comparar()).rows.length,1);await db.exec('rollback');assert.equal((await comparar()).rows.length,0);
  p=await actualizar(activa,o.aplicarAccionOnline(activa.estado,'b',{tipo:'rendirse'},hora+400));const final=await comparar();assert.equal(final.rows.length,1);assert.equal(final.real[ja].elo,p.estado.elo.w.despues);assert.ok(final.esperado.find(j=>j.id===ja).partidas.at(-1).partidaOnlineId);assert.match(p.estado.pgn,/WhiteElo/);
  await actualizar(p,p.estado);assert.equal((await comparar()).rows.length,1);
  let amiga=await crear(false);amiga=await actualizar(amiga,o.unirEstadoOnline(amiga.estado,'Rival',Date.now()),ub);await actualizar(amiga,o.aplicarAccionOnline(amiga.estado,'b',{tipo:'rendirse'},Number(amiga.estado.desde)+1000));assert.equal((await comparar()).rows.length,1);
  // A correction in the original tournament replays both sources identically.
  torneo.rondas[0].emparejamientos[0].resultado='1/2-1/2';await db.query('update public.torneos set rondas=$1 where id=$2',[torneo.rondas,jt]);await comparar();
  const corregido=await comparar();await db.exec('reset role');
  const evento='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';await db.query("insert into public.online_torneos(id,organizador_id,nombre,formato,ritmo,max_rondas,por_elo) values($1,$2,'Copa','suizo','10+3',3,true)",[evento,ua]);
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${ua}'`);await db.query('select public.inscribir_torneo_online($1,true,true)',[evento]);const sala=(await db.query('select public.obtener_torneo_online($1) r',[evento])).rows[0].r;assert.equal(sala.jugadores[0].jugador_id,ja);assert.equal(sala.jugadores[0].elo,corregido.real[ja].elo);
  const resumen=(await db.query('select public.mi_elo_club() r')).rows[0].r;assert.equal(resumen.jugadorId,ja);assert.equal(resumen.elo,corregido.real[ja].elo);
  await assert.rejects(db.query('insert into public.partidas_club_online(id,blancas_id,negras_id,resultado,torneo) values($1,$2,$3,$4,$5)',[jt,ja,jb,'1-0','Trampa']),/permission denied/);
  await assert.rejects(db.query('select club_online_privado.ratings()'),/permission denied/);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${uc}'`);assert.equal((await db.query('select public.mi_elo_club() r')).rows[0].r.vinculado,false);
  await db.exec('reset role;set role anon');assert.equal((await db.query('select * from public.partidas_club_online')).rows.length,1);await assert.rejects(db.query('select public.mi_elo_club()'),/permission denied/);
 }finally{await db.close();}
});
