// Precios de las piezas confirmados por Agustín el 2/11/2026.
// La presentación no cambia cuotas, inscripciones ni el acceso actual.
export const PRESENTACION_MEMBRESIAS = {
  borrador: false,
  torneo: 150,
  referenciaTorneos: 4,
  planes: [
    { id: "club", nombre: "Club", precio: 400, bajada: "Para encontrarnos en el tablero.",
      beneficios: ["Torneos habituales del club incluidos", "Una cuota para jugar durante el mes", "Activación y renovación con el club"],
      detalle: "Incluye los torneos habituales durante la vigencia de tu membresía. Consultá por eventos especiales." },
    { id: "completo", nombre: "Club + entrenamiento", precio: 550, bajada: "Jugá en el club. Mejorá también desde casa.",
      beneficios: ["Todo lo que incluye el plan Club", "Táctica adaptada a tu nivel y tus errores", "Candidatas, evaluación y finales", "Análisis de tus partidas y aperturas", "Repasos y progreso guardado en tu cuenta"],
      detalle: "Entrenamiento personal en la plataforma, con la misma cuenta en el celular y la computadora." },
  ],
} as const;

export function costoPorTorneo(precioMensual: number, torneos: number) {
  return new Intl.NumberFormat("es-UY", { minimumFractionDigits: precioMensual % torneos ? 2 : 0, maximumFractionDigits: 2 }).format(precioMensual / torneos);
}

export function contactoPlan(nombre: string) {
  return `https://wa.me/59899861116?text=${encodeURIComponent(`Hola Agustín, quiero consultar por el plan ${nombre} de Atlántida Ajedrez.`)}`;
}
