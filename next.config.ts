import type { NextConfig } from "next";

// L'Atelier du Quiz tourne en standalone derrière le reverse proxy du VPS
// (comme Tiquiz / Tipote). Mono-langue (français), donc pas de plugin
// next-intl ici, contrairement a Tiquiz.
const nextConfig: NextConfig = {
  output: "standalone",
  // transformers.js (embeddings locaux du coach) embarque onnxruntime-node,
  // un module natif : on le laisse externe au bundle serveur pour qu'il soit
  // requis depuis node_modules au runtime (sinon le build casse en essayant
  // de bundler des binaires .node).
  serverExternalPackages: ["@xenova/transformers"],
};

export default nextConfig;
