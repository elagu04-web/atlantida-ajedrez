const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {PGlite}=require('@electric-sql/pglite'),{Chess}=require('chess.js'),o=require('../lib/partidaOnline.ts');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
test('Elo online atómico: modalidad inmutable, ambos perfiles, una sola liquidación, tablas, amistosas y RLS',async()=>{
 const db=new PGlite();let numero=0;const hora=Date.parse('2026-10-19T23:00:00Z');
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant execute on function auth.uid() to authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/20261019205821_partidas_online.sql','utf8').replace('alter publication supabase_realtime add table public.online_partidas;',''));
  await db.exec(fs.readFileSync('supabase/migrations/20261019224336_elo_online.sql','utf8'));
  await db.exec(`insert into auth.users values('${ids[0]}'),('${ids[1]}'),('${ids[2]}');set role service_role;`);
  async function crear(porElo=true,color='w'){
   const id=`aaaaaaaa-aaaa-4aaa-8aaa-${String(++numero).padStart(12,'0')}`,estado=o.crearEstadoOnline('10+3',color,'Creador',porElo);
   const r=await db.query('insert into public.online_partidas(id,creador_id,estado) values($1,$2,$3) returning *',[id,ids[0],estado]);return r.rows[0];
  }
  async function estado(p,e,rival=p.rival_id){return (await db.query('update public.online_partidas set estado=$1,rival_id=$2 where id=$3 returning *',[e,rival,p.id])).rows[0];}
  async function jugar(porElo=true,color='w'){const p=await crear(porElo,color);return estado(p,o.unirEstadoOnline(p.estado,'Rival',hora),ids[1]);}
  async function perfiles(){return (await db.query('select usuario_id,elo,partidas,victorias,tablas,derrotas from public.online_elo order by usuario_id')).rows;}
  const espera=await crear();assert.equal(espera.estado.eloCreador,1400);assert.equal((await perfiles()).length,0);
  await assert.rejects(estado(espera,{...espera.estado,porElo:false}),/modalidad/i);
  const cancelada=await estado(espera,o.aplicarAccionOnline(espera.estado,'w',{tipo:'cancelar'},hora));assert.equal(cancelada.estado.fase,'cancelada');assert.equal((await perfiles()).length,0);
  let p=await jugar();assert.deepEqual(p.estado.eloInicio,{w:1400,b:1400});assert.equal((await perfiles()).length,2);
  p=await estado(p,o.aplicarAccionOnline(p.estado,'b',{tipo:'rendirse'},hora+1000));
  assert.deepEqual(p.estado.elo,{w:{antes:1400,despues:1416,variacion:16},b:{antes:1400,despues:1384,variacion:-16}});
  const c=new Chess();c.loadPgn(p.estado.pgn);assert.equal(c.getHeaders().WhiteElo,'1400');assert.equal(c.getHeaders().WhiteRatingDiff,'16');
  const antes=await perfiles();await estado(p,p.estado);assert.deepEqual(await perfiles(),antes);
  const casual=await jugar(false);assert.equal(casual.estado.eloInicio,undefined);await estado(casual,o.aplicarAccionOnline(casual.estado,'b',{tipo:'rendirse'},hora+1000));assert.deepEqual(await perfiles(),antes);
  let tablas=await jugar(true,'b');tablas=await estado(tablas,o.aplicarAccionOnline(tablas.estado,'w',{tipo:'ofrecer'},hora+1000));tablas=await estado(tablas,o.aplicarAccionOnline(tablas.estado,'b',{tipo:'aceptar'},hora+2000));assert.equal(tablas.estado.elo.w.antes,1384);assert.equal(tablas.estado.elo.w.variacion,1);assert.equal(tablas.estado.elo.b.variacion,-1);
  const filas=await perfiles();assert.equal(filas[0].partidas,2);assert.equal(filas[0].victorias,1);assert.equal(filas[0].tablas,1);assert.equal(filas[0].elo+filas[1].elo,2800);
  // A failed transaction must roll back BOTH the result and the two rating updates.
  let rollback=await jugar();const antesRollback=await perfiles();await db.exec('begin');await estado(rollback,o.aplicarAccionOnline(rollback.estado,'w',{tipo:'rendirse'},hora+1000));await db.exec('rollback');assert.deepEqual(await perfiles(),antesRollback);assert.equal((await db.query('select estado from public.online_partidas where id=$1',[rollback.id])).rows[0].estado.fase,'activa');
  // Two games share the same live ratings, rather than overwriting from a stale start snapshot.
  const paralela=await jugar(true,'b');rollback=await estado(rollback,o.aplicarAccionOnline(rollback.estado,'w',{tipo:'rendirse'},hora+3000));const eloIntermedio=(await perfiles())[0].elo;const ultima=await estado(paralela,o.aplicarAccionOnline(paralela.estado,'w',{tipo:'rendirse'},hora+4000));assert.equal(ultima.estado.elo.b.antes,eloIntermedio);assert.equal((await perfiles())[0].partidas,4);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${ids[0]}'`);assert.equal((await db.query('select * from public.online_elo')).rows.length,1);
  await assert.rejects(db.query('update public.online_elo set elo=9999'),/permission denied/i);
  await assert.rejects(db.query('select public.online_actualizar_elo()'),/permission denied|trigger functions/i);
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from public.online_elo'),/permission denied/i);
 }finally{await db.close();}
});
test('Las partidas antiguas permanecen amistosas y la modalidad acompaña al PGN',()=>{
 const estado=o.crearEstadoOnline('3+2','w','Uno');assert.equal(estado.porElo,false);
 const antigua={...estado};delete antigua.porElo;
 const fin=o.aplicarAccionOnline(o.unirEstadoOnline(antigua,'Dos',0),'b',{tipo:'rendirse'},1000);assert.equal(fin.elo,undefined);assert.match(fin.pgn,/Atlántida · Partida online/);
 const rated=o.unirEstadoOnline(o.crearEstadoOnline('5+3','w','Uno',true),'Dos',0);assert.match(o.aplicarAccionOnline(rated,'b',{tipo:'rendirse'},1000).pgn,/Online por Elo/);
});
