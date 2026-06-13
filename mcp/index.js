#!/usr/bin/env node
// MCP server para el CRM CoreGrid.
// Expone el pipeline de ventas como tools para que un agente lo opere/pruebe.
//
// Configuración (env):
//   CRM_API_URL  — base del CRM (default https://crm.coregrid.com.mx)
//   CRM_API_KEY  — bearer token del workspace (requerido)
//
// Uso típico (config de un agente MCP):
//   {
//     "command": "npx",
//     "args": ["-y", "coregrid-crm-mcp"],
//     "env": { "CRM_API_KEY": "crm_sk_..." }
//   }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.CRM_API_URL || "https://crm.coregrid.com.mx").replace(/\/$/, "");
const API_KEY = process.env.CRM_API_KEY;

if (!API_KEY) {
  console.error("[coregrid-crm-mcp] Falta CRM_API_KEY en el entorno.");
  process.exit(1);
}

const CRM_ENDPOINT = `${API_URL}/api/v1/crm`;

async function getPipeline() {
  const res = await fetch(CRM_ENDPOINT, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`GET pipeline ${res.status}: ${await res.text()}`);
  return res.json();
}

async function postCrm(body) {
  const res = await fetch(CRM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `POST ${res.status}`);
  }
  return json;
}

const ok = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
const fail = (e) => ({
  content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true,
});

const server = new McpServer({
  name: "coregrid-crm",
  version: "0.5.0",
});

server.tool(
  "get_pipeline",
  "Devuelve el pipeline de ventas: etapas (stages) con sus deals y estadísticas (valor total, conversión). Úsalo para ver el estado actual del tablero.",
  {},
  async () => {
    try {
      const data = await getPipeline();
      const summary = {
        stages: data.stages.map((s) => ({
          id: s.id,
          name: s.name,
          count: s.deals.length,
          totalValue: s.totalValue,
          deals: s.deals.map((d) => ({
            id: d.id,
            title: d.title,
            value: d.value,
            customerName: d.customerName,
            tags: d.tags,
          })),
        })),
        stats: data.stats,
      };
      return ok(summary);
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "create_deal",
  "Crea una nueva oportunidad (deal) en el pipeline. Si no se indica stageId, entra en la primera etapa. Puedes incluir notas iniciales con 'notes'.",
  {
    title: z.string().describe("Título de la oportunidad"),
    value: z.number().optional().describe("Valor en MXN"),
    stageId: z.string().optional().describe("ID de la etapa (ej. nuevo, contactado, cotizado, negociacion, ganado, perdido)"),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional().describe("Notas iniciales a registrar en el deal"),
  },
  async ({ notes, ...deal }) => {
    try {
      const r = await postCrm({ intent: "create_deal", deal });
      const dealId = r.dealId;
      let notesAdded = 0;
      for (const content of notes ?? []) {
        if (!content?.trim()) continue;
        await postCrm({ intent: "add_deal_note", dealId, content });
        notesAdded++;
      }
      return ok({ created: true, dealId, notesAdded });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "update_deal",
  "Actualiza campos de una oportunidad existente (título, valor, cliente, etiquetas, etapa).",
  {
    dealId: z.string().describe("ID del deal a actualizar"),
    title: z.string().optional(),
    value: z.number().nullable().optional(),
    stageId: z.string().optional(),
    customerName: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    customerEmail: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ dealId, ...deal }) => {
    try {
      await postCrm({ intent: "update_deal", dealId, deal });
      return ok({ updated: true, dealId });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "move_deal",
  "Mueve una oportunidad a otra etapa del pipeline (drag & drop programático).",
  {
    dealId: z.string().describe("ID del deal a mover"),
    stageId: z.string().describe("ID de la etapa destino"),
    position: z.number().optional().describe("Posición dentro de la etapa (0 = arriba)"),
  },
  async ({ dealId, stageId, position }) => {
    try {
      await postCrm({ intent: "move_deal", dealId, stageId, position });
      return ok({ moved: true, dealId, stageId });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "delete_deal",
  "Elimina una oportunidad del pipeline.",
  {
    dealId: z.string().describe("ID del deal a eliminar"),
  },
  async ({ dealId }) => {
    try {
      await postCrm({ intent: "delete_deal", dealId });
      return ok({ deleted: true, dealId });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "create_share_link",
  "Genera un link público de SOLO LECTURA (con token) para abrir el pipeline completo o una oportunidad específica. Úsalo para mandarle a alguien una vista del tablero o de un lead sin que tenga que iniciar sesión. Devuelve la URL.",
  {
    kind: z.enum(["pipeline", "deal"]).describe("'pipeline' = tablero completo; 'deal' = una oportunidad"),
    dealId: z.string().optional().describe("ID del deal (requerido si kind='deal')"),
    expiresHours: z.number().optional().describe("Horas hasta que expire el link (omitir = sin expiración)"),
  },
  async ({ kind, dealId, expiresHours }) => {
    try {
      const r = await postCrm({ intent: "create_share_link", kind, dealId, expiresHours });
      return ok({ url: r.url });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "list_deal_notes",
  "Lista las notas de una oportunidad (deal), de la más reciente a la más antigua. Útil para conocer el historial/contexto antes de actuar.",
  {
    dealId: z.string().describe("ID del deal"),
  },
  async ({ dealId }) => {
    try {
      const r = await postCrm({ intent: "list_deal_notes", dealId });
      return ok({ dealId, notes: r.notes ?? [] });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "add_deal_note",
  "Agrega una nota (texto libre) a una oportunidad existente. Úsalo para registrar contexto, seguimientos o por qué se ganó/perdió.",
  {
    dealId: z.string().describe("ID del deal"),
    content: z.string().describe("Texto de la nota"),
  },
  async ({ dealId, content }) => {
    try {
      const r = await postCrm({ intent: "add_deal_note", dealId, content });
      return ok({ added: true, dealId, note: r.note });
    } catch (e) {
      return fail(e);
    }
  }
);

// ─── Contactos ─────────────────────────────────────────────────────────────
server.tool(
  "list_contacts",
  "Lista los contactos/leads capturados del workspace. Filtra con 'search' por nombre/teléfono/email.",
  {
    search: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ search, limit }) => {
    try {
      const r = await postCrm({ intent: "list_contacts", search, limit });
      return ok({ contacts: r.items ?? [] });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "create_contact",
  "Crea (o actualiza si ya existe el mismo teléfono) un contacto. Idempotente por teléfono dentro del workspace.",
  {
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  },
  async (contact) => {
    try {
      const r = await postCrm({ intent: "create_contact", contact });
      return ok({ created: true, contact: r.contact });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "update_contact",
  "Actualiza campos de un contacto existente (nombre, teléfono, email).",
  {
    contactId: z.string().describe("ID del contacto"),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  },
  async ({ contactId, ...contact }) => {
    try {
      const r = await postCrm({ intent: "update_contact", contactId, contact });
      return ok({ updated: true, contact: r.contact });
    } catch (e) {
      return fail(e);
    }
  }
);

// ─── Conversaciones / coexistencia ──────────────────────────────────────────
server.tool(
  "list_conversations",
  "Lista conversaciones de WhatsApp del workspace (id, nombre, teléfono, estado, último mensaje). Usa 'search' por teléfono para encontrar la conversación del número con el que hablas y obtener su conversationId (necesario para escalar).",
  {
    search: z.string().optional().describe("Filtra por teléfono/nombre/sessionId"),
    status: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ search, status, limit }) => {
    try {
      const r = await postCrm({ intent: "list_conversations", search, status, limit });
      return ok({ conversations: r.items ?? [] });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "pause_bot",
  "Pausa el bot en una conversación (coexistencia): el humano toma el control temporalmente.",
  { conversationId: z.string() },
  async ({ conversationId }) => {
    try {
      const r = await postCrm({ intent: "pause_bot", conversationId });
      return ok({ paused: true, conversation: r.conversation });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "resume_bot",
  "Reanuda el bot en una conversación (quita pausa/modo manual).",
  { conversationId: z.string() },
  async ({ conversationId }) => {
    try {
      const r = await postCrm({ intent: "resume_bot", conversationId });
      return ok({ resumed: true, conversation: r.conversation });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "takeover_conversation",
  "Toma el control manual de una conversación (handoff a humano, sin tiempo de reanudación automático).",
  { conversationId: z.string() },
  async ({ conversationId }) => {
    try {
      const r = await postCrm({ intent: "takeover_conversation", conversationId });
      return ok({ takenOver: true, conversation: r.conversation });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "send_manual_response",
  "Responde como operador humano en una conversación: el mensaje sale por WhatsApp (vía Formmy). Útil tras pausar/tomar el chat.",
  {
    conversationId: z.string(),
    message: z.string().describe("Texto a enviar al cliente"),
  },
  async ({ conversationId, message }) => {
    try {
      await postCrm({ intent: "send_manual_response", conversationId, message });
      return ok({ sent: true });
    } catch (e) {
      return fail(e);
    }
  }
);

// ─── Escalamiento ────────────────────────────────────────────────────────────
server.tool(
  "list_escalations",
  "Lista los escalamientos (handoff a humano) del workspace. Filtra por status (PENDING|ASSIGNED|RESOLVED).",
  { status: z.enum(["PENDING", "ASSIGNED", "RESOLVED"]).optional() },
  async ({ status }) => {
    try {
      const r = await postCrm({ intent: "list_escalations", status });
      return ok({ escalations: r.items ?? [] });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "create_escalation",
  "Crea un escalamiento (handoff a un agente humano) sobre una conversación existente. Usa list_conversations para obtener el conversationId.",
  {
    conversationId: z.string().describe("ID de la conversación a escalar"),
    reason: z.string().describe("Motivo del escalamiento"),
    summary: z.string().optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    channel: z.string().optional(),
    assignedTo: z.string().optional().describe("Email del agente asignado"),
  },
  async (escalation) => {
    try {
      const r = await postCrm({ intent: "create_escalation", escalation });
      return ok({ created: true, escalation: r.escalation });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "assign_escalation",
  "Asigna un escalamiento a un agente (status → ASSIGNED).",
  {
    id: z.string().describe("ID del escalamiento"),
    assignedTo: z.string().optional().describe("Email del agente (default: el del API key)"),
  },
  async ({ id, assignedTo }) => {
    try {
      const r = await postCrm({ intent: "assign_escalation", id, assignedTo });
      return ok({ assigned: true, escalation: r.escalation });
    } catch (e) {
      return fail(e);
    }
  }
);

server.tool(
  "resolve_escalation",
  "Marca un escalamiento como resuelto (status → RESOLVED).",
  { id: z.string().describe("ID del escalamiento") },
  async ({ id }) => {
    try {
      const r = await postCrm({ intent: "resolve_escalation", id });
      return ok({ resolved: true, escalation: r.escalation });
    } catch (e) {
      return fail(e);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[coregrid-crm-mcp] conectado a ${API_URL}`);
