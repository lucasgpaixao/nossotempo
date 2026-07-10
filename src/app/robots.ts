import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/criar", "/privacidade", "/termos"],
        disallow: ["/p/", "/editar/", "/admin/", "/api/", "/sucesso/"],
      },
    ],
  };
}
