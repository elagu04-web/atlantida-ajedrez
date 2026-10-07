# Atlántida Ajedrez

Sistema de torneos, ranking Elo y transmisión del club. Next.js, React y Supabase.

## Desarrollo

- Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local. No publiques claves privadas.
- npm install
- npm run dev
- Abrí http://localhost:3000.

## Verificación

- npm test: calendarios, descansos, rondas, empates, finales, Elo y protección de escrituras simultáneas con datos ficticios. No accede a Supabase.
- npm run lint
- npx tsc --noEmit
- npm run build

## Reglas y sincronización

- Descanso en round robin: 0 puntos y 0 partidas. Bye suizo: conserva 1 punto.
- Los calendarios de round robin y match se generan completos; la pantalla sigue la ronda indicada por los resultados reales, no la última del calendario.
- Empates tras aplicar todos los criterios comparten posición. Se conserva la final de desempate propia del club.
- Las listas se sincronizan por Supabase Realtime, con respaldo por consulta cada 5 segundos. No se solapan consultas.
- Un cambio se muestra y registra después de confirmar su escritura. Las actualizaciones comparan el valor anterior de los campos modificados para evitar sobrescribir cambios de otra pantalla.
- No se permite eliminar jugadores que aparecen en calendarios de torneos.

## Permisos

Supabase debe aplicar RLS: ocultar botones en el navegador no concede ni limita permisos en la base de datos. Los módulos escolares se cargan únicamente para el administrador. Las políticas de acceso a datos personales requieren una revisión independiente; este cambio no modifica el esquema ni las políticas de Supabase.
