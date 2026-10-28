const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {PGlite}=require('@electric-sql/pglite'),{siguienteRondaOnline,tablaTorneoOnline}=require('../lib/torneosOnline.ts'),o=require('../lib/partidaOnline.ts');
const admin='f2c0ea67-e4e3-454e-81ee-f3175df90b3d',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',d='44444444-4444-4444-8444-444444444444';
test('Torneo completo: cuentas, coordinación privada, comienzo conjunto, resultados y permisos',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create table public.jugadores(nombre text,apodo text,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;`);
  for(const f of ['20261019205821_partidas_online.sql','20261019224336_elo_online.sql','20261028011711_torneos_online.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8').replace('alter publication supabase_realtime add table public.online_partidas;',''));
  await db.query(`insert into auth.users select x::uuid,x||'@test.invalid',jsonb_build_object('full_name','Jugador '||left(x,1)) from unnest($1::text[])x`,[[admin,a,b,c,d]]);
  async function cuenta(id){await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${id}';set request.jwt.claims='{}'`);}
  async function rpc(sql,args=[]){return (await db.query('select public.'+sql+' as dato',args)).rows[0]?.dato;}
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await cuenta(a);await assert.rejects(rpc('crear_torneo_online($1,$2,$3,$4,$5,$6,$7)',[id,'Copa prueba','round-robin','10+3',5,true,3]),/organizador/);
  await cuenta(admin);await rpc('crear_torneo_online($1,$2,$3,$4,$5,$6,$7)',[id,'Copa prueba','round-robin','10+3',5,true,3]);
  for(const u of [a,b,c]){await cuenta(u);await assert.rejects(rpc('inscribir_torneo_online($1,true,false)',[id]),/Elo/);await rpc('inscribir_torneo_online($1,true,true)',[id]);}
  await cuenta(admin);let datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.jugadores.length,3);
  const inicial=datos.torneo.version;await rpc('publicar_ronda_online($1,$2,$3)',[id,inicial,siguienteRondaOnline(datos)]);
  await assert.rejects(rpc('publicar_ronda_online($1,$2,$3)',[id,inicial,[]]),/Cambió/);
  datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.torneo.max_rondas,3);assert.equal(datos.cruces.filter(x=>x.partidaId).length,0);assert.equal(tablaTorneoOnline(datos).reduce((n,x)=>n+x.puntos,0),0);
  const cr=datos.cruces.find(x=>x.negrasId),w=cr.blancasId,black=cr.negrasId;
  const coord=(accion,texto=null,hora=null)=>rpc('coordinar_torneo_online($1,1,$2,$3,$4,$5)',[id,cr.mesa,accion,texto,hora]);
  await cuenta(w);await coord('mensaje','¿Mañana a las 19?');await coord('proponer',null,new Date(Date.now()+86400000).toISOString());
  await coord('listo');datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.cruces.find(x=>x.mesa===cr.mesa).partidaId,null);
  await cuenta(d);const ajeno=await rpc('obtener_torneo_online($1)',[id]);assert.equal(ajeno.cruces.find(x=>x.mesa===cr.mesa).coordinacion,null);await assert.rejects(coord('listo'),/dos rivales/);
  await assert.rejects(rpc('resolver_cruce_online($1,1,$2,$3)',[id,cr.mesa,'1-0']),/organizador/);
  await assert.rejects(db.query('select * from torneos_online_privado.coordinacion'),/permission denied/);await assert.rejects(db.query('update public.online_torneos set estado=\'finalizado\''),/permission denied/);
  await db.exec('reset role');await db.query("update torneos_online_privado.coordinacion set listo_w=clock_timestamp()-interval '3 minutes' where torneo_id=$1",[id]);
  await cuenta(black);datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.cruces.find(x=>x.mesa===cr.mesa).coordinacion.mensajes[0].texto,'¿Mañana a las 19?');await coord('aceptar');await coord('listo');
  assert.equal((await rpc('obtener_torneo_online($1)',[id])).cruces.find(x=>x.mesa===cr.mesa).partidaId,null);
  await cuenta(w);await coord('listo');
  datos=await rpc('obtener_torneo_online($1)',[id]);const gid=datos.cruces.find(x=>x.mesa===cr.mesa).partidaId;assert.ok(gid);
  const p=(await db.query('select * from public.online_partidas where id=$1',[gid])).rows[0];assert.equal(p.estado.fase,'activa');assert.deepEqual(p.estado.eloInicio,{w:1400,b:1400});assert.ok(p.estado.desde>0);
  await assert.rejects(coord('listo'),/ya está creada/);
  await cuenta(admin);await assert.rejects(rpc('cancelar_torneo_online($1)',[id]),/terminar/);await assert.rejects(rpc('publicar_ronda_online($1,$2,$3)',[id,datos.torneo.version,[]]),/Faltan partidas/);await assert.rejects(rpc('resolver_cruce_online($1,1,$2,$3)',[id,cr.mesa,'1-0']),/no comenzaron/);
  await db.exec('reset role;set role service_role');await db.query('update public.online_partidas set estado=$1,version=version+1 where id=$2',[o.aplicarAccionOnline(p.estado,'b',{tipo:'rendirse'},Number(p.estado.desde)+1000),gid]);
  await cuenta(d);assert.equal((await db.query('select * from public.online_partidas where id=$1',[gid])).rows.length,0);datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.cruces.find(x=>x.mesa===cr.mesa).resultado,'1-0');assert.equal(tablaTorneoOnline(datos).find(x=>x.jugadorId===w).puntos,1);
  for(let ronda=2;ronda<=3;ronda++){
   await cuenta(admin);datos=await rpc('obtener_torneo_online($1)',[id]);await rpc('publicar_ronda_online($1,$2,$3)',[id,datos.torneo.version,siguienteRondaOnline(datos)]);
   datos=await rpc('obtener_torneo_online($1)',[id]);for(const cruce of datos.cruces.filter(x=>x.ronda===ronda&&x.negrasId))await rpc('resolver_cruce_online($1,$2,$3,$4)',[id,ronda,cruce.mesa,'0-0']);
  }
  datos=await rpc('obtener_torneo_online($1)',[id]);assert.equal(datos.torneo.estado,'finalizado');assert.equal(tablaTorneoOnline(datos).reduce((n,x)=>n+x.puntos,0),1);
  await db.exec('reset role;set role anon');await assert.rejects(rpc('obtener_torneo_online($1)',[id]),/permission denied/);
  await cuenta(a);await db.exec(`set request.jwt.claims='{"is_anonymous":true}'`);await assert.rejects(rpc('obtener_torneo_online($1)',[id]),/sesión/);
 }finally{await db.close();}
});

test('Suizo: BYE solo en la ronda publicada y emparejamientos sin repetición',()=>{
 const datos={torneo:{id:'copa',nombre:'Suizo',formato:'suizo',estado:'abierto',max_rondas:3,ronda_actual:0,creada:new Date().toISOString()},jugadores:[a,b,c,d,admin].map((u,i)=>({usuario_id:u,nombre:u,elo:1800-i*100})),cruces:[]};
 assert.equal(tablaTorneoOnline(datos).reduce((n,x)=>n+x.puntos,0),0);
 for(let r=1;r<=3;r++){
  const cruces=siguienteRondaOnline(datos);assert.equal(cruces.length,3);assert.equal(new Set(cruces.flatMap(c=>c.negrasId?[c.blancasId,c.negrasId]:[c.blancasId])).size,5);
  for(const cr of cruces)if(cr.negrasId)assert.equal(datos.cruces.some(p=>[p.blancasId,p.negrasId].includes(cr.blancasId)&&[p.blancasId,p.negrasId].includes(cr.negrasId)),false);
  datos.cruces.push(...cruces.map((c,i)=>({...c,ronda:r,mesa:i+1,resultado:c.negrasId?'1-0':null})));datos.torneo.ronda_actual=r;
 }
 assert.equal(tablaTorneoOnline(datos).reduce((n,x)=>n+x.puntos,0),9);
});
