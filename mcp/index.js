#!/usr/bin/env node
// MCP server para el CRM CoreGrid.
// Expone el pipeline de ventas como tools para que un agente lo opere/pruebe.
//
// Configuración (env):
//   CRM_API_URL  — base del CRM (default https://crm-coregrid.fly.dev)
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

const API_URL = (process.env.CRM_API_URL || "https://crm-coregrid.fly.dev").replace(/\/$/, "");
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
  version: "0.1.0",
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
  "Crea una nueva oportunidad (deal) en el pipeline. Si no se indica stageId, entra en la primera etapa.",
  {
    title: z.string().describe("Título de la oportunidad"),
    value: z.number().optional().describe("Valor en MXN"),
    stageId: z.string().optional().describe("ID de la etapa (ej. nuevo, contactado, cotizado, negociacion, ganado, perdido)"),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async (args) => {
    try {
      const r = await postCrm({ intent: "create_deal", deal: args });
      return ok({ created: true, dealId: r.dealId });
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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[coregrid-crm-mcp] conectado a ${API_URL}`);
