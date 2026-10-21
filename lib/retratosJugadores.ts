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
  "2cba15cf-586b-420b-a144-de5ee6d85031": { archivo: "/imagenes/retratos/camilo-transparente.webp", fotoRegistrada: fotoRegistrada("2cba15cf-586b-420b-a144-de5ee6d85031", "1788282129987"), pixel: true },
  "db7d23fa-0254-4d6a-91ac-9eb9b41c5c76": { archivo: "/imagenes/retratos/fernando-transparente.webp", fotoRegistrada: fotoRegistrada("db7d23fa-0254-4d6a-91ac-9eb9b41c5c76", "1788282152364"), pixel: true },
  "97fa10ca-29a9-4db7-8061-e39414e0c65f": { archivo: "/imagenes/retratos/jorge-transparente.webp", fotoRegistrada: fotoRegistrada("97fa10ca-29a9-4db7-8061-e39414e0c65f", "1787717166033"), pixel: true },
  "44970cf2-4a55-4b9f-93b0-9c9c59ef2557": { archivo: "/imagenes/retratos/juan-diego-transparente.webp", fotoRegistrada: fotoRegistrada("44970cf2-4a55-4b9f-93b0-9c9c59ef2557", "1788282080241"), pixel: true },
  "6f1b8d21-76f7-4a49-8434-c18f48f91172": { archivo: "/imagenes/retratos/marco-transparente.webp", fotoRegistrada: fotoRegistrada("6f1b8d21-76f7-4a49-8434-c18f48f91172", "1787716999302"), pixel: true },
};

export function retratoJugador(jugador: JugadorConFoto) {
  const preparado = preparados[jugador.id];
  // Una nueva foto subida por el administrador tiene prioridad sobre el recorte anterior.
  if (preparado && jugador.fotoUrl === preparado.fotoRegistrada) {
    return { src: preparado.archivo, miniatura: preparado.archivo.replace("-transparente.webp", "-miniatura.webp"), transparente: true, pixel: Boolean(preparado.pixel) };
  }
  return { src: jugador.fotoUrl, miniatura: jugador.fotoUrl, transparente: false, pixel: false };
}
