import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/seo";
export default function robots():MetadataRoute.Robots {return {rules:{userAgent:"*",allow:"/"},sitemap:URL_SITIO+"/sitemap.xml"};}
