# n8n-nodes-relatasql

Official [n8n](https://n8n.io) community node for **[RelataSQL](https://relatasql.com)** — run SQL, inspect
schemas, and govern writes across your RelataSQL database connections, straight from your automations.

This node is a pure **database-infrastructure** integration. It deliberately does **not** include any AI/LLM
operation: use n8n's native AI nodes (with your own key) to generate SQL or logic, then hand it to this node to
execute safely against your databases. That keeps token costs on your side and avoids runaway-loop billing.

## Installation

In n8n: **Settings → Community Nodes → Install** and enter `n8n-nodes-relatasql`.

Self-hosted/manual: build this package (`npm install && npm run build`) and place/link it under your n8n custom
extensions folder (`~/.n8n/custom`) or set `N8N_CUSTOM_EXTENSIONS` to its path.

## Credentials

Create a **RelataSQL API** credential:

- **Base URL** — your RelataSQL backend (relataback) API base, e.g. `https://api.your-domain.com` (no trailing slash).
- **API Key** — generated in RelataSQL → **Settings → API Keys** (starts with `relata_live_`). Sent as
  `Authorization: Bearer <key>`.

The credential **Test** lists your connections to verify the key.

## Operations

**Connection**
- *List* — connections reachable with this API key (also powers the connection dropdown).

**Database** (Postgres; queries run read-only)
- *Execute Query* — run a read-only SQL query and return one item per row.
- *Sample Rows* — first N rows of a table.
- *Run in Sandbox* — execute SQL inside a transaction that is always rolled back (safe test).

**Schema**
- *Get Tables* / *Get Columns* / *Get Relations* — introspect a connection.

**Write (with approval)** — the governed mutation path
- *Request Approval* → returns an approval ID.
- *Check Approval* → poll its status (a human approves it in RelataSQL → Settings → MCP → Approvals).
- *Execute Approved* → run the approved statement.

## Important constraints

- **Enable the connection first.** Programmatic access is gated: in RelataSQL go to **Settings → MCP** and enable
  access for each connection (choose an *indefinite* grant for unattended n8n flows). Otherwise calls fail with a
  clear "connection not enabled for API access" error.
- **Read vs write.** *Execute Query* is read-only by design. Mutations go through the **Write (with approval)**
  flow, which requires a human approval in the RelataSQL UI.
- **PostgreSQL only** for query/schema in this version. MySQL/MSSQL execution is coming on the backend.

## Example: move data between databases

`Execute Query` on connection A (read) → transform in n8n → `Request Write` on connection B → approve in
RelataSQL → `Execute Approved`.

## License

[MIT](LICENSE)
