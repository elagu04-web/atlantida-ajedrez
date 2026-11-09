import Link from 'next/link';
import {Icono} from './Icono';
import s from './HistoriaClub.module.css';
export function InvitacionHistoria(){return <aside className={s.banner} aria-label="Historia del club"><div><strong>Antes de esta web, muchas historias.</strong><p>Volvé a los primeros encuentros, recorré los torneos y encontrá las fotos del archivo de Atlántida Ajedrez.</p></div><Link href="/historia">Historia del club <Icono nombre="flecha" className="h-4 w-4"/></Link></aside>;}
