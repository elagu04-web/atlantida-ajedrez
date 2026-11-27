const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const usuario=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,jugador=n=>`22222222-2222-4222-8222-${String(n).padStart(12,'0')}`;
const catalogo=require('../lib/albumCatalogo.json');
async function preparar(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table public.jugadores(id uuid primary key,nombre text,apodo text,email text);
 create schema club_online_privado;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;grant usage on schema auth to authenticated;
 create function club_online_privado.jugador(p uuid) returns uuid language sql stable as $$select case when count(*)=1 then min(j.id::text)::uuid else null end from auth.users u join public.jugadores j on lower(trim(j.email))=lower(trim(u.email)) where u.id=p and u.email_confirmed_at is not null$$;`);
 const migrar=async sufijo=>{const f=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_'+sufijo+'.sql'));await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));};
 await migrar('album_club_figuritas');
 await db.exec(`create table public.torneos(id uuid primary key,nombre text,estado text,formato text,iniciado_en timestamptz,created_at timestamptz default now(),excluir_elo boolean default false,jugadores_ids jsonb,rondas jsonb);
 create table public.online_torneos(id uuid primary key,nombre text,estado text,creada timestamptz default now(),actualizada timestamptz default now());create table public.online_torneo_jugadores(torneo_id uuid,usuario_id uuid);create table public.online_torneo_cruces(torneo_id uuid,blancas_id uuid,negras_id uuid,partida_id uuid,resultado_manual text);
 create table public.online_partidas(id uuid primary key,creador_id uuid,rival_id uuid,estado jsonb,actualizada timestamptz default now());create table public.desafios_resueltos(usuario_id uuid,dia date,resuelto_en timestamptz default now());create table public.desafios_fallados(usuario_id uuid,dia date);alter table public.jugadores add column foto_url text;`);
 for(const m of ['album_sobres_por_participacion','album_rareza_por_figurita','albumes_visitables','album_seis_especiales_club'])await migrar(m);
 for(let n=1;n<=4;n++){
  await db.query('insert into auth.users values($1,$2,$3)',[usuario(n),`cuenta${n}@privado.invalid`,n===4?null:'2026-11-27T10:00:00Z']);
  await db.query('insert into public.jugadores values($1,$2,null,$3,null)',[jugador(n),`Persona ${n}`,`cuenta${n}@privado.invalid`]);
 }
 const entrar=async(id,rol='authenticated')=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id??'']);await db.exec('set role '+rol);};
 const api=async(accion='resumen',datos={})=>(await db.query('select public.album_club($1,$2) r',[accion,JSON.stringify(datos)])).rows[0].r;
 return {db,entrar,api};
}
test('Álbumes visitables: sólo cartas obtenidas, agrupadas por identidad deportiva y sin datos de las cuentas',async()=>{
 const {db,entrar}=await preparar();try{
  await db.query('insert into album_privado.inventario values($1,$2,2),($1,$3,0),($4,$3,1),($5,$2,9)',[usuario(1),catalogo[0].id,catalogo[1].id,usuario(2),usuario(4)]);
  await db.query('insert into album_privado.inventario values($1,$2,7)',[usuario(1),'especial:martes']);
  for(const rol of ['anon','authenticated']){
   await entrar(null,rol);
   const directorio=(await db.query('select public.albumes_publicos_club() r')).rows[0].r;
   assert.equal(directorio.jugadores.length,4);assert.equal(directorio.jugadores.find(j=>j.id===jugador(1)).figuritas,1);assert.equal(directorio.jugadores.find(j=>j.id===jugador(4)).figuritas,0);
   const album=(await db.query('select public.albumes_publicos_club($1) r',[jugador(1)])).rows[0].r;
   assert.deepEqual(album.inventario,[{id:catalogo[0].id,cantidad:2}]);assert.deepEqual(Object.keys(album.jugador).sort(),['id','nombre','foto','figuritas','versiones'].sort());
   const texto=JSON.stringify([directorio,album]);assert.ok(!texto.includes('@privado'));for(let n=1;n<=4;n++)assert.ok(!texto.includes(usuario(n)));
   assert.equal((await db.query('select public.albumes_publicos_club($1) r',[jugador(99)])).rows[0].r,null);
   await assert.rejects(db.exec('select * from album_privado.inventario'),/permission denied/);await assert.rejects(db.query('insert into album_privado.inventario values($1,$2,100)',[usuario(1),catalogo[0].id]),/permission denied/);
  }
 }finally{await db.close();}
});
