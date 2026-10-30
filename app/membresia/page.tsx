import type {Metadata} from "next";
import {MembresiasClub} from "@/components/MembresiasClub";
export const metadata:Metadata={title:"Mi membresía · Atlántida Ajedrez",robots:{index:false,follow:false}};
export default function Page(){return <MembresiasClub/>;}
