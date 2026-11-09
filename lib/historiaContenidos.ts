import contenido from '@/data/historia-contenidos.json';

/** Árbol de texto y elementos permitidos; nunca HTML remoto ni atributos ejecutables. */
export type NodoHistoria=string|{tag:string;hijos?:NodoHistoria[];href?:string;src?:string;ancho?:number;alto?:number;alt?:string;colspan?:number;rowspan?:number};
export const contenidosHistoria=contenido as Record<string,NodoHistoria[]>;
