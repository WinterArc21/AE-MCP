# AE-MCP Setup (Agent Guide)

This guide is for an AI agent (or a user driving one) to get `ae-mcp` running end-to-end with Adobe After Effects.

## 1. Prerequisites

1. Install Adobe After Effects 2022+.
2. Install Node.js 18+.
3. Install `pnpm` (or run `corepack enable` first, then use `pnpm`).
4. Use macOS or Windows.

## 2. Install Dependencies

From the repo root:

```bash
pnpm install
```

## 3. Build the MCP Server

```bash
pnpm run build
```

Expected output artifact:
- `dist/index.js`

## 4. Install the AE CEP Bridge Extension

```bash
pnpm run install-extension
```

Then restart After Effects.

## 5. Open the AE Bridge Panel

In After Effects:

1. Open `Window > Extensions > AE MCP Bridge`.
2. Keep this panel open while using MCP.
3. Confirm it shows a "watching/waiting for commands" status.

## 6. Configure Commands Folder (Recommended)

Create `ae-mcp.config.json` in the repo root (copy from `ae-mcp.config.example.json`):

```json
{
  "commandsDir": "/absolute/path/to/ae-mcp-commands"
}
```

Notes:
- This is the preferred override for both users and agents.
- On startup, the Node server syncs the resolved path to the Documents config file so CEP and Node use the same folder.

## 7. Configure MCP Client

Point your MCP client to this server:

- command: `node`
- args: `["/absolute/path/to/ae-mcp/dist/index.js"]`

Example (Cursor `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ae-mcp/dist/index.js"]
    }
  }
}
```

## 8. Start the Server

```bash
pnpm start
```

Expected stderr lines include:
- `Server v2.0.0 starting`
- `Commands directory: ...`
- `Connected via stdio. Ready.`

## 9. Smoke Test

From your MCP client, call:

1. `get_project_info`
2. `list_compositions` (optional)

If these return successfully, bridge wiring is working.

## 10. Quick Troubleshooting

If tool calls time out:

1. Ensure AE is open.
2. Ensure AE MCP Bridge panel is open.
3. Ensure MCP server and CEP panel are using the same commands directory.
4. Restart both AE and the MCP server.
5. Re-run:

```bash
pnpm run build
pnpm run install-extension
```

## 11. Daily Usage Loop

1. Start After Effects.
2. Open AE MCP Bridge panel.
3. Start MCP server (`pnpm start`) if not auto-started by your client.
4. Use tools from MCP client as needed.
