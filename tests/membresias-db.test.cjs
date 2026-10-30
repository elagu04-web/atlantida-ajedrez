const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const admin='f2c0ea67-e4e3-454e-81ee-f3175df90b3d',a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002',ja='10000000-0000-0000-0000-000000000001',jb='10000000-0000-0000-0000-000000000002';
test('Membresías: administración autorizada, privacidad, idempotencia, calendario, anulaciones y vínculo explícito de cuentas',async()=>{
 const db=new PGlite();let n=0,usuario;
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table public.jugadores(id uuid primary key,nombre text,apodo text,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;`);
 await db.query('insert into auth.users values($1,$2,now()),($3,$4,now()),($5,$6,now())',[admin,'admin@test.invalid',a,'a@test.invalid',b,'b@test.invalid']);await db.query('insert into jugadores values($1,$2,null,$3),($4,$5,null,null)',[ja,'Jugador A','a@test.invalid',jb,'Jugador B']);
 const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261030192715_membresias_club_manual.sql'),'utf8');await db.exec(sql);
 async function entrar(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id??'']);await db.exec(`set role ${role}`);usuario=id;}
 async function gestionar(accion='resumen',p={},u=usuario){return (await db.query('select public.gestionar_membresias($1,$2,$3) r',[accion,JSON.stringify(p),u])).rows[0].r;}
 async function mia(u=usuario){return (await db.query('select public.mi_membresia($1) r',[u])).rows[0].r;}
 const recibo=(p={})=>({id:`20000000-0000-0000-0000-${String(++n).padStart(12,'0')}`,jugadorId:ja,plan:'club',desde:'2024-01-31',meses:1,importe:50000,medio:'efectivo',referencia:'Cuota prueba',...p});
 await entrar(null,'anon');await assert.rejects(()=>gestionar());await assert.rejects(()=>mia());await assert.rejects(()=>db.query('select * from membresias_privado.periodos'));
 await entrar(a);await assert.rejects(()=>gestionar());await assert.rejects(()=>db.query('select * from membresias_privado.periodos'));await assert.rejects(()=>mia(b));assert.deepEqual((await mia()).periodos,[]);
 await entrar(admin);let r=await gestionar();assert.equal(r.config.club,50000);assert.equal(r.periodos.length,0);assert.equal(r.jugadores.find(j=>j.id===ja).cuentaDisponible,true);
 const p=recibo();r=await gestionar('registrar',p);assert.equal(r.periodos[0].desde,'2024-01-31');assert.equal(r.periodos[0].hasta,'2024-02-29');assert.equal(r.periodos[0].cuentaVinculada,true);
 r=await gestionar('registrar',p);assert.equal(r.periodos.length,1);await assert.rejects(()=>gestionar('registrar',{...p,importe:60000}));
 r=await gestionar('registrar',recibo());assert.equal(r.periodos.length,2);assert.ok(r.periodos.some(p=>p.desde==='2024-02-29'&&p.hasta==='2024-03-29'));
 for(const parche of [{importe:-1},{medio:'efectivo',importe:0},{medio:'bonificacion',importe:100},{meses:0},{meses:13},{desde:'no-es-fecha'},{plan:'inventado'},{jugadorId:null},{importe:null}])await assert.rejects(()=>gestionar('registrar',recibo(parche)));
 await assert.rejects(()=>gestionar('configurar',{...r.config,revision:0}));await assert.rejects(()=>gestionar('configurar',{...r.config,revision:null}));r=await gestionar('configurar',{...r.config,club:55000});assert.equal(r.config.revision,2);assert.equal(r.config.club,55000);assert.equal(r.periodos[0].importe,50000);
 const solo=recibo({plan:'entrenamiento',importe:30000});r=await gestionar('registrar',solo);assert.equal(r.periodos.find(x=>x.id===solo.id).desde,'2024-01-31');
 const full=recibo({plan:'completo',importe:75000});r=await gestionar('registrar',full);assert.equal(r.periodos.find(x=>x.id===full.id).desde,'2024-03-29');
 await assert.rejects(()=>gestionar('anular',{id:full.id,motivo:'x'}));r=await gestionar('anular',{id:full.id,motivo:'Error de carga'});assert.equal(r.periodos.find(x=>x.id===full.id).anulada,true);r=await gestionar('anular',{id:full.id,motivo:'Reintento del mismo registro'});assert.equal(r.periodos.find(x=>x.id===full.id).motivoAnulacion,'Error de carga');
 const sinCuenta=recibo({jugadorId:jb,medio:'bonificacion',importe:0});r=await gestionar('registrar',sinCuenta);assert.equal(r.periodos.find(x=>x.id===sinCuenta.id).cuentaVinculada,false);
 await entrar(a);assert.equal((await mia()).periodos.length,4);await assert.rejects(()=>gestionar('vincular',{jugadorId:jb}));await entrar(b);assert.deepEqual((await mia()).periodos,[]);
 await db.exec('reset role');await db.query('update jugadores set email=$1 where id=$2',['b@test.invalid',jb]);await entrar(b);assert.deepEqual((await mia()).periodos,[]); // Claiming a player must not claim a paid benefit by itself.
 await entrar(admin);r=await gestionar('vincular',{jugadorId:jb});assert.equal(r.periodos.find(x=>x.id===sinCuenta.id).cuentaVinculada,true);await entrar(b);assert.equal((await mia()).periodos.length,1);assert.equal((await mia()).periodos[0].importe,0);
 await db.exec('reset role');await db.query('update auth.users set email=$1 where id=$2',['renombrado@test.invalid',a]);await entrar(a);assert.equal((await mia()).periodos.length,4); // Stable account ID, not client-submitted email.
 const lectura=(await db.query("select count(*) n from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in('mi_membresia','gestionar_membresias') and not p.prosecdef")).rows[0].n;assert.equal(Number(lectura),2);
 }finally{await db.close();}
});
