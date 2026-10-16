import { leerRepertorio, combinarRepertorios, type RepertorioAperturas } from "./entrenamientoAperturas";
import { Chess } from "chess.js";
import { fechaMontevideo } from "./desafios";
import { normalizarPractica, practicaValida, registrarPractica, type PracticaError } from "./entrenamientoPersonal";
import type { AnalisisPosicion } from "./stockfish";
import { TEMAS_TACTICOS } from "./temasTacticos";
import bancoLichess from "../data/entrenamiento-lichess.json";
import bancoDecisiones from "../data/entrenamiento-decisiones.json";

export type ActividadGuiada = "tactica" | "candidatas" | "evaluacion";
export type RutaGuiada = "base" | "club" | "competencia";
export { TEMAS_TACTICOS, sugerirTemas } from "./temasTacticos";
export type EjercicioGuiado = { id: string; actividad: ActividadGuiada; titulo: string; fen: string; temas: string[]; solucion: string[]; explicacion: string; pista: string; orden: number; tolerancia?: number; rating?: number; fuente?: "lichess"|"partida"; origen?:string; referencia?:AnalisisPosicion };
const posicionInicial = new Chess().fen();
export const BANCO_ENTRENAMIENTO: EjercicioGuiado[] = [
  { id: "t-01", actividad: "tactica", titulo: "Primer vistazo", fen: "6k1/8/8/3q4/8/8/8/3R2K1 w - - 0 1", temas: ["hangingPiece"], solucion: ["d1d5"], orden: 1, explicacion: "La dama de d5 no está defendida. Antes de calcular una variante larga, revisá qué piezas podés capturar sin regalar la tuya.", pista: "Mirá la columna de tu torre y las piezas que no tienen defensa." },
  { id: "t-02", actividad: "tactica", titulo: "El rey y su salida", fen: "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1", temas: ["mateIn1", "backRankMate"], solucion: ["b1b8"], orden: 2, explicacion: "Tb8 es mate. Los peones del enroque bloquean las salidas del rey: un jaque en la última fila decide la partida.", pista: "¿Puede tu torre dar jaque en una fila sin salidas para el rey?" },
  { id: "t-03", actividad: "tactica", titulo: "Mirarlo del otro lado", fen: "6k1/8/8/8/3Q4/8/6K1/3r4 b - - 0 1", temas: ["hangingPiece"], solucion: ["d1d4"], orden: 3, explicacion: "Las negras capturan la dama indefensa de d4 con la torre. El mismo hábito sirve con cualquier color.", pista: "Buscá primero una captura de una pieza indefensa." },
  { id: "t-04", actividad: "tactica", titulo: "Una amenaza, dos objetivos", fen: "r3k3/8/8/3N4/8/8/8/6K1 w - - 0 1", temas: ["fork"], solucion: ["d5c7"], orden: 4, explicacion: "Cc7+ ataca al rey de e8 y a la torre de a8. El jaque obliga a responder y permite capturar la torre después.", pista: "Un caballo puede atacar al rey y a una torre en la misma jugada." },
  { id: "t-05", actividad: "tactica", titulo: "Un paso importante", fen: "8/P6k/8/8/8/8/8/6K1 w - - 0 1", temas: ["promotion"], solucion: ["a7a8q"], orden: 5, explicacion: "El peón llega a la última fila y se convierte en dama. Promocionar aumenta tu ventaja; siempre elegí la pieza que necesitás.", pista: "¿Qué pasa si el peón avanza una casilla más?" },
  { id: "t-06", actividad: "tactica", titulo: "Cerrar las salidas", fen: "1r4k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", temas: ["mateIn1", "backRankMate"], solucion: ["b8b1"], orden: 6, explicacion: "Tb1 es mate: el rey blanco no puede cruzar su barrera de peones ni escapar del jaque de la torre.", pista: "Revisá los jaques de torre en la primera fila." },
  { id: "c-01", actividad: "candidatas", titulo: "Elegir cómo empezar", fen: posicionInicial, temas: [], solucion: [], orden: 1, explicacion: "En la posición inicial hay varias jugadas sanas. Compará cómo ocupan el centro, qué pieza preparan y cómo puede responder el rival. Una diferencia mínima del motor no vuelve mala a otra jugada razonable.", pista: "Podés comparar dos avances centrales, por ejemplo e4 y d4, y una respuesta legal a cada uno." },
  { id: "c-02", actividad: "candidatas", titulo: "Desarrollar con intención", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", temas: [], solucion: [], orden: 2, explicacion: "Compará desarrollo y control del centro. Antes de elegir, incluí una respuesta del rival y explicá qué sigue para tus piezas.", pista: "Cf3 desarrolla y ataca e5. Otra candidata legal puede preparar el desarrollo del alfil o reforzar el centro." },
  { id: "c-03", actividad: "candidatas", titulo: "Responder al centro", fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", temas: [], solucion: [], orden: 3, explicacion: "En esta posición de la Petrov, el peón de e4 está atacado. Compará capturar, defender o desarrollar; la respuesta rival forma parte de tu decisión.", pista: "Revisá Cxe5 y d4, pero no olvides mirar la respuesta de las negras." },
  { id: "e-01", actividad: "evaluacion", titulo: "Un punto de partida", fen: posicionInicial, temas: [], solucion: [], orden: 1, tolerancia: .75, explicacion: "La posición inicial está cerca del equilibrio. La pequeña iniciativa de las blancas no equivale a ganar un peón: la evaluación incluye actividad, estructura y seguridad.", pista: "El material es igual y todas las piezas están por desarrollar: pensá en una valoración cercana al equilibrio." },
  { id: "e-02", actividad: "evaluacion", titulo: "Material y actividad", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", temas: [], solucion: [], orden: 2, tolerancia: .75, explicacion: "El material está igualado y ambos lados tienen desarrollo. La iniciativa y los planes importan, pero una posición así suele tener una valoración cercana al equilibrio.", pista: "Compará el material, el centro y el desarrollo antes de poner un número." },
  { id: "e-03", actividad: "evaluacion", titulo: "El valor de una pieza activa", fen: "5rk1/1pp3pp/8/3b4/8/8/1PP3PP/5RK1 w - - 0 1", temas: [], solucion: [], orden: 3, tolerancia: 1, explicacion: "Las negras tienen un alfil de más y bien ubicado. Las blancas deben defender sus peones y su rey. La referencia incluye material y actividad: un alfil extra no se traduce siempre en exactamente tres peones de valoración.", pista: "Contá las piezas y compará su actividad. El alfil negro también presiona el enroque." },
];
BANCO_ENTRENAMIENTO.push(...bancoLichess.map((e, i): EjercicioGuiado => ({...e, actividad:"tactica", titulo:"Encontrá la continuación", fuente:"lichess", orden:100+i, explicacion:"La idea funciona con la respuesta del rival incluida. Volvé a recorrer la variante y fijate qué pieza, casilla o amenaza hace posible cada paso.", pista:"Revisá jaques, capturas y amenazas. Calculá también la respuesta más resistente del rival."})));
BANCO_ENTRENAMIENTO.push(...bancoDecisiones.map((e,i):EjercicioGuiado=>({...e,actividad:e.actividad as ActividadGuiada,fuente:"partida",orden:1000+i})));
export function ejercicioGuiado(id: string) { return BANCO_ENTRENAMIENTO.find(e => e.id === id); }

export type RazonamientoGuiado = {
  etapa: "preparar" | "resolver" | "terminada"; temas: string[]; consultaTema: string;
  candidata1: string; candidata2: string; respuesta1: string; respuesta2: string; conclusion: string;
  debilidad: string; peorPieza: string; ideaRival: string; valoracion: string; colorVentaja: "w" | "b" | "=";
  movimientos: string[]; resuelto: boolean; revelado: boolean; ayudado: boolean; mensaje: string;
  eleccion?:"1"|"2"|"";
};
export function razonamientoInicial(): RazonamientoGuiado { return { etapa: "preparar", temas: [], consultaTema: "", candidata1: "", candidata2: "", respuesta1: "", respuesta2: "", conclusion: "", debilidad: "", peorPieza: "", ideaRival: "", valoracion: "", colorVentaja: "=", movimientos: [], resuelto: false, revelado: false, ayudado: false, mensaje: "" }; }
export type PrimerResultado = {fecha:string;acierto:boolean};
export type NivelInicial = {elo:number;jugadorId:string|null;fecha:string};
export type AvanceGuiado = { practica?: PracticaError; actualizada?: string; nota?: string; notaActualizada?: string; razonamiento?: RazonamientoGuiado; razonamientoActualizada?: string; primerResultado?:PrimerResultado };
export type SesionGuiada = { id: string; dia: string; ruta: RutaGuiada; items: string[]; indice: number; terminada: boolean; actualizada: string };
export type ProgresoGuiado = { version: 1; ruta: RutaGuiada; rutaActualizada: string; actividad: ActividadGuiada; actividadActualizada: string; ejercicios: Record<string, AvanceGuiado>; sesionEnCurso: SesionGuiada | null; sesionActualizada: string; nivelInicial?:NivelInicial; aperturas?:RepertorioAperturas };
export const FECHA_INICIAL_GUIADO = "1970-01-01T00:00:00.000Z";
export function progresoGuiadoInicial(): ProgresoGuiado { return { version: 1, ruta: "base", rutaActualizada: FECHA_INICIAL_GUIADO, actividad: "tactica", actividadActualizada: FECHA_INICIAL_GUIADO, ejercicios: {}, sesionEnCurso: null, sesionActualizada: FECHA_INICIAL_GUIADO }; }
const isoValida = (s: unknown): s is string => typeof s === "string" && s.length <= 30 && Number.isFinite(Date.parse(s)) && /^\d{4}-\d\d-\d\dT/.test(s);
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const rutaValida = (v: unknown): v is RutaGuiada => v === "base" || v === "club" || v === "competencia";
const actividadValida = (v: unknown): v is ActividadGuiada => v === "tactica" || v === "candidatas" || v === "evaluacion";
function razonamientoValido(v: unknown, ejercicio: EjercicioGuiado): v is RazonamientoGuiado {
  if (!esObjeto(v) || !["preparar", "resolver", "terminada"].includes(String(v.etapa)) || !["w", "b", "="].includes(String(v.colorVentaja))) return false;
  for (const k of ["consultaTema", "candidata1", "candidata2", "respuesta1", "respuesta2", "conclusion", "debilidad", "peorPieza", "ideaRival", "valoracion", "mensaje"]) if (typeof v[k] !== "string" || (v[k] as string).length > 1000) return false;
  for (const k of ["resuelto", "revelado", "ayudado"]) if (typeof v[k] !== "boolean") return false;
  if(v.eleccion!==undefined&&!["","1","2"].includes(String(v.eleccion)))return false;
  if (!Array.isArray(v.temas) || v.temas.length > 4 || v.temas.some(t => !TEMAS_TACTICOS.some(a => a.id === t))) return false;
  if (!Array.isArray(v.movimientos) || v.movimientos.length > Math.max(1,ejercicio.solucion.length) || v.movimientos.some(m => typeof m !== "string")) return false;
  try { const c = new Chess(ejercicio.fen); for (const m of v.movimientos) c.move(String(m)); } catch { return false; }
  return true;
}
export function leerProgresoGuiado(texto: string): ProgresoGuiado {
  const inicial = progresoGuiadoInicial();
  if (texto.length > 1400000) return inicial;
  try {
    const v: unknown = JSON.parse(texto); if (!esObjeto(v) || v.version !== 1) return inicial;
    if(v.aperturas)inicial.aperturas=leerRepertorio(v.aperturas);
    const n=v.nivelInicial;
    if(esObjeto(n)&&Number.isInteger(n.elo)&&Number(n.elo)>=800&&Number(n.elo)<=2700&&(n.jugadorId===null||(typeof n.jugadorId==="string"&&n.jugadorId.length<=100))&&isoValida(n.fecha))inicial.nivelInicial=n as NivelInicial;
    if (rutaValida(v.ruta) && isoValida(v.rutaActualizada)) { inicial.ruta = v.ruta; inicial.rutaActualizada = v.rutaActualizada; }
    if (actividadValida(v.actividad) && isoValida(v.actividadActualizada)) { inicial.actividad = v.actividad; inicial.actividadActualizada = v.actividadActualizada; }
    if (esObjeto(v.ejercicios)) for (const e of BANCO_ENTRENAMIENTO) {
      const a = v.ejercicios[e.id]; if (!esObjeto(a)) continue;
      const entrada: AvanceGuiado = {};
      if(esObjeto(a.primerResultado)&&isoValida(a.primerResultado.fecha)&&typeof a.primerResultado.acierto==="boolean")entrada.primerResultado=a.primerResultado as PrimerResultado;
      if (practicaValida(a.practica) && isoValida(a.actualizada)) { entrada.practica = normalizarPractica(a.practica); entrada.actualizada = a.actualizada; }
      if (typeof a.nota === "string" && a.nota.length <= 800 && isoValida(a.notaActualizada)) { entrada.nota = a.nota; entrada.notaActualizada = a.notaActualizada; }
      if (razonamientoValido(a.razonamiento, e) && isoValida(a.razonamientoActualizada)) { entrada.razonamiento = a.razonamiento; entrada.razonamientoActualizada = a.razonamientoActualizada; }
      inicial.ejercicios[e.id] = entrada;
    }
    const s = v.sesionEnCurso;
    if (isoValida(v.sesionActualizada)) {
      if (s === null) inicial.sesionActualizada = v.sesionActualizada;
      else if (esObjeto(s) && typeof s.id === "string" && s.id.length <= 100 && typeof s.dia === "string" && /^\d{4}-\d\d-\d\d$/.test(s.dia) && rutaValida(s.ruta) && Array.isArray(s.items) && s.items.length > 0 && s.items.length <= 7 && s.items.every(id => typeof id === "string" && !!ejercicioGuiado(id)) && new Set(s.items).size === s.items.length && Number.isInteger(s.indice) && Number(s.indice) >= 0 && Number(s.indice) < s.items.length && typeof s.terminada === "boolean" && isoValida(s.actualizada)) {
        inicial.sesionEnCurso = s as SesionGuiada; inicial.sesionActualizada = v.sesionActualizada;
      }
    }
    return inicial;
  } catch { return inicial; }
}
function masReciente<T>(a: T, at: string | undefined, b: T, bt: string | undefined): T {
  if ((bt ?? "") > (at ?? "")) return b;
  if ((bt ?? "") < (at ?? "")) return a;
  return JSON.stringify(b) > JSON.stringify(a) ? b : a;
}
export function combinarProgresoGuiado(a: ProgresoGuiado, b: ProgresoGuiado): ProgresoGuiado {
  const pa = leerProgresoGuiado(JSON.stringify(a)), pb = leerProgresoGuiado(JSON.stringify(b)), resultado = progresoGuiadoInicial();
  for (const id of new Set([...Object.keys(pa.ejercicios), ...Object.keys(pb.ejercicios)])) {
    const x = pa.ejercicios[id] ?? {}, y = pb.ejercicios[id] ?? {}, z: AvanceGuiado = {};
    const primeros=[x.primerResultado,y.primerResultado].filter((v):v is PrimerResultado=>!!v).sort((a,b)=>a.fecha.localeCompare(b.fecha)||Number(a.acierto)-Number(b.acierto));
    if(primeros.length)z.primerResultado=primeros[0];
    for (const [campo, reloj] of [["practica", "actualizada"], ["nota", "notaActualizada"], ["razonamiento", "razonamientoActualizada"]] as const) {
      const fuente = masReciente(x, x[reloj], y, y[reloj]);
      if (fuente[campo] !== undefined) Object.assign(z, { [campo]: fuente[campo], [reloj]: fuente[reloj] });
    }
    if (z.practica) {
      z.practica = { ...z.practica, aciertos: Math.max(x.practica?.aciertos ?? 0, y.practica?.aciertos ?? 0), fallos: Math.max(x.practica?.fallos ?? 0, y.practica?.fallos ?? 0) };
      const ayuda = [x.practica, y.practica].find(p => p?.diaAyuda && p.diaAyuda === z.practica?.ultimoDia);
      if (ayuda) z.practica = { ...z.practica, etapa: 0, ayudado: true, diaAyuda: ayuda.diaAyuda, proxima: ayuda.proxima };
    }
    resultado.ejercicios[id] = z;
  }
  const ruta = masReciente(pa, pa.rutaActualizada, pb, pb.rutaActualizada), actividad = masReciente(pa, pa.actividadActualizada, pb, pb.actividadActualizada), sesion = masReciente(pa, pa.sesionActualizada, pb, pb.sesionActualizada);
  const iniciales=[pa.nivelInicial,pb.nivelInicial].filter((v):v is NivelInicial=>!!v).sort((a,b)=>a.fecha.localeCompare(b.fecha)||JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(iniciales.length)resultado.nivelInicial=iniciales[0];
  if(pa.aperturas||pb.aperturas)resultado.aperturas=combinarRepertorios(pa.aperturas,pb.aperturas);
  return { ...resultado, ruta: ruta.ruta, rutaActualizada: ruta.rutaActualizada, actividad: actividad.actividad, actividadActualizada: actividad.actividadActualizada, sesionEnCurso: sesion.sesionEnCurso, sesionActualizada: sesion.sesionActualizada };
}
export function prepararSesionGuiada(p: ProgresoGuiado, ahora = new Date()): ProgresoGuiado {
  const dia = fechaMontevideo(ahora), reloj = ahora.toISOString();
  const demostracion=p.nivelInicial&&p.sesionEnCurso?.items.every(id=>!ejercicioGuiado(id)?.fuente);
  // Resume only unfinished work. A completed session must not lock the user
  // out for the rest of the day; scheduling below still protects future reviews.
  if (p.sesionEnCurso && !demostracion && !p.sesionEnCurso.terminada) return p;
  const banco = BANCO_ENTRENAMIENTO.filter(e => e.actividad === p.actividad);
  const repasos = banco.filter(e => { const practica = p.ejercicios[e.id]?.practica; return (!p.nivelInicial||!!e.fuente)&&!!practica?.proxima && practica.proxima <= dia; }).sort((a, b) => (p.ejercicios[a.id]?.practica?.proxima ?? "").localeCompare(p.ejercicios[b.id]?.practica?.proxima ?? ""));
  const nivel=nivelEntrenamiento(p);
  const nuevos = banco.filter(e => !p.ejercicios[e.id]?.practica && (p.nivelInicial ? !!e.fuente : !e.fuente)).sort((a, b) => p.nivelInicial ? Math.abs((a.rating??nivel)-nivel)-Math.abs((b.rating??nivel)-nivel)||a.orden-b.orden : a.orden-b.orden);
  const items = [...repasos.slice(0, 5), ...nuevos.slice(0, 2)].map(e => e.id);
  if (!items.length) return { ...p, sesionEnCurso: null, sesionActualizada: reloj };
  const ejercicios = { ...p.ejercicios };
  for (const id of items) ejercicios[id] = { ...ejercicios[id], razonamiento: razonamientoInicial(), razonamientoActualizada: reloj };
  return { ...p, ejercicios, sesionActualizada: reloj, sesionEnCurso: { id: `${dia}-${p.actividad}-${reloj}`, dia, ruta: p.ruta, items, indice: 0, terminada: false, actualizada: reloj } };
}
export function registrarResultadoGuiado(p: ProgresoGuiado, id: string, acertado: boolean, ayudado: boolean, ahora = new Date()): ProgresoGuiado {
  if (!ejercicioGuiado(id)) return p;
  const e = p.ejercicios[id] ?? {}, practica = registrarPractica(e.practica, acertado, ayudado, ahora);
  const primerResultado=e.primerResultado??(ejercicioGuiado(id)?.rating?{fecha:ahora.toISOString(),acierto:acertado&&!ayudado}:undefined);
  return { ...p, ejercicios: { ...p.ejercicios, [id]: { ...e, practica, primerResultado, actualizada: practica.actualizada ?? ahora.toISOString() } } };
}
export function iniciarNivel(p:ProgresoGuiado,elo:number|null,jugadorId:string|null,ahora=new Date()):ProgresoGuiado{
  if(p.nivelInicial)return p;
  const nivelInicial={elo:Math.max(800,Math.min(2700,Math.round(elo??1400))),jugadorId,fecha:ahora.toISOString()};
  // Los ejercicios de demostración siguen guardados, pero no obligan a completar una sesión demasiado básica.
  const antigua=p.sesionEnCurso?.items.every(id=>id.startsWith("t-"));
  return {...p,nivelInicial,...(antigua?{sesionEnCurso:null,sesionActualizada:ahora.toISOString()}:{})};
}
export function nivelEntrenamiento(p:ProgresoGuiado,actividad:ActividadGuiada=p.actividad):number{
  let elo=p.nivelInicial?.elo??1400,numero=0;
  const resultados=Object.entries(p.ejercicios).filter(([id,a])=>{const e=ejercicioGuiado(id);return e?.actividad===actividad&&e.rating&&a.primerResultado;}).sort(([ia,a],[ib,b])=>a.primerResultado!.fecha.localeCompare(b.primerResultado!.fecha)||ia.localeCompare(ib));
  for(const [id,a] of resultados){const rating=ejercicioGuiado(id)!.rating!;const esperado=1/(1+10**((rating-elo)/400));elo+= (numero++<10?32:16)*((a.primerResultado!.acierto?1:0)-esperado);elo=Math.max(800,Math.min(2700,elo));}
  return Math.round(elo);
}
export function nivelTactico(p:ProgresoGuiado){return nivelEntrenamiento(p,"tactica");}
export function toleranciaNivel(nivel:number,actividad:ActividadGuiada){return actividad==="evaluacion"?(nivel<1400?1:nivel<1800?.8:.6):(nivel<1400?100:nivel<1800?70:45);}
export function puntuarCandidatas(analisis:AnalisisPosicion,ramas:[AnalisisPosicion,AnalisisPosicion],respuestas:[AnalisisPosicion,AnalisisPosicion],color:"w"|"b",eleccion:"1"|"2",nivel:number){
  const valor=(a:AnalisisPosicion)=>a.mateEn!==null?Math.sign(a.mateEn)*(100000-Math.abs(a.mateEn)*100):a.evaluacionCentipawns;
  const inicial=valor(analisis),valores=ramas.map(valor),defensas=respuestas.map(valor);
  if(inicial===null||valores.some(v=>v===null)||defensas.some(v=>v===null))return {error:"No hay un análisis completo para comparar. Este intento no cuenta como error."};
  const signo=color==="w"?1:-1,margen=toleranciaNivel(nivel,"candidatas"),indice=eleccion==="1"?0:1;
  const perdidas=valores.map(v=>Math.max(0,(inicial-v!)*signo));
  const perdidasDefensa=defensas.map((v,i)=>Math.max(0,(v!-valores[i]!)*signo));
  const acierto=perdidas[indice]<=margen&&perdidas.every(p=>p<=450)&&perdidasDefensa.every(p=>p<=Math.max(80,margen*1.5));
  return {acierto,perdidas,perdidasDefensa,margen};
}
export function pasoTactico(e:EjercicioGuiado,movimientos:string[],uci:string){
  const c=new Chess(e.fen);for(const san of movimientos)c.move(san);
  const m=c.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
  if(uci!==e.solucion[movimientos.length]&&!c.isCheckmate())return {acierto:false,movimientos,terminada:false};
  const siguientes=[...movimientos,m.san];
  if(!c.isCheckmate()&&siguientes.length<e.solucion.length){const rival=e.solucion[siguientes.length];siguientes.push(c.move({from:rival.slice(0,2),to:rival.slice(2,4),promotion:rival[4]}).san);}
  return {acierto:true,movimientos:siguientes,terminada:c.isCheckmate()||siguientes.length>=e.solucion.length};
}
export function recomendacionGuiada(p: ProgresoGuiado) {
  const resultados = (actividad: ActividadGuiada) => BANCO_ENTRENAMIENTO.filter(e => e.actividad === actividad).map(e => p.ejercicios[e.id]?.practica).filter((x): x is PracticaError => !!x);
  const tactica = resultados("tactica"), calculo = resultados("candidatas"), evaluacion = resultados("evaluacion");
  if (!tactica.length) return { actividad: "tactica" as const, razon: p.nivelInicial?`Los problemas nuevos se eligen cerca de tu nivel táctico: ${nivelTactico(p)}. Calculá la continuación completa.`:"Tu Elo del club será el punto de partida; después ajustamos la dificultad con tus respuestas." };
  if (tactica.some(p => (p.etapa ?? 0) === 0)) return { actividad: "tactica" as const, razon: "Hay motivos tácticos que necesitaste repetir o resolver con ayuda. Conviene volver a reconocerlos." };
  if (!calculo.length || calculo.some(p => (p.etapa ?? 0) === 0)) return { actividad: "candidatas" as const, razon: "Ya probaste patrones simples. Ahora compará dos jugadas y la respuesta del rival antes de mover." };
  if (!evaluacion.length || evaluacion.some(p => (p.etapa ?? 0) === 0)) return { actividad: "evaluacion" as const, razon: "Practicá cómo valorar la posición antes de elegir un plan." };
  return { actividad: p.actividad, razon: "Tu siguiente paso es volver a los repasos pendientes y revisar una decisión de tus propias partidas." };
}
export function interpretarJugada(fen: string, entrada: string): { uci: string; san: string; fen: string } | null {
  const limpia = entrada.trim().replace(/^\d+\.(?:\.\.)?\s*/, "").replace(/0/g, "O");
  if (!limpia || limpia.length > 20) return null;
  const espanol: Record<string, string> = { C: "N", A: "B", T: "R", D: "Q", R: "K" };
  const alternativas = [limpia, limpia.replace(/^[CATDR]/, letra => espanol[letra]).replace(/=([CATDR])/, (_, letra: string) => `=${espanol[letra]}`)];
  // Una R ambigua se interpreta primero como rey (notación española usada en el sitio).
  if (limpia.startsWith("R")) alternativas.reverse();
  for (const candidata of alternativas) try {
    const c = new Chess(fen), m = c.move(/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(candidata) ? { from: candidata.slice(0, 2), to: candidata.slice(2, 4), promotion: candidata[4] } : candidata);
    return { uci: m.from + m.to + (m.promotion ?? ""), san: m.san, fen: c.fen() };
  } catch { /* Probar la otra notación. */ }
  return null;
}
export function validarCandidatas(fen: string, a: string, b: string, ra: string, rb: string) {
  const primera = interpretarJugada(fen, a), segunda = interpretarJugada(fen, b);
  if (!primera || !segunda) return { error: "Escribí dos jugadas legales. Podés usar Cf3 o g1f3; no hace falta incluir el jaque." };
  if (primera.uci === segunda.uci) return { error: "Elegí dos candidatas diferentes para poder compararlas." };
  const respuesta1 = interpretarJugada(primera.fen, ra), respuesta2 = interpretarJugada(segunda.fen, rb);
  if (!respuesta1 || !respuesta2) return { error: "Anotá una respuesta legal del rival para cada candidata." };
  return { primera, segunda, respuesta1, respuesta2 };
}
export function puntuarEvaluacion(entrada: string, color: "w" | "b" | "=", referencia: AnalisisPosicion, tolerancia = .75) {
  const numero = Number(entrada.trim().replace(",", "."));
  if (!entrada.trim() || !Number.isFinite(numero) || numero < 0 || numero > 20 || (color === "=" && numero !== 0)) return { error: "Indicá de 0 a 20 peones de ventaja. Si elegís equilibrio, escribí 0." };
  if (referencia.mateEn !== null || referencia.evaluacionCentipawns === null || !Number.isFinite(referencia.evaluacionCentipawns)) return { error: "Esta posición no tiene una referencia numérica estable. No cuenta como fallo." };
  const estimada = color === "b" ? -numero : numero, real = referencia.evaluacionCentipawns / 100;
  return { acertado: Math.abs(estimada - real) <= tolerancia, estimada, real, diferencia: Math.abs(estimada - real) };
}
