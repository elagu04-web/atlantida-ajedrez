/** Retratos preparados desde las imágenes facilitadas para cada jugador. */
type JugadorConFoto = { id: string; fotoUrl: string | null };
type Preparado = { archivo: string; fotoRegistrada: string | null; pixel?: boolean };
const bucket = "https://xewtgrrsepjlzwvknkxb.supabase.co/storage/v1/object/public/fotos-jugadores/";
const fotoRegistrada = (id: string, version: string) => `${bucket}${id}.png?v=${version}`;

const preparados: Record<string, Preparado> = {
  "d1c933d4-197b-434a-924c-d404421e02a6": { archivo: "/imagenes/retratos/gabi-transparente.webp", fotoRegistrada: fotoRegistrada("d1c933d4-197b-434a-924c-d404421e02a6", "1788282055680") },
  "9178067e-5b8e-4883-bf17-ac0945ea923a": { archivo: "/imagenes/retratos/matias-transparente.webp", fotoRegistrada: fotoRegistrada("9178067e-5b8e-4883-bf17-ac0945ea923a", "1788282100382") },
  "adaff79d-3a75-4532-8ff7-3ec7238a21b6": { archivo: "/imagenes/retratos/fonchi-transparente.webp", fotoRegistrada: fotoRegistrada("adaff79d-3a75-4532-8ff7-3ec7238a21b6", "1787279144638") },
  "49441026-0a70-4e0c-904c-8022c4a5fa3a": { archivo: "/imagenes/retratos/lara-transparente.webp", fotoRegistrada: null },
  "2cba15cf-586b-420b-a144-de5ee6d85031": { archivo: "/imagenes/retratos/camilo-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/camilo-tablero-20261027-transparente.webp" },
  "db7d23fa-0254-4d6a-91ac-9eb9b41c5c76": { archivo: "/imagenes/retratos/fernando-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/fernando-tablero-20261027-transparente.webp" },
  "97fa10ca-29a9-4db7-8061-e39414e0c65f": { archivo: "/imagenes/retratos/jorge-transparente.webp", fotoRegistrada: fotoRegistrada("97fa10ca-29a9-4db7-8061-e39414e0c65f", "1787717166033"), pixel: true },
  "44970cf2-4a55-4b9f-93b0-9c9c59ef2557": { archivo: "/imagenes/retratos/juan-diego-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/juan-diego-tablero-20261027-transparente.webp" },
  "0d188c7b-c5b7-4e75-852b-9a5d17379fdb": { archivo: "/imagenes/retratos/victor-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/victor-tablero-20261027-transparente.webp" },
  "f9cd88c1-b14f-4755-8d3d-90de781ea7d9": { archivo: "/imagenes/retratos/yamandu-foto-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/yamandu-foto-20261027-transparente.webp" },
  "6f1b8d21-76f7-4a49-8434-c18f48f91172": { archivo: "/imagenes/retratos/marco-transparente.webp", fotoRegistrada: fotoRegistrada("6f1b8d21-76f7-4a49-8434-c18f48f91172", "1787716999302"), pixel: true },
  "40edddb0-5302-4798-8cf2-80f60317d856": { archivo: "/imagenes/retratos/ale-visi-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/ale-visi-tablero-20261027-transparente.webp" },
  "2eca2178-89cd-47d5-9b72-c7b1c65477bb": { archivo: "/imagenes/retratos/luis-perez-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/luis-perez-tablero-20261027-transparente.webp" },
  "21885761-c357-4357-9bb7-a1a6402ea32c": { archivo: "/imagenes/retratos/mauro-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/mauro-tablero-20261027-transparente.webp" },
  "aa10113f-5c5c-43a1-8aa3-d9ea29a332f4": { archivo: "/imagenes/retratos/kiara-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/kiara-tablero-20261027-transparente.webp" },
  "dce120b2-90ea-41b7-848e-9ba4a8f84613": { archivo: "/imagenes/retratos/cuadroman-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/cuadroman-tablero-20261027-transparente.webp" },
  "b298bece-6c2e-4df0-bedc-031c84278c32": { archivo: "/imagenes/retratos/pablo-pereira-tablero-20261027-transparente.webp", fotoRegistrada: "https://atlantida-ajedrez.vercel.app/imagenes/retratos/pablo-pereira-tablero-20261027-transparente.webp" },
};

export function retratoJugador(jugador: JugadorConFoto) {
  const preparado = preparados[jugador.id];
  // Una nueva foto subida por el administrador tiene prioridad sobre el recorte anterior.
  if (preparado && jugador.fotoUrl === preparado.fotoRegistrada) {
    return { src: preparado.archivo, miniatura: preparado.archivo.replace("-transparente.webp", "-miniatura.webp"), transparente: true, pixel: Boolean(preparado.pixel) };
  }
  return { src: jugador.fotoUrl, miniatura: jugador.fotoUrl, transparente: false, pixel: false };
}
