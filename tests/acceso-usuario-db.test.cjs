const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
test('Acceso interno: nombres únicos, cuenta inmutable, resolución privada, límite atómico y limpieza por cuenta',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema atlantida_privado;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);`);
  const archivo=fs.readdirSync(path.resolve(__dirname,'../supabase/migrations')).find(x=>x.endsWith('_acceso_usuario.sql'));
  await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',archivo),'utf8'));
  const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
  await db.query("insert into auth.users values($1,'a@example.invalid',now(),null),($2,'b@example.invalid',now(),null)",[a,b]);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const sql of ["select * from atlantida_privado.accesos_usuario","select public.resolver_acceso_usuario('ale')",`select public.nombre_acceso_usuario('${a}')`,`select public.asignar_acceso_usuario('${a}','ale')`,"select public.limitar_acceso_usuario('limite',1,60)"])
    await assert.rejects(()=>db.exec(sql));
   await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await db.query('select public.asignar_acceso_usuario($1,$2)',[a,'ale']);
  await db.query('select public.asignar_acceso_usuario($1,$2)',[a,'ale']);
  assert.equal((await db.query("select public.resolver_acceso_usuario('ale') n")).rows[0].n,'a@example.invalid');
  await assert.rejects(()=>db.query('select public.asignar_acceso_usuario($1,$2)',[b,'ale']));
  await assert.rejects(()=>db.query('select public.asignar_acceso_usuario($1,$2)',[a,'otro']));
  await assert.rejects(()=>db.query('select public.asignar_acceso_usuario($1,$2)',[b,'Malo@club']));
  assert.equal((await db.query('select public.nombre_acceso_usuario($1) n',[a])).rows[0].n,'ale');
  assert.equal((await db.query("select public.resolver_acceso_usuario('desconocido') n")).rows[0].n,null);
  const limites=await Promise.all(Array.from({length:4},()=>db.query("select public.limitar_acceso_usuario('test',2,300) ok")));
  assert.deepEqual(limites.map(r=>r.rows[0].ok),[true,true,false,false]);
  await db.exec('reset role');await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[a]);
  await db.exec('set role service_role');assert.equal((await db.query("select public.resolver_acceso_usuario('ale') n")).rows[0].n,null);
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[a]);
  assert.equal((await db.query('select count(*) n from atlantida_privado.accesos_usuario')).rows[0].n,0);
 }finally{await db.close();}
});
