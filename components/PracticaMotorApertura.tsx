"use client";
import {useEffect,useRef,useState} from "react";
import {Chess} from "chess.js";
import {MotorEntrenamiento} from "@/lib/motorEntrenamiento";
import {moverUci,uciApertura} from "@/lib/entrenamientoAperturas";
import {valorarIntentoApertura} from "@/lib/aperturasPartidas";
import {ayudaEnDia,type PracticaError} from "@/lib/entrenamientoPersonal";
import {sanPractica} from "@/lib/partidaPractica";
import {TableroApertura} from "./TableroApertura";
import styles from "./TallerAperturas.module.css";

export function PracticaMotorApertura({fen,color,practica,alIntentar}:{fen:string;color:'w'|'b';practica?:PracticaError;alIntentar:(acierto:boolean,ayuda:boolean)=>void}){
 const [ruta,setRuta]=useState<string[]>([]),[ocupado,setOcupado]=useState(false),[fallo,setFallo]=useState(false),[pista,setPista]=useState(''),[mensaje,setMensaje]=useState('Encontrá una mejora. Después seguí jugando contra Stockfish.'),[juicio,setJuicio]=useState('');
 const motor=useRef<MotorEntrenamiento|null>(null),generacion=useRef(0),bloqueo=useRef(false),ayudado=useRef(false),registrado=useRef(false);
 const c=new Chess(fen);for(const u of ruta)moverUci(c,u);
 const propias=c.history({verbose:true}).filter(m=>m.color===color).length,fin=c.isGameOver()||propias>=6;
 useEffect(()=>()=>{generacion.current++;motor.current?.destruir();},[]);
 function reiniciar(){generacion.current++;motor.current?.destruir();motor.current=null;bloqueo.current=false;ayudado.current=false;registrado.current=false;setRuta([]);setOcupado(false);setFallo(false);setPista('');setJuicio('');setMensaje('Probá otra vez desde la posición de tu partida.');}
 async function mover(from:string,to:string,promotion?:string){
  if(bloqueo.current||fin||fallo||c.turn()!==color)return false;
  const inicial=new Chess(c.fen());let u:string;try{u=uciApertura(c.move({from,to,promotion}));}catch{return false;}
  const turno=++generacion.current,primera=ruta.length===0;bloqueo.current=true;setOcupado(true);setPista('');setRuta([...ruta,u]);setMensaje('Stockfish está comprobando tu jugada…');
  try{
   motor.current??=new MotorEntrenamiento();
   const antes=primera?await motor.current.evaluarPosicion(inicial.fen(),inicial.turn(),1200):null;
   const despues=await motor.current.evaluarPosicion(c.fen(),c.turn(),1200);
   if(generacion.current!==turno)return false;
   if(primera&&antes&&!registrado.current){const resultado=valorarIntentoApertura(antes,despues,color,u);registrado.current=true;alIntentar(resultado.acierto,ayudado.current||ayudaEnDia(practica));setJuicio(resultado.acierto?'Buena decisión: tu alternativa mantiene la evaluación.':`Hay una mejora: tu jugada cedió aproximadamente ${(resultado.perdida/100).toLocaleString('es-UY',{maximumFractionDigits:1})} peones.`);}
   if(c.isGameOver()){setMensaje(c.isCheckmate()?'Jaque mate. Podés volver a la posición y probar otra idea.':'La posición terminó en tablas.');return false;}
   if(!despues.mejorJugada)throw new Error('Sin respuesta del motor');
   const respuesta=moverUci(c,despues.mejorJugada);setRuta([...ruta,u,uciApertura(respuesta)]);
   setMensaje(c.isCheckmate()?'Jaque mate. Revisá qué amenaza quedó sin cubrir.':c.isGameOver()?'La posición terminó en tablas.':propias+1>=6?'Práctica completada: jugaste seis decisiones desde tu error. Podés volver a intentarlo.':`Stockfish respondió ${sanPractica(respuesta.san)}. Tu turno.`);
  }catch(e){if(generacion.current===turno&&(e as Error).name!=='AbortError'){motor.current?.destruir();motor.current=null;setFallo(true);setMensaje('El motor no pudo completar la respuesta. Volvé a la posición para reintentar; no sumamos un error por esta falla.');}}
  finally{if(generacion.current===turno){bloqueo.current=false;setOcupado(false);}}
  return false;
 }
 async function pedirPista(){if(bloqueo.current||fin||fallo)return;const turno=++generacion.current;bloqueo.current=true;setOcupado(true);try{motor.current??=new MotorEntrenamiento();const a=await motor.current.evaluarPosicion(c.fen(),c.turn(),1200);if(generacion.current!==turno)return;if(a.mejorJugada){const copia=new Chess(c.fen());setPista(`Compará tu idea con ${sanPractica(moverUci(copia,a.mejorJugada).san)}.`);ayudado.current=true;if(!registrado.current){registrado.current=true;alIntentar(false,true);}}}catch{if(generacion.current===turno){motor.current?.destruir();motor.current=null;setMensaje('No pudimos calcular la pista. Podés seguir jugando o reintentar.');}}finally{if(generacion.current===turno){bloqueo.current=false;setOcupado(false);}}}
 return <div className={styles.practicaMotor}><div className={styles.encabezado}><strong>Vos contra Stockfish</strong><span>{color==='w'?'Jugás con blancas':'Jugás con negras'} · {propias}/6 decisiones</span></div><TableroApertura chess={c} color={color} habilitado={!ocupado&&!fin&&!fallo&&c.turn()===color} mover={(f,t,p)=>{void mover(f,t,p);return false;}}/><p role="status" className={styles.feedback}>{ocupado?'Stockfish está calculando…':mensaje}</p>{juicio&&<p className={styles.juicio}>{juicio}</p>}{pista&&<p className={styles.juicio}>{pista}</p>}<div className={styles.acciones}><button type="button" className="button-secondary" disabled={ocupado||fin||fallo} onClick={()=>void pedirPista()}>Pedir una pista</button><button type="button" className="text-link" onClick={reiniciar}>Volver a la posición</button></div><p className={styles.aclaracion}>Se guarda tu primera decisión para el repaso. El motor acepta buenas alternativas; las siguientes jugadas sirven para practicar el plan. Stockfish juega a máxima fuerza.</p>{practica?.proxima&&<p className={styles.aclaracion}>Próximo repaso: {practica.proxima}.</p>}</div>;
}
