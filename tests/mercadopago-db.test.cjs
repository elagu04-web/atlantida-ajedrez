const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const u='00000000-0000-0000-0000-000000000001',v='00000000-0000-0000-0000-000000000002',j='10000000-0000-0000-0000-000000000001',id='20000000-0000-0000-0000-000000000001';
test('Cobros: ACL, cuentas aisladas, cuota única por factura, calendario, rechazos, cancelación y devolución',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table jugadores(id uuid primary key,nombre text,apodo text,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;grant usage on schema auth to authenticated;`);
 await db.query('insert into auth.users values($1,$2,now()),($3,$4,now())',[u,'a@test.invalid',v,'b@test.invalid']);await db.query('insert into jugadores values($1,$2,null,$3)',[j,'Jugador','a@test.invalid']);
 for(const f of ['20261030192715_membresias_club_manual.sql','20261103174553_mercado_pago_suscripciones.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
 async function rol(r){await db.exec('reset role');await db.exec(`set role ${r}`);}
 async function rpc(a,b={},usuario=u){return (await db.query('select public.pagos_mercadopago($1,$2,$3) r',[a,usuario,JSON.stringify(b)])).rows[0].r;}
 for(const r of ['anon','authenticated']){await rol(r);await assert.rejects(()=>rpc('preparar',{id,plan:'club',produccion:true,correo:'mp@test.invalid'}));await assert.rejects(()=>db.query('select * from pagos_privado.suscripciones'));}
 await rol('service_role');let x=await rpc('preparar',{id,plan:'club',produccion:true,correo:'mp@test.invalid'});assert.equal(x.nueva,true);assert.equal(x.suscripcion.importe,40000);
 x=await rpc('preparar',{id:'20000000-0000-0000-0000-000000000002',plan:'completo',produccion:true,correo:'mp@test.invalid'});assert.equal(x.nueva,false);assert.equal(x.suscripcion.id,id);
 assert.deepEqual(await rpc('listar',{},v),[]);assert.equal(await rpc('buscar',{id},v),null);await assert.rejects(()=>rpc('estado',{id,proveedor:'SubABC',estado:'authorized',actualizada:'2026-11-03'},v));
 await rpc('vincular',{id,proveedor:'SubABC',estado:'authorized',actualizada:'2026-11-03',checkout:null});
 const cobro={id,pago:'25',factura:'15',importe:40000,devuelto:0,estado:'rejected',desde:'2024-01-31',actualizada:'2026-11-03T13:00:00Z'};
 await rpc('cobro',cobro);await db.exec('reset role');assert.equal((await db.query('select count(*) n from membresias_privado.periodos')).rows[0].n,0);
 await rol('service_role');await rpc('cobro',{...cobro,estado:'approved',actualizada:'2026-11-03T14:00:00Z'});await rpc('cobro',{...cobro,estado:'approved',actualizada:'2026-11-03T14:00:00Z'});
 await rpc('cobro',{...cobro,pago:'26',estado:'approved',actualizada:'2026-11-03T15:00:00Z'});
 await db.exec('reset role');const ps=(await db.query('select *,desde::text dia_desde,hasta::text dia_hasta from membresias_privado.periodos')).rows;assert.equal(ps.length,1);assert.equal(ps[0].dia_desde,'2024-01-31');assert.equal(ps[0].dia_hasta,'2024-02-29');assert.equal(ps[0].usuario_id,u);
 await rol('service_role');await rpc('estado',{id,proveedor:'SubABC',estado:'cancelled',actualizada:'2026-11-04'});await rpc('estado',{id,proveedor:'SubABC',estado:'authorized',actualizada:'2026-11-02'});assert.equal((await rpc('listar'))[0].estado,'cancelled');
 await db.exec('reset role');assert.equal((await db.query('select anulada from membresias_privado.periodos')).rows[0].anulada,false);
 await rol('service_role');await rpc('cobro',{...cobro,estado:'refunded',devuelto:40000,actualizada:'2026-11-05'});await rpc('cobro',{...cobro,estado:'approved',actualizada:'2026-11-04'});
 await db.exec('reset role');assert.equal((await db.query('select anulada from membresias_privado.periodos')).rows[0].anulada,true);assert.equal((await db.query('select count(*) n from membresias_privado.periodos')).rows[0].n,1);
 await rol('service_role');await assert.rejects(()=>rpc('cobro',{...cobro,pago:'otro',importe:1}));await assert.rejects(()=>rpc('cobro',{...cobro,factura:'16',desde:'2024-02-01'}));
 const rls=(await db.query("select count(*) n from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='pagos_privado' and c.relkind='r' and c.relrowsecurity")).rows[0].n;assert.equal(rls,3);
 }finally{await db.close();}
});
