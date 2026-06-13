// Meta/OG compartido para que el sitio se previsualice bien al compartir el
// link (Slack/WhatsApp/Discord/Twitter). En RR v7 el `meta` de cada ruta
// REEMPLAZA al del padre, así que cada ruta llama a siteMeta() para heredar
// las tags base y sólo sobreescribir título/descripción.

const SITE_URL = "https://crm.coregrid.com.mx";
const OG_IMAGE = `${SITE_URL}/brand/coregrid-logo.png`;
const DEFAULT_TITLE = "CoreGrid · CRM";
const DEFAULT_DESC =
  "CRM para gestionar tu pipeline de ventas, conversaciones y clientes — operado por tu agente.";

type SiteMetaOpts = {
  title?: string;
  description?: string;
  /** Páginas privadas o efímeras (invitaciones, share, reset) → no indexar. */
  noindex?: boolean;
};

export function siteMeta(opts: SiteMetaOpts = {}) {
  const title = opts.title ?? DEFAULT_TITLE;
  const description = opts.description ?? DEFAULT_DESC;
  const tags: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "CoreGrid CRM" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: SITE_URL },
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:width", content: "1104" },
    { property: "og:image:height", content: "624" },
    { property: "og:image:alt", content: "CoreGrid" },
    { property: "og:locale", content: "es_MX" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: OG_IMAGE },
    // Misc
    { name: "theme-color", content: "#0B1B2E" },
  ];
  if (opts.noindex) tags.push({ name: "robots", content: "noindex" });
  return tags;
}
