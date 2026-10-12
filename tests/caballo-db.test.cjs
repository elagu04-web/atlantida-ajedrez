const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');const root=path.resolve(__dirname,'..');
test('PostgreSQL: comprueba cada salto, la identidad, el mejor resultado y los empates del caballo',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create table jugadores(id text primary key,nombre text,apodo text,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
 const identidad=fs.readFileSync(root+'/supabase/migrations/20261007_identidad_rachas.sql','utf8').match(/create or replace function public\.mi_nombre_jugador_desafio\(\)[\s\S]*?\$\$;/)[0];await db.exec(identidad);
 const sql=fs.readFileSync(root+'/supabase/migrations/20261011_reto_caballo.sql','utf8');await db.exec(sql);await db.exec(sql);
 const uid1='00000000-0000-0000-0000-000000000001',uid2='00000000-0000-0000-0000-000000000002',uid3='00000000-0000-0000-0000-000000000003';
 await db.query('insert into auth.users values($1,$2),($3,$4),($5,$6)',[uid1,'ana@test.com',uid2,'david@test.com',uid3,'nuevo@test.com']);await db.exec("insert into jugadores values('ana','Ana',null,'ANA@test.com'),('david','David Morales',null,'david@test.com')");
 const reto=(await db.query('select obtener_reto_caballo() r')).rows[0].r;assert.equal(reto.marca,0);assert.equal(reto.registrable,true);
 // Recorrido determinista legal, según la salida que fija el servidor esta semana.
 const adj=i=>[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].map(([dr,dc])=>[Math.floor(i/8)+dr,i%8+dc]).filter(([r,c])=>r>=0&&r<8&&c>=0&&c<8).map(([r,c])=>r*8+c);
 const recorrido=[reto.inicial];while(recorrido.length<10){const next=adj(recorrido.at(-1)).filter(i=>!recorrido.includes(i)).sort((a,b)=>adj(a).filter(i=>!recorrido.includes(i)).length-adj(b).filter(i=>!recorrido.includes(i)).length)[0];if(next===undefined)break;recorrido.push(next);}assert.ok(recorrido.length>=5);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from minijuegos_caballo'));await assert.rejects(()=>db.query('select registrar_recorrido_caballo($1,$2)',[reto.semana,recorrido]));await db.exec('reset role');
 async function cuenta(uid){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec('set role authenticated');}
 async function guardar(p,semana=reto.semana){return (await db.query('select registrar_recorrido_caballo($1,$2) r',[semana,p])).rows[0].r;}
 await cuenta('');await assert.rejects(()=>guardar(recorrido),/Iniciá sesión/);
 await cuenta(uid3);await assert.rejects(()=>guardar(recorrido),/Vinculá tu jugador/);
 await cuenta(uid1);
 for(const p of [null,{},[],[reto.inicial],[reto.inicial,reto.inicial],[reto.inicial,64],[reto.inicial,-1],[reto.inicial,recorrido[1]+.5],[String(reto.inicial),recorrido[1]],[...recorrido,recorrido[0]],Array(65).fill(reto.inicial)])await assert.rejects(()=>guardar(p));
 await assert.rejects(()=>guardar(recorrido,'2000-01-01'),/cambió de semana/);
 const falso=[reto.inicial,(reto.inicial+1)%64];await assert.rejects(()=>guardar(falso),/saltar en L/);
 assert.equal((await guardar(recorrido.slice(0,3))).marca,3);assert.equal((await guardar(recorrido)).marca,recorrido.length);assert.equal((await guardar(recorrido.slice(0,2))).marca,recorrido.length);
 assert.equal((await db.query('select obtener_reto_caballo() r')).rows[0].r.marca,recorrido.length);
 await assert.rejects(()=>db.query('update minijuegos_caballo set recorrido=$1',[recorrido.slice(0,2)]));
 await cuenta(uid2);await guardar(recorrido);
 let tabla=(await db.query('select * from tabla_reto_caballo()')).rows;assert.equal(tabla.length,2);assert.deepEqual(tabla.map(r=>r.puesto),[1,1]);assert.ok(tabla.find(r=>r.nombre==='David Morales').es_mio);assert.equal(tabla.find(r=>r.nombre==='Ana').es_mio,false);
 await db.exec('reset role');await db.query("insert into minijuegos_caballo(usuario_id,semana,recorrido) values($1,'2000-01-01',$2)",[uid1,recorrido]);await cuenta(uid1);assert.equal((await db.query('select count(*)::int n from tabla_reto_caballo()')).rows[0].n,2);
 // Una actualización repetida o menor no baja la marca, incluso con solicitudes simultáneas.
 await Promise.all([guardar(recorrido.slice(0,3)),guardar(recorrido.slice(0,2))]);assert.equal((await db.query('select obtener_reto_caballo() r')).rows[0].r.marca,recorrido.length);
 await db.exec('reset role');await db.query("insert into jugadores values('ana-duplicada','Otra Ana',null,$1)",['ana@test.com']);await cuenta(uid1);await assert.rejects(()=>guardar(recorrido),/varios jugadores/);tabla=(await db.query('select * from tabla_reto_caballo()')).rows;assert.equal(tabla.length,1);assert.equal(tabla[0].nombre,'David Morales');
 }finally{await db.close();}
});
