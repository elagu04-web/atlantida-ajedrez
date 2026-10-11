const fs=require('fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {test}=require('node:test');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('PostgreSQL: dificultad por rachas, reinicio, conservación, permisos y registro',async()=>{
const db=new PGlite();let checks=0;
await db.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;create schema cron;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table public.jugadores(id uuid primary key,nombre text,apodo text,email text);
create table cron.jobs(nombre text primary key,horario text,comando text);
create function cron.schedule(text,text,text) returns bigint language sql as $$ insert into cron.jobs values($1,$2,$3) on conflict(nombre) do update set horario=excluded.horario,comando=excluded.comando returning 1::bigint $$;`);
let base=fs.readFileSync(root+'/supabase/migrations/20261007_desafios_y_rachas.sql','utf8').replace(/create extension[^;]+;/g,'').replace('select public.desafios_actualizar();\n','').replace('select public.desafios_actualizar();\r\n','');
await db.exec(base);
await db.exec(fs.readFileSync(root+'/supabase/migrations/20261007_identidad_rachas.sql','utf8'));
const today=(await db.query("select (now() at time zone 'America/Montevideo')::date::text d")).rows[0].d;
const legacy={game:{pgn:'e4 e5'},puzzle:{id:'test1',rating:1800,initialPly:1,solution:['g1f3','b8c6','f1b5'],themes:[]}};
await db.query('insert into public.desafios_diarios(dia,puzzle_id,rating,datos) values($1,$2,$3,$4)',[today,'test1',1800,legacy]);
const migration=fs.readFileSync(root+'/supabase/migrations/20261011_desafios_progresivos.sql','utf8');
await db.exec(migration);
assert.equal((await db.query('select puzzle_id from desafios_diarios where dia=$1',[today])).rows[0].puzzle_id,'test1');checks++;
assert.equal((await db.query('select count(*)::int n from desafios_banco')).rows[0].n,2437);checks++;
const users=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'];
for(let i=0;i<users.length;i++){await db.query('insert into auth.users values($1,$2)',[users[i],`u${i}@test.com`]);await db.query('insert into jugadores values($1,$2,null,$3)',[users[i],`Jugador ${i}`,`u${i}@test.com`]);await db.query('insert into desafios_participantes(usuario_id,nombre) values($1,$2)',[users[i],`Jugador ${i}`]);}
async function seed(dates,user=users[0]){for(const d of dates){await db.query('insert into desafios_diarios(dia,puzzle_id,rating,datos) values($1,$2,1800,$3) on conflict(dia) do nothing',[d,'seed1',legacy]);await db.query('insert into desafios_resueltos(usuario_id,dia) values($1,$2) on conflict do nothing',[user,d]);}}
async function level(d,rating,streak){const r=(await db.query('select * from desafios_nivel($1)',[d])).rows[0];assert.deepEqual(r,{racha_base:streak,objetivo:rating});checks++;}
await level('2026-09-01',1800,0);
await seed(['2026-09-01']);await level('2026-09-02',1800,1);
await seed(['2026-09-02']);await level('2026-09-03',1850,2);
await seed(['2026-09-03']);await level('2026-09-04',1900,3);
await level('2026-09-05',1800,0); // Se salteó un día.
await seed(['2026-09-02','2026-09-03'],users[1]);
await db.query('insert into desafios_fallados(usuario_id,dia) values($1,$2)',[users[0],'2026-09-03']);
await level('2026-09-04',1850,2); // Otro jugador mantiene su racha.
await db.query('insert into desafios_fallados(usuario_id,dia) values($1,$2)',[users[1],'2026-09-03']);
await level('2026-09-04',1800,0); // Todos perdieron.
await seed(['2026-09-04']);await level('2026-09-05',1800,1); // Reinicia, no usa el récord anterior.
await seed(['2026-09-05']);await level('2026-09-06',1850,2);
// Las resoluciones del propio día no cambian el objetivo.
await seed(['2026-09-06']);await level('2026-09-06',1850,2);
await db.exec(migration);assert.equal((await db.query('select count(*)::int n from desafios_banco')).rows[0].n,2437);assert.equal((await db.query('select count(*)::int n from cron.jobs')).rows[0].n,1);checks++;
await db.exec('delete from desafios_resueltos;delete from desafios_fallados;');
await db.query('delete from desafios_diarios where dia=$1',[today]);
const offsets=(await db.query("select ((now() at time zone 'America/Montevideo')::date-2)::text a,((now() at time zone 'America/Montevideo')::date-1)::text b")).rows[0];await seed([offsets.a,offsets.b]);
const daily=(await db.query('select obtener_desafio_diario() as d')).rows[0].d;
assert.equal(daily.objetivo,1850);assert.equal(daily.racha_base,2);assert.ok(Math.abs(daily.datos.puzzle.rating-1850)<=25);checks++;
// La selección es inmutable incluso después de perder todos.
await db.query('insert into desafios_fallados(usuario_id,dia) values($1,$2)',[users[0],today]);
assert.deepEqual((await db.query('select obtener_desafio_diario() d')).rows[0].d,daily);checks++;
await db.exec('set role anon');assert.equal((await db.query('select obtener_desafio_diario() d')).rows[0].d.datos.puzzle.id,daily.datos.puzzle.id);checks++;
await assert.rejects(()=>db.query('select * from desafios_banco'));await assert.rejects(()=>db.query('select * from desafios_nivel($1)',[today]));checks++;
await db.exec('reset role;delete from desafios_fallados;');
await db.query("select set_config('test.uid',$1,false)",[users[0]]);await db.exec('set role authenticated');
assert.equal((await db.query('select registrar_desafio_resuelto($1,$2,$3,$4) ok',[today,daily.datos.puzzle.id,'Otro nombre',daily.datos.puzzle.solution])).rows[0].ok,true);checks++;
assert.equal((await db.query('select nombre from tabla_rachas_desafios()')).rows[0].nombre,'Jugador 0');checks++;
await db.exec('reset role');
// Cuando se agota el nivel, recicla el menos reciente y no salta a un nivel ajeno.
await db.query('delete from desafios_resueltos where dia=$1',[today]);await db.query('delete from desafios_diarios where dia=$1',[today]);
const tier=(await db.query('select puzzle_id,datos,rating from desafios_banco where round(rating/50.0)*50=1850 order by puzzle_id')).rows;
for(let i=0;i<tier.length;i++){await db.query("insert into desafios_diarios(dia,puzzle_id,rating,datos) values(('2020-01-01'::date+$1::integer),$2,$3,$4)",[i,tier[i].puzzle_id,tier[i].rating,tier[i].datos]);}
assert.equal((await db.query('select obtener_desafio_diario() d')).rows[0].d.datos.puzzle.id,tier[0].puzzle_id);checks++;
// Más de 1900: no queda atrapado en el rango anterior.
await db.query('delete from desafios_diarios where dia=$1',[today]);
const earlier=(await db.query("select ((now() at time zone 'America/Montevideo')::date-i)::text d from generate_series(3,5) i")).rows;await seed(earlier.map(r=>r.d));
const higher=(await db.query('select obtener_desafio_diario() d')).rows[0].d;assert.equal(higher.objetivo,2000);assert.ok(Math.abs(higher.datos.puzzle.rating-2000)<=25);checks++;
assert.equal(checks,21);await db.close();
});
