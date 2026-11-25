const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const catalogo=require('../lib/albumCatalogo.json');
const migration=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).find(f=>f.endsWith('_album_club_figuritas.sql'));
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002',c='00000000-0000-0000-0000-000000000003';
const id='20000000-0000-0000-0000-000000000001',id2='20000000-0000-0000-0000-000000000002';
test('Álbum: sobres persistentes, privacidad, reservas e intercambio bilateral sin perder la última copia',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table public.jugadores(id uuid primary key,nombre text,apodo text);create schema club_online_privado;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;create function club_online_privado.jugador(p uuid) returns uuid language sql stable as $$select id from public.jugadores where id=p$$;grant usage on schema auth to authenticated;`);
  await db.query('insert into auth.users values($1),($2),($3)',[a,b,c]);
  await db.query("insert into public.jugadores values($1,'Jugador A',null),($2,'Jugador B',null),($3,'Jugador C',null)",[a,b,c]);
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',migration),'utf8'));
  await db.exec(`create table public.torneos(id uuid primary key,nombre text,estado text,formato text,iniciado_en timestamptz,created_at timestamptz default now(),excluir_elo boolean default false,jugadores_ids jsonb,rondas jsonb);
   create table public.online_torneos(id uuid primary key,nombre text,estado text,creada timestamptz default now(),actualizada timestamptz default now());
   create table public.online_torneo_jugadores(torneo_id uuid,usuario_id uuid);
   create table public.online_torneo_cruces(torneo_id uuid,blancas_id uuid,negras_id uuid,partida_id uuid,resultado_manual text);
   create table public.online_partidas(id uuid primary key,creador_id uuid,rival_id uuid,estado jsonb,actualizada timestamptz default now());
   create table public.desafios_resueltos(usuario_id uuid,dia date,resuelto_en timestamptz default now());create table public.desafios_fallados(usuario_id uuid,dia date);
   alter table public.jugadores add column foto_url text;`);
  const segunda=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).find(f=>f.endsWith('_album_sobres_por_participacion.sql'));
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',segunda),'utf8'));
  async function entrar(u,rol='authenticated',jwt={}){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false),set_config('test.jwt',$2,false)",[u??'',JSON.stringify(jwt)]);await db.exec(`set role ${rol}`);}
  async function api(accion='resumen',datos={}){return (await db.query('select public.album_club($1,$2) r',[accion,JSON.stringify(datos)])).rows[0].r;}
  await entrar(null,'anon');await assert.rejects(()=>api());assert.equal((await db.query('select public.catalogo_album_club() r')).rows[0].r.length,catalogo.length);
  await entrar(a);await assert.rejects(()=>db.query('select * from album_privado.inventario'));await assert.rejects(()=>db.query('select album_privado.disponibles($1,$2)',[b,catalogo[0].id]));
  let estado=await api();assert.equal(estado.compartir,false);assert.equal(estado.inventario.length,0);assert.deepEqual(await api('mercado'),[]);
  estado=await api('sobre',{tipo:'bienvenida'});assert.equal(estado.sobre.figuritas.length,6);const primero=estado.sobre.figuritas;
  const cantidad=e=>e.inventario.reduce((s,f)=>s+f.cantidad,0);assert.equal(cantidad(estado),6);
  estado=await api('sobre',{tipo:'bienvenida'});assert.equal(estado.sobre.yaAbierto,true);assert.deepEqual(estado.sobre.figuritas,primero);assert.equal(cantidad(estado),6);
  await assert.rejects(()=>api('sobre',{tipo:'diario'}));await assert.rejects(()=>api('sobre',{tipo:'recompensa',clave:'desafio:2026-11-24'}));
  await db.exec('reset role');await db.query("insert into desafios_resueltos(usuario_id,dia) values($1,'2026-11-24')",[a]);await entrar(a);
  estado=await api();assert.equal(estado.recompensas.length,1);estado=await api('sobre',{tipo:'recompensa',clave:'desafio:2026-11-24'});assert.equal(cantidad(estado),9);assert.equal(estado.recompensas.length,0);assert.equal(cantidad(await api('sobre',{tipo:'recompensa',clave:'desafio:2026-11-24'})),9);
  await assert.rejects(()=>api('sobre',{tipo:'ilimitado'}));
  await entrar(a,'authenticated',{is_anonymous:true});await assert.rejects(()=>api());
  // Deterministic fixtures isolate trading from random pack contents.
  await db.exec('reset role');await db.exec('delete from album_privado.inventario');
  const f=catalogo[0].id,g=catalogo[1].id;
  await db.query('insert into album_privado.inventario values($1,$2,2),($3,$4,2),($5,$4,2)',[a,f,b,g,c]);
  await entrar(a);await api('compartir',{activo:true});await entrar(b);await api('compartir',{activo:true});await entrar(c);await api('compartir',{activo:true});
  await entrar(a);const mercado=await api('mercado');assert.equal(mercado.length,2);assert.ok(!JSON.stringify(mercado).includes('email'));
  const p={id,destino:b,ofrece:f,pide:g};estado=await api('proponer',p);assert.equal(estado.inventario[0].disponibles,0);await api('proponer',p);assert.equal((await api()).intercambios.length,1);
  await assert.rejects(()=>api('proponer',{id:id2,destino:c,ofrece:f,pide:g}));
  await assert.rejects(()=>api('responder',{id,respuesta:'aceptar'}));
  await entrar(c);await assert.rejects(()=>api('responder',{id,respuesta:'aceptar'}));assert.equal((await api()).intercambios.length,0);
  await entrar(b);estado=await api('responder',{id,respuesta:'aceptar'});assert.equal(estado.intercambios[0].estado,'aceptado');assert.equal(estado.inventario.find(x=>x.id===g).cantidad,1);assert.equal(estado.inventario.find(x=>x.id===f).cantidad,1);assert.equal(cantidad(estado),2);
  await api('responder',{id,respuesta:'aceptar'});assert.equal(cantidad(await api()),2);
  await entrar(a);estado=await api();assert.equal(estado.inventario.find(x=>x.id===f).cantidad,1);assert.equal(estado.inventario.find(x=>x.id===g).cantidad,1);
  await assert.rejects(()=>api('proponer',{id:id2,destino:c,ofrece:f,pide:g}));
  await db.exec('reset role');await db.query('update album_privado.inventario set cantidad=3 where usuario_id=$1 and figurita_id=$2',[a,f]);
  await entrar(a);await api('proponer',{id:id2,destino:c,ofrece:f,pide:g});await db.exec('reset role');await db.query("update album_privado.intercambios set vence_en=now()-interval '1 second' where id=$1",[id2]);
  await entrar(c);estado=await api('responder',{id:id2,respuesta:'aceptar'});assert.equal(estado.intercambios[0].estado,'vencido');assert.equal(cantidad(estado),2);
  await entrar(a);assert.equal((await api()).inventario.find(x=>x.id===f).disponibles,2);
  const id3='20000000-0000-0000-0000-000000000003';
  // The receiver has only one copy after the first trade: it cannot be requested.
  await assert.rejects(()=>api('proponer',{id:id3,destino:b,ofrece:f,pide:g}));
  await api('proponer',{id:id3,destino:c,ofrece:f,pide:g});await entrar(c);await api('responder',{id:id3,respuesta:'rechazar'});
  await entrar(a);assert.equal((await api()).inventario.find(x=>x.id===f).disponibles,2);
  const id4='20000000-0000-0000-0000-000000000004';await api('proponer',{id:id4,destino:c,ofrece:f,pide:g});await api('responder',{id:id4,respuesta:'cancelar'});await api('responder',{id:id4,respuesta:'cancelar'});
  const id5='20000000-0000-0000-0000-000000000005';await api('proponer',{id:id5,destino:c,ofrece:f,pide:g});
  await db.exec('reset role');await db.query('update album_privado.inventario set cantidad=1 where usuario_id=$1 and figurita_id=$2',[c,g]);
  await entrar(c);estado=await api('responder',{id:id5,respuesta:'aceptar'});assert.equal(estado.intercambios[0].estado,'sin_stock');assert.equal(cantidad(estado),1);
  await db.exec('reset role');await db.query('update album_privado.inventario set cantidad=2 where usuario_id=$1 and figurita_id=$2',[c,g]);
  await entrar(a);assert.equal((await api()).inventario.find(x=>x.id===f).cantidad,3);
  const id6='20000000-0000-0000-0000-000000000006';await api('proponer',{id:id6,destino:c,ofrece:f,pide:g});await api('compartir',{activo:false});
  await entrar(c);assert.equal((await api()).intercambios[0].estado,'cancelado');await entrar(b);assert.ok(!(await api('mercado')).some(x=>x.cuenta===a));
  // A linked player in this edition receives their own sticker in the welcome pack.
  await db.exec('reset role');const propio=catalogo[0].jugadorId;await db.query('insert into auth.users values($1)',[propio]);await db.query("insert into public.jugadores values($1,'Del catálogo',null)",[propio]);await entrar(propio);estado=await api('sobre',{tipo:'bienvenida'});assert.ok(estado.sobre.figuritas.includes(catalogo[0].id));assert.equal(cantidad(estado),6);
  await entrar('00000000-0000-0000-0000-000000000099');await assert.rejects(()=>api('sobre',{tipo:'bienvenida'}));
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from album_privado.catalogo where activa')).rows[0].n,catalogo.length*3);
  // Exact boundaries: rarity and finish are independent server-side draws.
  for(const [r,v,rareza,acabado] of [[0,0,'comun','normal'],[.6999,.7999,'comun','normal'],[.7,.8,'rara','foil'],[.9499,.9499,'rara','foil'],[.95,.95,'mitica','full-art'],[.99,.1,'mitica','normal'],[.1,.99,'comun','full-art']]){
   const sorteada=(await db.query('select album_privado.sortear($1,$2) id',[r,v])).rows[0].id;const fila=(await db.query('select rareza,acabado from album_privado.catalogo where id=$1',[sorteada])).rows[0];assert.deepEqual(fila,{rareza,acabado});
  }
  await entrar(a);await assert.rejects(()=>db.query('select album_privado.sortear(0.99,0.99)'));await assert.rejects(()=>api('agregar',{jugadorId:b}));
  // Rewards come from authoritative sporting records, never client claims.
  await db.exec('reset role');const torneo='30000000-0000-0000-0000-000000000001',soloBye='30000000-0000-0000-0000-000000000002',online='30000000-0000-0000-0000-000000000003';
  const rondas=JSON.stringify([{numero:1,emparejamientos:[{blancasId:a,negrasId:b,resultado:'1-0'}]}]);
  await db.query("insert into torneos(id,nombre,estado,formato,iniciado_en,jugadores_ids,rondas) values($1,'El torneo','finalizado','suizo','2026-11-24T20:00Z',$2,$3)",[torneo,JSON.stringify([a,b]),rondas]);
  await db.query("insert into torneos(id,nombre,estado,formato,iniciado_en,jugadores_ids,rondas) values($1,'Sólo bye','finalizado','suizo','2026-11-24T20:00Z',$2,$3)",[soloBye,JSON.stringify([a]),JSON.stringify([{numero:1,emparejamientos:[{blancasId:a,negrasId:null,resultado:'1-0'}]}])]);
  const ganadas=[];for(let n=1;n<=7;n++){
   const pid=`40000000-0000-0000-0000-${String(n).padStart(12,'0')}`;const estado={fase:n===6?'anulada':'terminada',colorCreador:n===3||n===4?'b':'w',resultado:n===2||n===3?'0-1':n===5?'1/2-1/2':'1-0',movimientos:Array.from({length:n===7?2:4},()=>({san:'prueba'}))};
   const creador=n===2||n===4?b:a,rival=creador===a?b:a;await db.query("insert into online_partidas(id,creador_id,rival_id,estado,actualizada) values($1,$2,$3,$4,'2026-11-24T21:00Z')",[pid,creador,rival,JSON.stringify(estado)]);if(n<=4)ganadas.push(pid);
  }
  await db.query("insert into online_torneos(id,nombre,estado,creada,actualizada) values($1,'Online anterior','finalizado','2026-11-20T20:00Z','2026-11-24T21:00Z')",[online]);await db.query('insert into online_torneo_jugadores values($1,$2),($1,$3)',[online,a,c]);await db.query('insert into online_torneo_cruces values($1,$2,$3,$4,null)',[online,a,b,ganadas[0]]);
  await db.query("insert into desafios_resueltos(usuario_id,dia) values($1,'2026-11-24')",[c]);await db.query("insert into desafios_fallados values($1,'2026-11-24')",[c]);
  await entrar(a);estado=await api();assert.equal(estado.recompensas.filter(r=>r.clave.startsWith('victoria:')).length,4);assert.ok(estado.recompensas.some(r=>r.clave===`torneo:${torneo}`));assert.ok(estado.recompensas.some(r=>r.clave===`torneo-online:${online}`));assert.ok(!estado.recompensas.some(r=>r.clave===`torneo:${soloBye}`));
  for(const premio of estado.recompensas){const antes=cantidad(await api());const abierto=await api('sobre',{tipo:'recompensa',clave:premio.clave,rareza:'mitica',acabado:'full-art'});assert.equal(cantidad(abierto),antes+premio.cantidad);assert.equal(cantidad(await api('sobre',{tipo:'recompensa',clave:premio.clave})),antes+premio.cantidad);}
  await entrar(c);assert.equal((await api()).recompensas.length,0);await assert.rejects(()=>api('sobre',{tipo:'recompensa',clave:`victoria:${ganadas[0]}`}));
  const admin='f2c0ea67-e4e3-454e-81ee-f3175df90b3d';await db.exec('reset role');await db.query('insert into auth.users values($1)',[admin]);await db.query("insert into jugadores(id,nombre) values($1,'Admin')",[admin]);await db.query("update jugadores set foto_url='/imagenes/retratos/fonchi-transparente.webp' where id=$1",[b]);
  await entrar(admin);estado=await api('agregar',{jugadorId:b});assert.equal(estado.catalogo.length,catalogo.length+1);assert.equal((await api('agregar',{jugadorId:b})).catalogo.length,catalogo.length+1);await assert.rejects(()=>api('agregar',{jugadorId:c}));
  await db.exec('reset role');await db.query('insert into album_privado.inventario values($1,$2,1),($3,$4,2) on conflict(usuario_id,figurita_id) do update set cantidad=excluded.cantidad',[a,`${f}:foil`,c,`${g}:full-art`]);
  await entrar(a);await api('compartir',{activo:true});const variante={id:'20000000-0000-0000-0000-000000000007',destino:c,ofrece:`${f}:foil`,pide:`${g}:full-art`};await assert.rejects(()=>api('proponer',variante));
  await db.exec('reset role');await db.query('update album_privado.inventario set cantidad=2 where usuario_id=$1 and figurita_id=$2',[a,`${f}:foil`]);await entrar(a);await api('proponer',variante);await entrar(c);estado=await api('responder',{id:variante.id,respuesta:'aceptar'});assert.equal(estado.inventario.find(x=>x.id===`${g}:full-art`).cantidad,1);assert.equal(estado.inventario.find(x=>x.id===`${f}:foil`).cantidad,1);
 }finally{await db.close();}
});
test('Todas las figuritas iniciales tienen un retrato individual disponible',()=>{for(const f of catalogo){assert.ok(f.foto?.startsWith('/imagenes/retratos/'));assert.ok(fs.existsSync(path.join(__dirname,'../public',f.foto)),f.foto);}});
