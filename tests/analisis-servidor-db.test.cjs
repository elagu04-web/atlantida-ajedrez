const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
test('Cola privada: RLS, credenciales efímeras, guardado por partes, reanudación y finalización con conflictos',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;grant usage on schema auth to anon,authenticated;grant execute on all functions in schema auth to anon,authenticated;create schema net;create table net.enviados(body jsonb,headers jsonb);create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin insert into net.enviados values(body,headers);return 1;end;$$;create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;`);
  await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261014131050_entrenamiento_cuenta.sql'),'utf8'));
  const nombre=fs.readdirSync(path.resolve(__dirname,'../supabase/migrations')).find(n=>n.endsWith('_analisis_entrenamiento_servidor.sql'));
  await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',nombre),'utf8').replace('create extension if not exists pg_net with schema extensions;',''));
  const relevo=fs.readdirSync(path.resolve(__dirname,'../supabase/migrations')).find(n=>n.endsWith('_relevo_privado_analisis.sql'));await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',relevo),'utf8'));
  const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',lote='00000000-0000-4000-8000-000000000003',falso='00000000-0000-4000-8000-000000000004';
  await db.query('insert into auth.users values($1),($2)',[a,b]);await db.exec("update atlantida_privado.analisis_config set activo=true,clave_publica='public-jwt'");
  async function usuario(u,role='authenticated'){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[u??'']);await db.exec('set role '+role);}
  const datos=[{pgn:'1. e4 *',titulo:'Prueba',color:'w',total:2}];
  await usuario(null,'anon');await assert.rejects(()=>db.query('select public.encolar_entrenamiento_analisis($1,$2)',[JSON.stringify(datos),lote]));
  await usuario(a);await assert.rejects(()=>db.query('select * from atlantida_privado.analisis_datos'));
  await db.query('select public.encolar_entrenamiento_analisis($1,$2)',[JSON.stringify(datos),lote]);await db.query('select public.encolar_entrenamiento_analisis($1,$2)',[JSON.stringify(datos),lote]);
  const j=(await db.query('select * from public.entrenamiento_analisis')).rows[0];assert.equal((await db.query('select * from public.entrenamiento_analisis')).rows.length,1);
  await assert.rejects(()=>db.query("update public.entrenamiento_analisis set estado='terminado'"));
  await usuario(b);assert.equal((await db.query('select * from public.entrenamiento_analisis')).rows.length,0);await db.query('select public.cambiar_lote_entrenamiento_analisis($1,false)',[lote]);
  await db.exec('reset role');await db.query('select public.reclamar_entrenamiento_analisis()');let token=(await db.query('select token from atlantida_privado.analisis_datos')).rows[0].token;
  await usuario(null,'anon');await assert.rejects(()=>db.query('select public.reclamar_entrenamiento_analisis()'));assert.equal((await db.query('select public.tomar_entrenamiento_analisis($1,$2) r',[j.id,falso])).rows[0].r,null);
  let t=(await db.query('select public.tomar_entrenamiento_analisis($1,$2) r',[j.id,token])).rows[0].r;assert.equal(t.pgn,'1. e4 *');
  assert.equal((await db.query('select public.tomar_entrenamiento_analisis($1,$2) r',[j.id,token])).rows[0].r,null);
  const evals=[{evaluacionCentipawns:20,mateEn:null,mejorJugada:'e2e4',variantePrincipal:['e2e4'],profundidad:10}];
  let r=(await db.query('select public.avance_entrenamiento_analisis($1,$2,$3,true) r',[j.id,token,JSON.stringify(evals)])).rows[0].r;assert.equal(r.vigente,true);
  r=(await db.query('select public.avance_entrenamiento_analisis($1,$2,$3,true) r',[j.id,token,JSON.stringify(evals)])).rows[0].r;assert.equal(r.vigente,false);
  await db.exec('reset role');await db.query('select public.reclamar_entrenamiento_analisis()');token=(await db.query('select token from atlantida_privado.analisis_datos')).rows[0].token;
  await usuario(null,'anon');t=(await db.query('select public.tomar_entrenamiento_analisis($1,$2) r',[j.id,token])).rows[0].r;assert.equal(t.evaluaciones.length,1);
  await assert.rejects(()=>db.query('select public.avance_entrenamiento_analisis($1,$2,$3,false)',[j.id,token,JSON.stringify([{...evals[0],evaluacionCentipawns:99}])]));
  await db.exec('reset role');await db.query("update atlantida_privado.analisis_datos set vence=now()-interval '1 second' where id=$1",[j.id]);const renovado=(await db.query('select public.reclamar_entrenamiento_analisis() r')).rows[0].r;assert.notEqual(renovado.token,token);await usuario(null,'anon');assert.equal((await db.query('select public.avance_entrenamiento_analisis($1,$2,$3,false) r',[j.id,token,JSON.stringify(evals)])).rows[0].r.vigente,false);token=renovado.token;assert.ok((await db.query('select public.tomar_entrenamiento_analisis($1,$2) r',[j.id,token])).rows[0].r);
  const sesion={id:j.sesion_id,pgn:'1. e4 *',color:'w',nota:'resultado'};const completas=[...evals,evals[0]];
  await db.exec('reset role');await db.query('insert into public.entrenamiento_documentos(usuario_id,clave,datos) values($1,$2,$3)',[a,'sesion:'+j.sesion_id,JSON.stringify({nota:'Otra edición'})]);
  await usuario(null,'anon');r=(await db.query('select public.avance_entrenamiento_analisis($1,$2,$3,false,$4,0) r',[j.id,token,JSON.stringify(completas),JSON.stringify(sesion)])).rows[0].r;assert.equal(r.conflicto,true);
  r=(await db.query('select public.avance_entrenamiento_analisis($1,$2,$3,false,$4,1) r',[j.id,token,JSON.stringify(completas),JSON.stringify(sesion)])).rows[0].r;assert.equal(r.conflicto,false);
  await usuario(a);assert.equal((await db.query('select estado from public.entrenamiento_analisis')).rows[0].estado,'terminado');assert.equal((await db.query('select revision from public.entrenamiento_documentos')).rows[0].revision,2);
  await assert.rejects(()=>db.query('select public.encolar_entrenamiento_analisis($1,$2)',[JSON.stringify(Array(31).fill(datos[0])),falso]));
  await db.exec('reset role');const avisos=(await db.query('select body,headers from net.enviados')).rows;assert.ok(avisos.length>0);assert.ok(avisos.every(x=>JSON.stringify(x.body)==='{}'&&x.headers.Authorization==='Bearer public-jwt'));
  const privadas=(await db.query("select n.nspname from pg_proc p join pg_namespace n on p.pronamespace=n.oid where prosecdef and proname like '%analisis%'")).rows;assert.ok(privadas.every(x=>x.nspname==='atlantida_privado'));
 }finally{await db.close();}
});
