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
  async function entrar(u,rol='authenticated',jwt={}){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false),set_config('test.jwt',$2,false)",[u??'',JSON.stringify(jwt)]);await db.exec(`set role ${rol}`);}
  async function api(accion='resumen',datos={}){return (await db.query('select public.album_club($1,$2) r',[accion,JSON.stringify(datos)])).rows[0].r;}
  await entrar(null,'anon');await assert.rejects(()=>api());
  await entrar(a);await assert.rejects(()=>db.query('select * from album_privado.inventario'));await assert.rejects(()=>db.query('select album_privado.disponibles($1,$2)',[b,catalogo[0].id]));
  let estado=await api();assert.equal(estado.compartir,false);assert.equal(estado.inventario.length,0);assert.deepEqual(await api('mercado'),[]);
  estado=await api('sobre',{tipo:'bienvenida'});assert.equal(estado.sobre.figuritas.length,6);const primero=estado.sobre.figuritas;
  const cantidad=e=>e.inventario.reduce((s,f)=>s+f.cantidad,0);assert.equal(cantidad(estado),6);
  estado=await api('sobre',{tipo:'bienvenida'});assert.equal(estado.sobre.yaAbierto,true);assert.deepEqual(estado.sobre.figuritas,primero);assert.equal(cantidad(estado),6);
  estado=await api('sobre',{tipo:'diario'});assert.equal(cantidad(estado),9);assert.equal(estado.diario,false);assert.equal(cantidad(await api('sobre',{tipo:'diario'})),9);
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
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from album_privado.catalogo')).rows[0].n,catalogo.length);
 }finally{await db.close();}
});
