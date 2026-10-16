import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [75, 90] },
  outputFileTracingIncludes: { '/api/entrenamiento/procesar': ['./public/stockfish/stockfish-18-lite-single.js','./public/stockfish/stockfish-18-lite-single.wasm'] },
};

export default nextConfig;
