# coregrid-crm-mcp

MCP server para el **CRM CoreGrid**. Expone el pipeline de ventas como tools
para que un agente lo opere y pruebe.

## Tools

| Tool | Qué hace |
|------|----------|
| `get_pipeline` | Etapas con sus deals + estadísticas (valor total, conversión) |
| `create_deal` | Crea una oportunidad |
| `update_deal` | Actualiza título/valor/cliente/etiquetas/etapa |
| `move_deal` | Mueve una oportunidad a otra etapa |
| `delete_deal` | Elimina una oportunidad |

## Configuración

Variables de entorno:

- `CRM_API_KEY` (requerido) — bearer token del workspace.
- `CRM_API_URL` (opcional) — base del CRM. Default `https://crm-coregrid.fly.dev`.

## Uso con un agente (config MCP)

```json
{
  "mcpServers": {
    "coregrid-crm": {
      "command": "npx",
      "args": ["-y", "coregrid-crm-mcp"],
      "env": {
        "CRM_API_KEY": "crm_sk_..."
      }
    }
  }
}
```

## Etapas del pipeline (stageId)

`nuevo` · `contactado` · `cotizado` · `negociacion` · `ganado` · `perdido`
