import { calendarioEstudio } from "@/lib/agendaClub";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(calendarioEstudio(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="atlantida-estudio-jueves.ics"',
      "Cache-Control": "no-store",
    },
  });
}
