import type { Route } from "./+types/app.integraciones";
import { requireWorkspace } from "server/auth.server";
import type { IconType } from "react-icons";
import {
  SiWhatsapp,
  SiMessenger,
  SiMercadopago,
  SiStripe,
  SiConekta,
  SiShopify,
  SiMeta,
  SiInstagram,
  SiGooglecalendar,
  SiGoogle,
  SiHubspot,
  SiOdoo,
  SiZapier,
  SiSlack,
  SiTelegram,
} from "react-icons/si";

export function meta() {
  return [{ title: "Integraciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireWorkspace(request);
  return null;
}

type Integration = {
  name: string;
  desc: string;
  Icon?: IconType; // si no hay logo oficial, se usa monograma
  color: string;
  status: "soon" | "next";
};

// Las más relevantes para CRM/ventas en México.
const INTEGRATIONS: Integration[] = [
  { name: "WhatsApp", desc: "Bandeja y mensajes de tus clientes", Icon: SiWhatsapp, color: "#25D366", status: "next" },
  { name: "Messenger", desc: "Mensajes de Facebook Messenger", Icon: SiMessenger, color: "#00B2FF", status: "soon" },
  { name: "Instagram", desc: "Mensajes directos y comentarios", Icon: SiInstagram, color: "#E4405F", status: "soon" },
  { name: "Meta Ads", desc: "Leads de Facebook e Instagram", Icon: SiMeta, color: "#0467DF", status: "soon" },
  { name: "Mercado Pago", desc: "Cobros y links de pago", Icon: SiMercadopago, color: "#00B1EA", status: "soon" },
  { name: "Stripe", desc: "Pagos con tarjeta y suscripciones", Icon: SiStripe, color: "#635BFF", status: "soon" },
  { name: "Conekta", desc: "Pagos en México (OXXO, SPEI, tarjeta)", Icon: SiConekta, color: "#0A2540", status: "soon" },
  { name: "Kommo", desc: "Migra tu CRM de WhatsApp", color: "#3CB39E", status: "soon" },
  { name: "Facturama", desc: "Facturación CFDI 4.0 (SAT)", color: "#109D8E", status: "soon" },
  { name: "Odoo", desc: "ERP y facturación", Icon: SiOdoo, color: "#714B67", status: "soon" },
  { name: "Shopify", desc: "Pedidos y catálogo de tu tienda", Icon: SiShopify, color: "#96BF48", status: "soon" },
  { name: "HubSpot", desc: "Sincroniza contactos y deals", Icon: SiHubspot, color: "#FF7A59", status: "soon" },
  { name: "Google Workspace", desc: "Gmail, Calendar y Contactos", Icon: SiGoogle, color: "#4285F4", status: "soon" },
  { name: "Google Calendar", desc: "Agenda citas y recordatorios", Icon: SiGooglecalendar, color: "#4285F4", status: "soon" },
  { name: "Zapier", desc: "Conecta con 6,000+ apps", Icon: SiZapier, color: "#FF4F00", status: "soon" },
  { name: "Slack", desc: "Notificaciones a tu equipo", Icon: SiSlack, color: "#4A154B", status: "soon" },
  { name: "Telegram", desc: "Atención por Telegram", Icon: SiTelegram, color: "#26A5E4", status: "soon" },
];

export default function Integraciones() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Integraciones</h1>
      <p className="mt-1 text-sm text-gray-500">
        Conecta tu CRM con las herramientas que ya usas. Más integraciones en camino.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map(({ name, desc, Icon, color, status }) => (
          <div
            key={name}
            className="relative flex items-start gap-3 rounded-2xl border border-outlines bg-white p-4"
          >
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}1A` }}
            >
              {Icon ? (
                <Icon className="h-6 w-6" style={{ color }} />
              ) : (
                <span className="text-lg font-bold" style={{ color }}>
                  {name.charAt(0)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-dark">{name}</h3>
                <span
                  className={
                    status === "next"
                      ? "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-600"
                      : "rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-gray-400"
                  }
                >
                  {status === "next" ? "Pronto" : "Próximamente"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        ¿Necesitas otra integración? Escríbenos y la priorizamos.
      </p>
    </div>
  );
}
