import type {Metadata} from "next";
import {MembresiasClub} from "@/components/MembresiasClub";
export const metadata:Metadata={title:"Socios y membresías · Gestión",robots:{index:false,follow:false}};
export default function Page(){return <MembresiasClub gestion/>;}
