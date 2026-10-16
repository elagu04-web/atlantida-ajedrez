"use client";

import { useEffect, useRef, useState } from "react";
import { GRUPOS_TACTICOS, TEMAS_TACTICOS, obtenerTema, revisarTemas, sugerirTemas, type GrupoTactico } from "@/lib/temasTacticos";
import styles from "./SelectorTemasTacticos.module.css";

export function SelectorTemasTacticos({id,elegidos,consulta,alCambiar,alContinuar}:{id:string;elegidos:string[];consulta:string;alCambiar:(temas:string[],consulta:string)=>void;alContinuar:()=>void}) {
  const [abierto,setAbierto]=useState(false),[grupo,setGrupo]=useState<GrupoTactico|undefined>(),[activo,setActivo]=useState(0);
  const opciones= sugerirTemas(consulta,{grupo,excluir:elegidos,limite:60});
  const lista=useRef<HTMLDivElement>(null),entrada=useRef<HTMLInputElement>(null);
  const indice=Math.min(activo,Math.max(0,opciones.length-1)),limite=elegidos.length>=3;
  useEffect(()=>{lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});},[indice,grupo,consulta,abierto]);
  function elegir(tema:string){if(limite)return;alCambiar([...elegidos,tema],"");entrada.current?.focus();setAbierto(false);setActivo(0);}
  return <div className={styles.selector}>
    <p className={styles.intro}>Primero formulá tu hipótesis; después comprobala en el tablero. Podés elegir hasta tres ideas de toda la variante.</p>
    <div className={styles.elegidos} aria-label="Tus temas elegidos">{elegidos.map(t=><button type="button" key={t} aria-label={`Quitar ${obtenerTema(t)?.nombre}`} onClick={()=>alCambiar(elegidos.filter(x=>x!==t),consulta)}>{obtenerTema(t)?.nombre}<span aria-hidden="true">×</span></button>)}</div>
    <label htmlFor={`buscar-temas-${id}`}>¿Qué motivo reconocés?</label>
    <input ref={entrada} id={`buscar-temas-${id}`} role="combobox" aria-autocomplete="list" aria-expanded={abierto} aria-controls={`lista-temas-${id}`} aria-activedescendant={abierto&&opciones[indice]?`opcion-${id}-${opciones[indice].id}`:undefined} autoComplete="off" value={consulta} placeholder="Horquilla, despeje, rayos X…" onFocus={()=>{if(!limite)setAbierto(true);}} onBlur={()=>setAbierto(false)} onChange={e=>{alCambiar(elegidos,e.target.value);setGrupo(undefined);setActivo(0);setAbierto(true);}} onKeyDown={e=>{
      if(e.key==="Escape")setAbierto(false);
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();setAbierto(true);setActivo(Math.max(0,Math.min(opciones.length-1,indice+(e.key==="ArrowDown"?1:-1))));}
      if(e.key==="Enter"&&abierto&&opciones[indice]){e.preventDefault();elegir(opciones[indice].id);}
    }}/>
    <button type="button" className={styles.explorar} aria-expanded={abierto} onMouseDown={e=>e.preventDefault()} onClick={()=>{setAbierto(!abierto);setActivo(0);}}> {abierto?"Cerrar catálogo":`Explorar los ${TEMAS_TACTICOS.length} temas`} <span aria-hidden="true">{abierto?"−":"+"}</span></button>
    {abierto&&<div className={styles.catalogo}>
      <div className={styles.grupos} role="group" aria-label="Familias de temas"><button type="button" aria-pressed={!grupo} onMouseDown={e=>e.preventDefault()} onClick={()=>{setGrupo(undefined);setActivo(0);}}>Todos</button>{GRUPOS_TACTICOS.map(g=><button type="button" key={g.id} aria-pressed={grupo===g.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setGrupo(g.id);setActivo(0);}}>{g.nombre}</button>)}</div>
      <div className={styles.opciones} ref={lista} role="listbox" aria-label="Temas tácticos" id={`lista-temas-${id}`}>
        {opciones.map((t,i)=><button type="button" role="option" aria-selected={i===indice} aria-disabled={limite} id={`opcion-${id}-${t.id}`} key={t.id} onMouseDown={e=>e.preventDefault()} onClick={()=>elegir(t.id)}><strong>{t.nombre}</strong><span>{t.definicion}</span></button>)}
        {!opciones.length&&<p>No hay coincidencias{grupo?" en esta familia":""}. Probá otra palabra o elegí «Todos».</p>}
      </div>
    </div>}
    <small>{limite?"Ya elegiste tres. Quitá una si querés cambiarla.":"Buscá por nombre o sinónimos. Las definiciones te ayudan a distinguir ideas parecidas."}</small>
    <button type="button" className="button-primary" disabled={!elegidos.length} onClick={alContinuar}>Guardar mi hipótesis y resolver</button>
    <small>Revisamos tus etiquetas al terminar. El nivel se ajusta por tus jugadas, no por el nombre que elijas.</small>
  </div>;
}

export function RevisionTemasTacticos({elegidos,esperados}:{elegidos:string[];esperados:string[]}) {
  const revision=revisarTemas(elegidos,esperados),confirmadas=revision.filter(t=>t.estado==="confirmada").length;
  const etiquetas={confirmada:"Coincide",general:"Idea general",relacionada:"Relacionada",sinConfirmar:"Para revisar"};
  return <section className={styles.revision} aria-label="Revisión de tus temas">
    <h4>Lo que viste y lo que muestra la variante</h4>
    {!!revision.length&&<><p>{confirmadas} de {revision.length} etiquetas coinciden con la clasificación. Revisá cada una por separado.</p><ul>{revision.map(({tema,estado,referencia})=><li key={tema.id} data-estado={estado}><div><strong>{tema.nombre}</strong><span>{etiquetas[estado]}</span></div><p>{estado==="general"?`Es una descripción válida pero amplia. Podés precisar: ${referencia?.nombre}.`:estado==="relacionada"?"Puede intervenir en una desviación, pero sobrecarga y desviación describen cosas distintas.":estado==="sinConfirmar"?"No figura entre los motivos de esta variante. Compará la definición con las jugadas; la clasificación no abarca todas las interpretaciones.":tema.definicion}</p>{estado!=="confirmada"&&<small>{tema.definicion}</small>}</li>)}</ul></>}
    <details open><summary>Motivos de la solución</summary><dl>{esperados.map(obtenerTema).filter(t=>!!t).map(t=><div key={t.id}><dt>{t.nombre}</dt><dd>{t.definicion}</dd></div>)}</dl></details>
    <small>Los motivos pueden aparecer en distintos momentos de la secuencia. «Ataque de mate» describe el objetivo; «mate del pasillo» precisa el patrón. No hace falta nombrarlos todos.</small>
  </section>;
}
