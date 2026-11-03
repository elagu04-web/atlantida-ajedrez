import Link from "next/link";
import { Icono } from "./Icono";
import { PRESENTACION_MEMBRESIAS as oferta } from "@/lib/presentacionMembresias";
import s from "./PresentacionMembresias.module.css";

export function InvitacionMembresias() {
  return <Link href="/membresias" className={s.invitacion}><span className={s.invitacionIcono}><Icono nombre="trofeo"/></span><div><p className={s.ceja}>MEMBRESÍAS · PRÓXIMAMENTE</p><h2>Tu mes de ajedrez, a tu manera.</h2><p>Club ${oferta.planes[0].precio} · Club + entrenamiento ${oferta.planes[1].precio} por mes. Recursos para docentes ${oferta.docentes.precio}/mes. Conocé qué incluye cada plan.</p></div><span className={s.invitacionAccion}>Ver planes <Icono nombre="flecha"/></span></Link>;
}
