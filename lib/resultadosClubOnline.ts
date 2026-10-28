export type ResultadoClubOnline={id:string;blancasId:string;negrasId:string;resultado:'1-0'|'0-1'|'1/2-1/2';fecha:string;dia:string;torneo:string};
export type FilaResultadoClubOnline={id:string;blancas_id:string;negras_id:string;resultado:ResultadoClubOnline['resultado'];created_at:string;dia:string;torneo:string};
export function resultadoClubDesdeFila(f:FilaResultadoClubOnline):ResultadoClubOnline{return {id:f.id,blancasId:f.blancas_id,negrasId:f.negras_id,resultado:f.resultado,fecha:f.created_at,dia:f.dia,torneo:f.torneo};}
