const ZONA = "America/Montevideo";
export const ESTUDIO_CLUB = {
  titulo: "Grupo de estudio · Atlántida Ajedrez",
  horario: "Jueves · 18:30",
  url: "https://atlantida-ajedrez.vercel.app/noticias/sumate-a-nuestro-grupo-de-estudio",
};

function partes(fecha: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha).map(p => [p.type, p.value]));
}

export function proximoEstudio(ahora = new Date()): Date {
  const local = partes(ahora);
  const fecha = new Date(Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), 18, 30));
  fecha.setUTCDate(fecha.getUTCDate() + (4 - fecha.getUTCDay() + 7) % 7);
  // Convertir la hora anunciada a UTC usando la zona del club, no la del navegador.
  const convertir = (dia: Date) => {
    const observada = partes(dia);
    const comoUTC = Date.UTC(Number(observada.year), Number(observada.month) - 1, Number(observada.day), Number(observada.hour), Number(observada.minute), Number(observada.second));
    return new Date(dia.getTime() - (comoUTC - dia.getTime()));
  };
  let inicio = convertir(fecha);
  if (inicio.getTime() <= ahora.getTime()) {
    fecha.setUTCDate(fecha.getUTCDate() + 7);
    inicio = convertir(fecha);
  }
  return inicio;
}

function plegar(linea: string) {
  let resultado = "", bytes = 0;
  for (const caracter of linea) {
    const longitud = new TextEncoder().encode(caracter).length;
    if (bytes + longitud > 75) { resultado += "\r\n "; bytes = 1; }
    resultado += caracter; bytes += longitud;
  }
  return resultado;
}

export function calendarioEstudio(ahora = new Date()): string {
  const marca = (fecha: Date) => fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Atlantida Ajedrez//Agenda del club//ES", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", "UID:grupo-estudio-jueves@atlantida-ajedrez.vercel.app",
    `DTSTAMP:${marca(ahora)}`, `DTSTART:${marca(proximoEstudio(ahora))}`,
    "RRULE:FREQ=WEEKLY;BYDAY=TH", `SUMMARY:${ESTUDIO_CLUB.titulo}`,
    "DESCRIPTION:Todos los jueves a las 18:30 (hora de Uruguay). Estudiamos ajedrez y compartimos un buen rato. Traé tus dudas y tus ideas.",
    `URL:${ESTUDIO_CLUB.url}`, "TRANSP:TRANSPARENT", "END:VEVENT", "END:VCALENDAR", "",
  ].map(plegar).join("\r\n");
}
