const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
test('Ale y las partidas son privados por cuenta; se unen dispositivos y el nivel se ajusta sin duplicar resultados',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
 const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261012_ale_cuenta.sql'),'utf8');await db.exec(sql);await db.exec(sql);
 const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';await db.query('insert into auth.users values($1),($2)',[a,b]);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select obtener_progreso_ale()'));await assert.rejects(()=>db.query('select * from ale_partidas_completadas'));
 async function cuenta(uid){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec('set role authenticated');}
 await cuenta(a);await assert.rejects(()=>db.query('select * from partidas_bots_usuario'));let p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify([{id:'z-ganada',resultado:'victoria'},{id:'a-perdida',resultado:'derrota'}])])).rows[0].p;assert.deepEqual(p.partidas,['z-ganada','a-perdida']);assert.equal(p.elo,1400);
 p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify([{id:'otro-dispositivo',resultado:'victoria'}])])).rows[0].p;assert.equal(p.elo,1450);assert.equal(p.partidas.length,3);
 p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify([{id:'z-ganada',resultado:'derrota'}])])).rows[0].p;assert.equal(p.elo,1450);assert.equal(p.resultados['z-ganada'],'victoria');
 const partida={id:'final-ale',fecha:'2026-10-12T18:00:00.000Z',perfil:'ale',color:'w',elo:1450,nivel:'Club',resultado:'0-1',pgn:'[Result "0-1"]\n1. f3 e5 2. g4 Qh4# 0-1',jugadas:4};
 let r=(await db.query('select registrar_partida_bot($1) r',[JSON.stringify(partida)])).rows[0].r;assert.equal(r.progreso.elo,1400);assert.equal(r.guardada,true);r=(await db.query('select registrar_partida_bot($1) r',[JSON.stringify(partida)])).rows[0].r;assert.equal(r.progreso.elo,1400);assert.equal(r.progreso.partidas.length,4);
 assert.equal((await db.query('select obtener_partidas_bots() p')).rows[0].p.length,1);assert.equal((await db.query('select obtener_partidas_bots(50) p')).rows[0].p.length,0);
 for(const v of [{...partida,id:'',resultado:'*'},{...partida,id:'malo',jugadas:0},{...partida,id:'malo',fecha:'no-es-fecha'}])await assert.rejects(()=>db.query('select registrar_partida_bot($1)',[JSON.stringify(v)]));
 await cuenta(b);assert.equal((await db.query('select obtener_progreso_ale() p')).rows[0].p.elo,1400);assert.deepEqual((await db.query('select obtener_partidas_bots() p')).rows[0].p,[]);
 p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify(['legado-1','legado-2'])])).rows[0].p;assert.equal(p.elo,1500);
 const empates=Array.from({length:10},(_,i)=>({id:'empate-'+i,resultado:'tablas'}));p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify(empates)])).rows[0].p;assert.equal(p.elo,1500);p=(await db.query('select sincronizar_progreso_ale($1) p',[JSON.stringify([{id:'ajuste-fino',resultado:'victoria'}])])).rows[0].p;assert.equal(p.elo,1525);
 await cuenta(a);assert.equal((await db.query('select obtener_progreso_ale() p')).rows[0].p.elo,1400);assert.equal((await db.query('select obtener_partidas_bots() p')).rows[0].p[0].id,'final-ale');
 await assert.rejects(()=>db.query('select sincronizar_progreso_ale($1)',[JSON.stringify([{id:'x',resultado:'desconocido'}])]));
 }finally{await db.close();}
});
