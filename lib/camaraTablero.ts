// Nombres compartidos entre /transmitir (sube fotos) y /transmision (las
// muestra). El archivo "en vivo" se sobrescribe siempre en el mismo lugar
// (upsert) para que el storage no crezca con el tiempo — no importa cuánto
// dure la partida, ocupa siempre una sola foto. Las fotos de un desajuste
// se guardan aparte, sin sobrescribir, para poder mirarlas después.
export const CAMARA_BUCKET = "transmision-camara";
export const CAMARA_ARCHIVO_EN_VIVO = "tablero-actual.jpg";
export const CAMARA_CARPETA_DESAJUSTES = "desajustes";
