import type { NextConfig } from "next";

// FormaQuiz tourne en standalone derrière le reverse proxy du VPS
// (comme Tiquiz / Tipote). Mono-langue (français), donc pas de plugin
// next-intl ici, contrairement a Tiquiz.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
