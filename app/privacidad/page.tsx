export default function PrivacidadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Privacidad</h1>
      <p className="text-zinc-400">
        Atlántida Ajedrez es el sitio del club de ajedrez, usado por sus socios y por el
        administrador del club.
      </p>

      <h2 className="mt-2 font-semibold">Qué datos se usan</h2>
      <p className="text-zinc-400">
        Cuando iniciás sesión con Google para anotarte a un torneo, solo se usa tu dirección de
        email de Google. Se guarda asociada a tu nombre en la lista de jugadores del club,
        únicamente para que puedas anotarte o sacarte de un torneo vos mismo — nadie más puede
        hacerlo en tu nombre. No se accede a ningún otro dato de tu cuenta de Google (contactos,
        archivos, calendario, etc.), ni se comparte tu email con nadie fuera del club.
      </p>

      <h2 className="mt-2 font-semibold">Qué más hay en el sitio</h2>
      <p className="text-zinc-400">
        El resto del sitio (jugadores, torneos, estadísticas) es información pública del club:
        nombres, Elo, resultados de partidas y fotos que el club decide publicar. No hay
        seguimiento publicitario ni se venden datos a terceros.
      </p>

      <h2 className="mt-2 font-semibold">Contacto</h2>
      <p className="text-zinc-400">
        Cualquier consulta sobre esto, escribí a{" "}
        <a href="mailto:elagu04@gmail.com" className="text-blue-400 hover:underline">
          elagu04@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
