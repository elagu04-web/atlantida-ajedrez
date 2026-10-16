"use client";
import { useState } from "react";
import type { ResumenTemas } from "@/lib/entrenamientoTemas";
import styles from "./GraficaFortalezas.module.css";

export function GraficaFortalezas({familias}:{familias:ResumenTemas["familias"]}){
  const [aspecto,setAspecto]=useState<"calculo"|"reconocer">("calculo");
  return <section className={styles.grafica} aria-label="Gráfica de fortalezas y debilidades">
    <div className={styles.cabecera}><h4>Tu mapa de fortalezas</h4><div role="group" aria-label="Habilidad de la gráfica"><button type="button" aria-pressed={aspecto==="calculo"} onClick={()=>setAspecto("calculo")}>Calcular</button><button type="button" aria-pressed={aspecto==="reconocer"} onClick={()=>setAspecto("reconocer")}>Reconocer</button></div></div>
    <p>{aspecto==="calculo"?"Posiciones resueltas sin errores ni ayuda.":"Hipótesis que coinciden con la clasificación, incluyendo ideas generales válidas. Solo contamos respuestas sin pistas."}</p>
    <div className={styles.eje} aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
    <div className={styles.filas}>{familias.map(f=>{
      const total=aspecto==="calculo"?f.posiciones:f.reconocimientos,aciertos=aspecto==="calculo"?f.sinAyuda:f.hipotesisConfirmadas;
      const porcentaje=total?Math.round(aciertos/total*100):null;
      const estado=!total?"sinDatos":total<3?"inicial":porcentaje!>=75?"fuerte":porcentaje!<50?"reforzar":"progreso";
      const texto=estado==="sinDatos"?"Sin datos todavía":estado==="inicial"?"Primeras señales":estado==="fuerte"?"Buen dominio":estado==="reforzar"?"Para reforzar":"En progreso";
      return <div key={f.id} className={styles.fila} data-estado={estado}><div className={styles.nombre}><strong>{f.nombre}</strong><small>{texto}</small></div><div className={styles.resultado}>{porcentaje===null?<span className={styles.sinDatos}>Todavía no hay respuestas para comparar</span>:<><div className={styles.barra} role="meter" aria-label={f.nombre} aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-valuetext={`${aciertos} de ${total} posiciones, ${porcentaje}%, ${texto}`}><span style={{width:`${porcentaje}%`}}/></div><div className={styles.dato}><span>{aciertos}/{total} posiciones</span><strong>{porcentaje}%</strong></div></>}</div></div>;
    })}</div>
    <small className={styles.nota}>Cada familia usa hasta 12 posiciones recientes y distintas. Con menos de 3, el resultado es provisional. Una posición puede trabajar más de una familia.</small>
  </section>;
}
