const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
test('Los récords del caballo conservan las marcas de semanas anteriores sin alterar el reto actual',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create table jugadores(id text primary key,nombre text,apodo text,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
 const identidad=fs.readFileSync(root+'/supabase/migrations/20261007_identidad_rachas.sql','utf8').match(/create or replace function public\.mi_nombre_jugador_desafio\(\)[\s\S]*?\$\$;/)[0];await db.exec(identidad);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261011_reto_caballo.sql','utf8'));
 const reto=(await db.query('select obtener_reto_caballo() r')).rows[0].r;
 const uid1='00000000-0000-0000-0000-000000000001',uid2='00000000-0000-0000-0000-000000000002';
 await db.query('insert into auth.users values($1,$2),($3,$4)',[uid1,'ana@test.com',uid2,'david@test.com']);await db.exec("insert into jugadores values('ana','Ana',null,'ANA@test.com'),('david','David Morales',null,'david@test.com')");
 const anterior=[56,41,24,9,3,13,7,22,5,15,30,47,62,52,58,48,33,16,1,11,26,32,49,59,42,57,40,50,60,43,53,63,46,31,14,4,10,0,17,2,8,25,19,36,21,6,23,38,55,61,51,34,28,18,12,27,37,20,35,45,39,29,44,54];
 await db.query('insert into minijuegos_caballo(usuario_id,semana,recorrido) values($1,$2::date-7,$3),($4,$2::date-7,$5)',[uid1,reto.semana,anterior,uid2,anterior.slice(0,40)]);
 const before=(await db.query('select usuario_id,semana,recorrido,casillas from minijuegos_caballo order by usuario_id')).rows;
 const sql=fs.readFileSync(root+'/supabase/migrations/20261012_records_caballo.sql','utf8');await db.exec(sql);await db.exec(sql);
 assert.deepEqual((await db.query('select usuario_id,semana,recorrido,casillas from minijuegos_caballo order by usuario_id')).rows,before);
 await db.exec('set role anon');assert.equal((await db.query('select obtener_reto_caballo() r')).rows[0].r.record,0);await assert.rejects(()=>db.query('select * from minijuegos_caballo'));
 let historico=(await db.query('select * from tabla_reto_caballo_records()')).rows;assert.deepEqual(historico.map(r=>[r.nombre,r.casillas,r.puesto,r.es_mio]),[['Ana',64,1,false],['David Morales',40,2,false]]);assert.deepEqual(Object.keys(historico[0]).sort(),['casillas','es_mio','jugador_id','nombre','puesto']);assert.equal((await db.query('select * from tabla_reto_caballo()')).rows.length,0);
 async function cuenta(uid){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec('set role authenticated');}
 await cuenta(uid1);const actual=(await db.query('select obtener_reto_caballo() r')).rows[0].r;assert.equal(actual.marca,0);assert.equal(actual.record,64);assert.equal(actual.semana,reto.semana);assert.equal(actual.inicial,reto.inicial);assert.ok((await db.query('select * from tabla_reto_caballo_records()')).rows.find(r=>r.nombre==='Ana').es_mio);
 const vecinos=i=>[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].map(([dr,dc])=>[Math.floor(i/8)+dr,i%8+dc]).filter(([r,c])=>r>=0&&r<8&&c>=0&&c<8).map(([r,c])=>r*8+c);const camino=[reto.inicial,vecinos(reto.inicial)[0]];
 await db.query('select registrar_recorrido_caballo($1,$2)',[reto.semana,camino]);const r=(await db.query('select obtener_reto_caballo() r')).rows[0].r;assert.equal(r.marca,2);assert.equal(r.record,64);assert.equal((await db.query('select * from tabla_reto_caballo()')).rows[0].casillas,2);
 await cuenta(uid2);assert.equal((await db.query('select obtener_reto_caballo() r')).rows[0].r.record,40);await db.exec('reset role');await db.query('insert into minijuegos_caballo(usuario_id,semana,recorrido) values($1,$2::date-14,$3)',[uid2,reto.semana,anterior]);await cuenta(uid2);historico=(await db.query('select * from tabla_reto_caballo_records()')).rows;assert.deepEqual(historico.map(r=>r.puesto),[1,1]);assert.equal(historico.length,2);
 await db.exec('reset role');await db.exec("insert into jugadores values('ana2','Ana duplicada',null,'ana@test.com')");await cuenta(uid1);assert.equal((await db.query('select * from tabla_reto_caballo_records()')).rows.length,1);
 }finally{await db.close();}
});
