import type { NextConfig } from "next";

// Headers de segurança aplicados a todas as respostas. Não usamos CSP global
// aqui porque a página do casal (/p) injeta o iframe do YouTube e o Next usa
// estilos/scripts inline — uma CSP restritiva quebraria isso e precisa de
// tuning à parte. X-Frame-Options controla se NOSSAS páginas podem ser
// embutidas por terceiros (clickjacking); não afeta o embed do YouTube dentro
// da nossa página.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
