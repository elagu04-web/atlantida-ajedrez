"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icono } from "./Icono";
import { fechaNoticia, minutosNoticia, type Noticia } from "@/lib/noticias";
import styles from "./NoticiasClub.module.css";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();

export function ArchivoNoticias({ noticias }: { noticias: Noticia[] }) {
  const id = useId();
  const [categoria, setCategoria] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const categorias = Array.from(new Set(noticias.map(n => n.categoria)));
  const consulta = normalizar(busqueda);
  const visibles = noticias.filter(n => (!categoria || n.categoria === categoria) && (!consulta || normalizar(`${n.titulo} ${n.bajada} ${n.categoria}`).includes(consulta)));
  function limpiar() { setCategoria(""); setBusqueda(""); }

  return <section id="archivo-noticias" className={styles.archivo} aria-labelledby={`${id}-titulo`}>
    <div className={styles.cabeceraArchivo}>
      <div><p className="eyebrow">Para seguir leyendo</p><h2 id={`${id}-titulo`}>Las historias del club.</h2></div>
      <label className={styles.buscador}><span className="sr-only">Buscar una noticia</span><Icono nombre="buscar" className="h-4 w-4"/><input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar una historia…" maxLength={120} aria-controls={`${id}-resultados`}/></label>
    </div>
    <div className={styles.filtros} role="group" aria-label="Filtrar noticias por tema">
      <button type="button" aria-pressed={!categoria} onClick={() => setCategoria("")}>Todas</button>
      {categorias.map(c => <button type="button" key={c} aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>)}
    </div>
    <p className={styles.resultados} role="status" aria-live="polite">{visibles.length} {visibles.length === 1 ? "noticia" : "noticias"}{categoria ? ` · ${categoria}` : ""}{busqueda.trim() ? ` para «${busqueda.trim()}»` : ""}</p>
    <div id={`${id}-resultados`} className={styles.grilla}>
      {visibles.map(n => <article key={n.slug} className={styles.nota}><Link href={`/noticias/${n.slug}`}>
        <div className={styles.fotoArchivo}><Image src={n.imagen} alt={n.imagenAlt} fill quality={n.imagenCalidad ?? 75} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 380px" style={{objectPosition:n.imagenPosicion ?? "50% 50%",...(n.imagenZoom?{transform:`scale(${n.imagenZoom})`,transformOrigin:"61% 50%"}:{})}}/><span>{n.categoria}</span></div>
        <div className={styles.textoArchivo}><p className={styles.fecha}><time dateTime={n.fecha}>{fechaNoticia(n.fecha)}</time><span>· {minutosNoticia(n)} min</span></p><h3>{n.tituloTarjeta ?? n.titulo}</h3><p className={styles.bajada}>{n.bajada}</p><span className={styles.leer}>Leer historia<Icono nombre="flecha" className="h-4 w-4"/></span></div>
      </Link></article>)}
    </div>
    {!visibles.length && <div className={styles.vacio}><Icono nombre="buscar" className="h-6 w-6"/><h3>No encontramos esa historia.</h3><p>Probá con otro nombre o elegí otro tema.</p><button type="button" className="button-secondary" onClick={limpiar}>Mostrar todas las noticias</button></div>}
  </section>;
}
