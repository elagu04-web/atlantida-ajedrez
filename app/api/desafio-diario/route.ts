import { unstable_cache } from "next/cache";
import { convertirPuzzle, fechaMontevideo, type PuzzleLichess } from "@/lib/desafios";
import reserva from "@/data/desafio-reserva.json";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Una selección por fecha local, compartida por todas las visitas y persistida en Vercel.
const buscar = unstable_cache(async (fecha:string) => {
  const respuesta=await fetch("https://lichess.org/api/puzzle/batch/mix?difficulty=harder&nb=5",{cache:"no-store",signal:AbortSignal.timeout(8000)});
  if (!respuesta.ok) throw new Error("Fuente de problemas temporalmente no disponible");
  const datos: {puzzles:PuzzleLichess[]}=await respuesta.json();
  const candidatos=[...(datos.puzzles??[])].sort((a,b)=>Math.abs(a.puzzle.rating-1800)-Math.abs(b.puzzle.rating-1800));
  for(const candidato of candidatos) {
    if(candidato.puzzle.id===reserva.id) continue;
    try { return convertirPuzzle(candidato,fecha); } catch { /* Ignorar una posición o dificultad no válida. */ }
  }
  throw new Error("No llegó un problema dentro del rango de dificultad");
},["desafio-diario-1800-v1"],{revalidate:86400});

export async function GET() {
  const fecha=fechaMontevideo();
  // La base fija un único problema para todos, conserva el archivo y permite registrar rachas.
  // Solo se usa la clave pública; el SQL controla las escrituras y la identidad de la cuenta.
  try {
    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await db.rpc("obtener_desafio_diario").abortSignal(AbortSignal.timeout(12000));
    if (!error && data?.datos && data.fecha===fecha) return Response.json({...convertirPuzzle(data.datos,data.fecha),registrable:true},{headers:{"Cache-Control":"private, no-cache"}});
  } catch { /* La práctica sigue disponible mientras se activa o recupera la base. */ }
  try { return Response.json(await buscar(fecha),{headers:{"Cache-Control":"private, no-cache"}}); }
  catch { return Response.json({...reserva,reserva:true},{headers:{"Cache-Control":"private, no-cache"}}); }
}
