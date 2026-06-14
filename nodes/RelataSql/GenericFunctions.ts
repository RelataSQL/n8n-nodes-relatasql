import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// ── Backend response shapes (mirror of relata-mcp/src/relata-api-client.ts) ──
export interface RelataConnection {
  id: string;
  name: string;
  engine: string;
  host: string;
  port: number;
  databaseName: string;
  workspaceId: string;
  workspaceName?: string;
  mcpAccessStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'INDEFINITE';
  mcpGrantedUntil: string | null;
}

export interface RelataColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
}

export interface RelataTable {
  schema: string;
  name: string;
  columns: RelataColumn[];
}

export interface RelataSchema {
  connectionId: string;
  tables: RelataTable[];
}

export interface RelataQueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated?: boolean;
}

type RequestContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Single entry point for every call to the RelataSQL backend. Resolves the
 * credential's base URL, lets n8n inject the Bearer auth header, and maps
 * backend errors (notably the JIT access gate) to actionable messages.
 */
export async function relataApiRequest(
  this: RequestContext,
  method: IHttpRequestMethods,
  path: string,
  body?: IDataObject,
): Promise<any> {
  const credentials = await this.getCredentials('relataSqlApi');
  const baseUrl = String(credentials.baseUrl ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    throw new NodeOperationError(
      this.getNode(),
      'RelataSQL "Base URL" is not set in the credential.',
    );
  }

  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${path}`,
    headers: { Accept: 'application/json' },
    json: true,
  };
  if (body !== undefined) {
    options.body = body;
  }

  try {
    return await this.helpers.httpRequestWithAuthentication.call(
      this,
      'relataSqlApi',
      options,
    );
  } catch (error) {
    throw mapRelataError(this, error);
  }
}

function extractMessage(error: any): string {
  const parts: string[] = [];
  if (typeof error?.message === 'string') parts.push(error.message);
  const resp = error?.response;
  if (resp) {
    const b = resp.body ?? resp.data;
    if (typeof b === 'string') parts.push(b);
    else if (b && typeof b === 'object') {
      if (typeof b.message === 'string') parts.push(b.message);
      else parts.push(JSON.stringify(b));
    }
  }
  if (typeof error?.description === 'string') parts.push(error.description);
  return parts.join(' | ');
}

function mapRelataError(ctx: RequestContext, error: any): Error {
  const node = ctx.getNode();
  const text = extractMessage(error);

  if (text.includes('JIT_ACCESS_REQUIRED')) {
    return new NodeOperationError(
      node,
      'This RelataSQL connection is not enabled for programmatic (API key) access.',
      {
        description:
          'Open RelataSQL → Settings → MCP and enable access for this connection (pick an indefinite grant for unattended n8n flows), then retry.',
      },
    );
  }
  if (text.includes('only supports Postgres') || text.includes('NotImplemented')) {
    return new NodeOperationError(
      node,
      'RelataSQL currently supports only PostgreSQL connections for this operation.',
      {
        description:
          'MySQL/MSSQL execution is not yet available on the RelataSQL backend.',
      },
    );
  }
  if (error instanceof NodeOperationError || error instanceof NodeApiError) {
    return error;
  }
  return new NodeApiError(node, error as JsonObject);
}

/** Turns the backend's columnar result into row objects n8n can map. */
export function rowsToObjects(
  columns: string[],
  rows: unknown[][],
): IDataObject[] {
  return rows.map((row) => {
    const obj: IDataObject = {};
    columns.forEach((col, i) => {
      obj[col] = row[i] as IDataObject[string];
    });
    return obj;
  });
}

/** Splits a "schema.table" dropdown value into its parts. */
export function splitQualifiedTable(value: string): {
  schema: string;
  table: string;
} {
  const idx = value.indexOf('.');
  if (idx < 0) return { schema: 'public', table: value };
  return { schema: value.slice(0, idx), table: value.slice(idx + 1) };
}
