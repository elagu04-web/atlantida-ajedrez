const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
test('Entrenamiento privado: RLS, versiones, conflictos y cambios de cuenta sin mezclar datos',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261014131050_entrenamiento_cuenta.sql'),'utf8');await db.exec(sql);await db.exec(sql);
  const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';await db.query('insert into auth.users values($1),($2)',[a,b]);
  await db.exec('set role anon');await assert.rejects(()=>db.query('select * from entrenamiento_documentos'));await assert.rejects(()=>db.query('select guardar_entrenamiento_documento($1,$2,0,$3)', ['guiado:v1','{}',a]));
  async function cuenta(id){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');}
  async function guardar(clave,datos,revision,usuario=a){return (await db.query('select guardar_entrenamiento_documento($1,$2,$3,$4) r',[clave,JSON.stringify(datos),revision,usuario])).rows[0].r;}
  await cuenta(a);let r=await guardar('guiado:v1',{version:1,nota:'Primera idea'},0);assert.equal(r.conflicto,false);assert.equal(r.revision,1);
  r=await guardar('guiado:v1',{version:1,nota:'Segundo dispositivo'},0);assert.equal(r.conflicto,true);assert.equal(r.revision,1);assert.equal(r.datos.nota,'Primera idea');
  r=await guardar('guiado:v1',{version:1,nota:'Cambio confirmado'},1);assert.equal(r.revision,2);assert.equal(r.conflicto,false);
  r=await guardar('guiado:v1',{version:1,nota:'Cambio viejo'},1);assert.equal(r.conflicto,true);assert.equal(r.datos.nota,'Cambio confirmado');
  await assert.rejects(()=>db.query('update entrenamiento_documentos set usuario_id=$1 where usuario_id=$2',[b,a]));
  await cuenta(b);assert.equal((await db.query('select * from entrenamiento_documentos')).rows.length,0);
  await assert.rejects(()=>guardar('guiado:v1',{version:1,nota:'El request de la cuenta anterior'},0,a));
  assert.equal((await db.query('select * from entrenamiento_documentos')).rows.length,0);
  r=await guardar('guiado:v1',{version:1,nota:'Cuenta B'},0,b);assert.equal(r.conflicto,false);
  await cuenta(a);assert.equal((await db.query('select datos from entrenamiento_documentos')).rows[0].datos.nota,'Cambio confirmado');
  await assert.rejects(()=>guardar('otra-clave',{},0));await assert.rejects(()=>guardar('guiado:v1',[],0));await assert.rejects(()=>guardar('guiado:v1',{},-1));await assert.rejects(()=>guardar('guiado:v1',{},0,null));
  const funciones=(await db.query("select prosecdef from pg_proc where proname='guardar_entrenamiento_documento'")).rows;assert.equal(funciones[0].prosecdef,false);
 }finally{await db.close();}
});
