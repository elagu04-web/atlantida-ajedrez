const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {Chess}=require('chess.js'),{PGlite}=require('@electric-sql/pglite');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {descubrirAperturas,coleccionarAperturas}=require('../lib/albumAperturas.ts');
const uci=pgn=>{const c=new Chess();c.loadPgn(pgn);return c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));};

test('Una partida descubre cada posición nombrada que realmente alcanzó, con su diagrama exacto',()=>{
 const a=descubrirAperturas(uci('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'),'w');
 assert.ok(a.some(c=>c.nombre==='Apertura Italiana'));
 assert.ok(a.some(c=>c.original==="King's Pawn Game"));
 const italiana=a.find(c=>c.nombre==='Apertura Italiana'),c=new Chess();c.loadPgn(italiana.pgn);
 assert.equal(c.fen().split(' ').slice(0,4).join(' '),italiana.fen);
 assert.notEqual(italiana.fen,a.find(c=>c.original==="King's Pawn Game").fen);
 const normal=descubrirAperturas(uci('1. d4 Nf6 2. c4 e6 3. Nc3 Bb4'),'w');
 const transpuesta=descubrirAperturas(uci('1. c4 Nf6 2. Nc3 e6 3. d4 Bb4'),'w');
 assert.equal(normal.find(c=>c.nombre==='Defensa Nimzoindia').id,transpuesta.find(c=>c.nombre==='Defensa Nimzoindia').id);
 assert.ok(!transpuesta.some(c=>c.original==="Queen's Pawn Game"));
 assert.ok(normal.some(c=>c.nombre==='Defensa Nimzoindia'));
});
test('Los gambitos y sistemas tienen cartas propias; las formaciones pertenecen al color que las juega',()=>{
 const evans=descubrirAperturas(uci('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4'),'w');
 assert.ok(evans.some(c=>c.nombre.includes('Gambito Evans')&&c.tipo==='gambito'));
 assert.ok(evans.some(c=>c.nombre==='Apertura Italiana'));
 const london=uci('1. d4 a6 2. Nf3 h6 3. Bf4 b6 4. e3 g6');
 assert.ok(descubrirAperturas(london,'w').some(c=>c.nombre==='Sistema Londres'));
 assert.ok(!descubrirAperturas(london,'b').some(c=>c.nombre==='Sistema Londres'));
 const hippo=uci('1. a3 b6 2. h3 Bb7 3. d4 g6 4. e4 Bg7 5. Nf3 d6 6. Bd3 e6 7. O-O Nd7 8. Re1 Ne7');
 assert.ok(descubrirAperturas(hippo,'b').some(c=>c.nombre==='Sistema Hipopótamo'&&c.tipo==='sistema'));
 assert.ok(!descubrirAperturas(hippo,'w').some(c=>c.nombre==='Sistema Hipopótamo'));
});
test('No inventa cartas con una mesa vacía, jugadas ilegales o una secuencia truncada',()=>{
 for(const secuencia of [[],['e2e4','e7e5'],['e2e4','e7e5','g1f3','a8a1'],['e2e4','e7e5','dato privado','b8c6']])assert.deepEqual(descubrirAperturas(secuencia,'w'),[]);
});
test('Una apertura suma partidas sin duplicar cartas ni encuentros y cuenta resultados desde el color propio',()=>{
 const m=uci('1. e4 c5 2. Nf3 d6');
 const a={id:'a',fecha:'2026-11-24T20:00:00Z',color:'w',rival:'Uno',resultado:'1-0',movimientos:m};
 const b={...a,id:'b',fecha:'2026-11-25T20:00:00Z',color:'b',resultado:'1-0'};
 const c={...b,id:'c',fecha:'2026-11-26T20:00:00Z',resultado:'1/2-1/2'};
 const cartas=coleccionarAperturas([c,b,a,a]),siciliana=cartas.find(c=>c.nombre==='Defensa Siciliana');
 assert.equal(siciliana.partidas.length,3);assert.equal(siciliana.victorias,1);assert.equal(siciliana.tablas,1);assert.equal(siciliana.blancas,1);assert.equal(siciliana.negras,2);assert.equal(siciliana.partidas[0].id,'a');
 assert.ok(!('movimientos' in siciliana.partidas[0]));
});

test('El álbum usa sólo el archivo oficial, pagina sin truncar y no expone cuentas ni estado privado',async()=>{
 const db=new PGlite(),a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const id=n=>`dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12,'0')}`;
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;create table public.jugadores(id uuid primary key,nombre text,apodo text);create table public.partidas_club_online(id uuid primary key,blancas_id uuid,negras_id uuid,resultado text,torneo text,created_at timestamptz,dia date);create table public.online_partidas(id uuid primary key,estado jsonb,torneo_id uuid,creador_id uuid);alter table public.online_partidas enable row level security;revoke all on public.online_partidas from public,anon,authenticated;');
  for(const sufijo of ['_partidas_publicas_perfiles.sql','_album_aperturas_jugadas.sql']){const f=fs.readdirSync('supabase/migrations').find(f=>f.endsWith(sufijo));await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));}
  await db.query('insert into public.jugadores values($1,$2,null),($3,$4,null)',[a,'A',b,'B']);
  for(const [n,fase,porElo,m] of [[1,'terminada',true,['e2e4','c7c5','g1f3','d7d6']],[2,'activa',true,Array(50).fill('e2e4')],[3,'cancelada',true,Array(50).fill('e2e4')],[4,'terminada',false,Array(50).fill('e2e4')],[5,'terminada',true,[]],[6,'terminada',true,['d2d4']],[7,'terminada',true,Array(50).fill('e2e4')],[8,'terminada',true,Array(50).fill('e2e4')]]){
   await db.query('insert into public.online_partidas values($1,$2,null,$3)',[id(n),{fase,porElo,movimientos:m,pgn:'correo@privado.invalid',secreto:'Nunca publicar'},a]);
   // La mesa 8 todavía no tiene resultado oficial en el libro del club.
   if(n!==8)await db.query("insert into public.partidas_club_online values($1,$2,$3,'1-0','Copa','2026-11-24T20:00:00Z','2026-11-24')",[id(n),a,b]);
  }
  // Resultado manual sin una mesa con movimientos.
  await db.query("insert into public.partidas_club_online values($1,$2,$3,'1-0','Copa','2026-11-24T20:00:00Z','2026-11-24')",[id(9),a,b]);
  for(const rol of ['anon','authenticated']){
   await db.exec('set role '+rol);
   const primera=(await db.query('select public.aperturas_partidas_jugador($1,0,1) r',[a])).rows[0].r;
   assert.equal(primera.total,2);assert.equal(primera.partidas.length,1);assert.equal(primera.partidas[0].id,id(1));assert.equal(primera.partidas[0].color,'w');assert.equal(primera.partidas[0].rival,'B');
   assert.deepEqual(Object.keys(primera.partidas[0]).sort(),['id','fecha','resultado','color','rival','movimientos'].sort());assert.ok(!JSON.stringify(primera).includes('privado'));
   const segunda=(await db.query('select public.aperturas_partidas_jugador($1,1,1) r',[a])).rows[0].r;
   assert.equal(segunda.partidas[0].id,id(7));assert.equal(segunda.partidas[0].movimientos.length,40);
   const negras=(await db.query('select public.aperturas_partidas_jugador($1) r',[b])).rows[0].r;assert.equal(negras.partidas[0].color,'b');
   const ausente=(await db.query('select public.aperturas_partidas_jugador(null) r')).rows[0].r;assert.equal(ausente.total,0);assert.deepEqual(ausente.partidas,[]);
   await assert.rejects(db.exec('select * from public.online_partidas'),/permission denied/);await assert.rejects(db.exec('select * from partidas_publicas_privado.oficiales'),/permission denied/);
   await db.exec('reset role');
  }
 }finally{await db.close();}
});
