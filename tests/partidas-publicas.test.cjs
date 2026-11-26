const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite'),{Chess}=require('chess.js');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {recorridoPartidaPublica}=require('../lib/partidasPublicas.ts');
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id=n=>`dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12,'0')}`;
test('Archivo público: sólo resultados oficiales terminados, paginación y proyección sin cuentas ni datos privados',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create table public.jugadores(id uuid primary key,nombre text,apodo text);create table public.partidas_club_online(id uuid primary key,blancas_id uuid,negras_id uuid,resultado text,torneo text,created_at timestamptz default now(),dia date default '2026-11-25');create table public.online_partidas(id uuid primary key,estado jsonb,torneo_id uuid,creador_id uuid);alter table public.online_partidas enable row level security;revoke all on public.online_partidas from public,anon,authenticated;`);
 const migracion=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_partidas_publicas_perfiles.sql'));await db.exec(fs.readFileSync('supabase/migrations/'+migracion,'utf8'));
 await db.query('insert into public.jugadores values($1,$2,$3),($4,$5,null)',[a,'Nombre público A','Apodo A',b,'Nombre público B']);
 for(const [n,fase,porElo] of [[1,'terminada',true],[3,'activa',true],[4,'cancelada',true],[5,'terminada',false],[6,'terminada',true]]){
  await db.query('insert into public.online_partidas values($1,$2,null,$3)',[id(n),{fase,porElo,movimientos:['e2e4','c7c5'],pgn:'PGN privado con correo@privado.invalid',motivo:'detalle privado',clubBlancasId:a,clubNegrasId:b},a]);
 }
 // 2 es un resultado confirmado sin movimientos. 5 y 6 no son oficiales.
 for(const n of [1,2,3,4])await db.query("insert into public.partidas_club_online(id,blancas_id,negras_id,resultado,torneo,created_at) values($1,$2,$3,'0-1','Copa del club','2026-11-25T21:00:00Z')",[id(n),a,b]);
 for(const rol of ['anon','authenticated']){
  await db.exec('set role '+rol);
  const archivo=(await db.query('select public.partidas_publicas_jugador($1,0,1) r',[a])).rows[0].r;
  assert.equal(archivo.total,2);assert.equal(archivo.reproducibles,1);assert.equal(archivo.partidas.length,1);assert.equal(archivo.partidas[0].id,id(2));assert.equal(archivo.partidas[0].reproducible,false);assert.ok(!('movimientos' in archivo.partidas[0]));
  const pagina=(await db.query('select public.partidas_publicas_jugador($1,1,1) r',[a])).rows[0].r;assert.equal(pagina.partidas[0].id,id(1));
  const detalle=(await db.query('select public.partida_publica_club($1) r',[id(1)])).rows[0].r;assert.deepEqual(detalle.movimientos,['e2e4','c7c5']);assert.equal(detalle.blancas,'Apodo A');
  assert.deepEqual(Object.keys(detalle).sort(),['id','blancasId','negrasId','blancas','negras','resultado','torneo','torneoId','fecha','dia','ritmo','mediasJugadas','reproducible','movimientos'].sort());assert.ok(!JSON.stringify(detalle).includes('privado'));
  for(const n of [3,4,5,6,99])assert.equal((await db.query('select public.partida_publica_club($1) r',[id(n)])).rows[0].r,null);
  assert.equal((await db.query('select public.partidas_publicas_jugador($1,0,12) r',[b])).rows[0].r.total,2);
  await assert.rejects(db.exec('select * from public.online_partidas'),/permission denied/);await assert.rejects(db.exec('select * from partidas_publicas_privado.oficiales'),/permission denied/);
  await db.exec('reset role');
 }
 }finally{await db.close();}
});
test('La repetición y el PGN usan jugadas legales e identidades públicas; no inventan movimientos ausentes',()=>{
 const p={blancas:'Fonchi',negras:'Caccia',torneo:'Copa del club',dia:'2026-11-25',ritmo:'5+3',resultado:'0-1',movimientos:['e2e4','c7c5','g1f3','d7d6'],pgn:'texto privado que no debe copiarse'};
 const r=recorridoPartidaPublica(p),chess=new Chess();chess.loadPgn(r.pgn);assert.equal(r.posiciones.length,5);assert.equal(r.jugadas[2].texto,'2. Cf3');assert.equal(chess.history().length,4);assert.equal(chess.getHeaders().White,'Fonchi');assert.equal(chess.getHeaders().TimeControl,'300+3');assert.equal(chess.getHeaders().Result,'0-1');assert.ok(!r.pgn.includes('privado'));
 assert.throws(()=>recorridoPartidaPublica({...p,movimientos:[]}));assert.throws(()=>recorridoPartidaPublica({...p,movimientos:['e2e5']}));assert.throws(()=>recorridoPartidaPublica({...p,movimientos:['correo@privado.invalid']}));
});
