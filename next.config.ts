import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [75, 90] },
  async headers(){return [{source:'/sw.js',headers:[{key:'Content-Type',value:'application/javascript; charset=utf-8'},{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Service-Worker-Allowed',value:'/'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'"}]}];},
  outputFileTracingIncludes: { '/api/entrenamiento/procesar': ['./public/stockfish/stockfish-18-lite-single.js','./public/stockfish/stockfish-18-lite-single.wasm'] },
};

export default nextConfig;
