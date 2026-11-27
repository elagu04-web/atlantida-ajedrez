-- Seis imágenes elegidas e identificadas por Agustín. No modifica sobres ni inventarios.
do $especiales$
declare f record;
begin
 perform pg_advisory_xact_lock(hashtextextended('album-catalogo',0));
 for f in select * from jsonb_to_recordset($datos$[{"id":"especial:montana-elo","numero":34,"nombre":"La montaña de Elo","detalle":"Siempre hay otra cumbre por alcanzar.","serie":"Especiales","jugadorId":null,"foto":"/imagenes/album/extra-montana-elo.webp","peso":10,"rareza":"comun"},{"id":"especial:hipopofonchy","numero":35,"nombre":"Hipopofonchy","detalle":"El hipopótamo del club tiene su propia carta.","serie":"Especiales","jugadorId":"adaff79d-3a75-4532-8ff7-3ec7238a21b6","foto":"/imagenes/album/extra-hipopofonchy.webp","peso":10,"rareza":"comun"},{"id":"especial:victornator","numero":36,"nombre":"Victornator","detalle":"Circuitos, piezas y una versión especial de Víctor.","serie":"Especiales","jugadorId":"0d188c7b-c5b7-4e75-852b-9a5d17379fdb","foto":"/imagenes/album/extra-victornator.webp","peso":10,"rareza":"comun"},{"id":"especial:momento-historico","numero":37,"nombre":"Momento histórico","detalle":"Un recuerdo del archivo y de las historias del club.","serie":"Especiales","jugadorId":null,"foto":"/imagenes/album/extra-momento-historico.webp","peso":10,"rareza":"comun"},{"id":"especial:ludoarte","numero":38,"nombre":"Ludoarte","detalle":"El lugar donde compartimos tableros, encuentros e historias.","serie":"Especiales","jugadorId":null,"foto":"/imagenes/album/extra-ludoarte.webp","peso":10,"rareza":"comun"},{"id":"especial:torneo-en-juego","numero":39,"nombre":"Torneo en juego","detalle":"Concentración, mesas compartidas y vida de club.","serie":"Especiales","jugadorId":null,"foto":"/imagenes/album/extra-torneo-en-juego.webp","peso":10,"rareza":"comun"}]$datos$::jsonb)
 as x(id text,numero integer,nombre text,detalle text,serie text,"jugadorId" uuid,foto text,peso integer,rareza text) loop
  if exists(select 1 from album_privado.catalogo c where c.activa and c.numero=f.numero and c.base_id<>f.id) then
   raise exception 'El número de figurita ya está ocupado: %',f.numero;
  end if;
  insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id,numero,nombre,detalle,serie,foto)
  select f.id||case when r.rareza='comun' then '' else ':rareza-'||r.rareza end||case when v.acabado='normal' then '' else ':'||v.acabado end,
   case when r.rareza='comun' and v.acabado='normal' then f."jugadorId" else null end,
   f.peso,true,r.rareza,v.acabado,f.id,f.numero,f.nombre,f.detalle,f.serie,f.foto
  from (values('comun'),('rara'),('mitica')) r(rareza) cross join (values('normal'),('foil'),('full-art')) v(acabado)
  on conflict(id) do update set activa=true,jugador_id=excluded.jugador_id,peso=excluded.peso,numero=excluded.numero,nombre=excluded.nombre,detalle=excluded.detalle,serie=excluded.serie,foto=excluded.foto;
 end loop;
end;
$especiales$;
