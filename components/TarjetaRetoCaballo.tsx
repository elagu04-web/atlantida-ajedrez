import Link from "next/link";
import { PiezaAjedrez } from "./PiezaAjedrez";
export function TarjetaRetoCaballo(){return <Link href="/jugar/caballo" className="knight-invite"><div className="knight-invite-art" aria-hidden="true"><PiezaAjedrez tipo="n" color="w"/><span>64</span></div><div><p className="eyebrow">Nuevo · Reto del club</p><h2>¿Hasta dónde llega tu caballo?</h2><p>Un recorrido sin repetir casillas. Mejorá tu marca y desafiá a tus compañeros.</p></div><span className="knight-invite-action">Probar el reto ↗</span></Link>;}
