import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import {
  relataApiRequest,
  rowsToObjects,
  splitQualifiedTable,
  type RelataConnection,
  type RelataQueryResult,
  type RelataSchema,
} from './GenericFunctions';

export class RelataSql implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'RelataSQL',
    name: 'relataSql',
    icon: 'file:relatasql.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      'Run SQL, inspect schemas, and govern writes across your RelataSQL database connections',
    defaults: { name: 'RelataSQL' },
    usableAsTool: true,
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'relataSqlApi', required: true }],
    properties: [
      // ── Resource ────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Backup', value: 'backups' },
          { name: 'Connection', value: 'connection' },
          { name: 'Database', value: 'database' },
          { name: 'Schema', value: 'schema' },
          { name: 'Write (With Approval)', value: 'write' },
        ],
        default: 'database',
      },

      // ── Operations: Connection ──────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['connection'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            action: 'List database connections',
            description: 'List the database connections reachable with this API key',
          },
        ],
        default: 'list',
      },

      // ── Operations: Database ────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['database'] } },
        options: [
          {
            name: 'Execute Query',
            value: 'executeQuery',
            action: 'Execute a read-only SQL query',
            description: 'Run a read-only SQL query (BEGIN READ ONLY) and return rows',
          },
          {
            name: 'Sample Rows',
            value: 'sampleRows',
            action: 'Sample rows from a table',
            description: 'Return the first N rows of a table',
          },
          {
            name: 'Run in Sandbox',
            value: 'sandbox',
            action: 'Run SQL in a rolled-back sandbox',
            description: 'Execute SQL inside a transaction that is always rolled back (safe test)',
          },
        ],
        default: 'executeQuery',
      },

      // ── Operations: Schema ──────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['schema'] } },
        options: [
          {
            name: 'Get Tables',
            value: 'getTables',
            action: 'Get tables',
            description: 'List tables (and column counts) for a connection',
          },
          {
            name: 'Get Columns',
            value: 'getColumns',
            action: 'Get columns of a table',
            description: 'List the columns of a single table',
          },
          {
            name: 'Get Relations',
            value: 'getRelations',
            action: 'Get foreign key relations',
            description: 'List foreign-key relationships for a connection',
          },
        ],
        default: 'getTables',
      },

      // ── Operations: Write ───────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['write'] } },
        options: [
          {
            name: 'Request Approval',
            value: 'requestApproval',
            action: 'Request approval for a write',
            description: 'Submit a write statement for human approval in RelataSQL',
          },
          {
            name: 'Check Approval',
            value: 'checkApproval',
            action: 'Check approval status',
            description: 'Get the current status of a write approval',
          },
          {
            name: 'Execute Approved',
            value: 'executeApproved',
            action: 'Execute an approved write',
            description: 'Execute a write that has been approved in RelataSQL',
          },
        ],
        default: 'requestApproval',
      },

      // ── Operations: Backups ─────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['backups'] } },
        options: [
          {
            name: 'List Schedules',
            value: 'listSchedules',
            action: 'List backup schedules',
            description: 'List the backup schedules reachable with this API key',
          },
          {
            name: 'Trigger Run',
            value: 'triggerRun',
            action: 'Trigger a backup run now',
            description: 'Manually run a backup schedule immediately',
          },
          {
            name: 'List Logs',
            value: 'listLogs',
            action: 'List recent backup runs',
            description: 'List recent backup run logs',
          },
        ],
        default: 'listSchedules',
      },

      // ── scheduleId (backups → triggerRun) ───────────────────────
      {
        displayName: 'Schedule Name or ID',
        name: 'scheduleId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getSchedules' },
        required: true,
        default: '',
        description:
          'The backup schedule to run. Choose from the list, or specify an ID using an expression.',
        displayOptions: { show: { resource: ['backups'], operation: ['triggerRun'] } },
      },

      // ── connectionId (database / schema) ────────────────────────
      {
        displayName: 'Connection Name or ID',
        name: 'connectionId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getConnections' },
        required: true,
        default: '',
        description:
          'The RelataSQL connection to target. Choose from the list, or specify an ID using an expression.',
        displayOptions: { show: { resource: ['database', 'schema'] } },
      },
      // ── connectionId (write → requestApproval) ──────────────────
      {
        displayName: 'Connection Name or ID',
        name: 'connectionId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getConnections' },
        required: true,
        default: '',
        description:
          'The RelataSQL connection to target. Choose from the list, or specify an ID using an expression.',
        displayOptions: { show: { resource: ['write'], operation: ['requestApproval'] } },
      },

      // ── SQL query (executeQuery / sandbox / requestApproval) ────
      {
        displayName: 'SQL Query',
        name: 'sqlQuery',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '',
        required: true,
        placeholder: 'SELECT * FROM users LIMIT 100',
        description: 'The SQL statement to run',
        displayOptions: {
          show: {
            resource: ['database', 'write'],
            operation: ['executeQuery', 'sandbox', 'requestApproval'],
          },
        },
      },

      // ── Table (sampleRows / getColumns) ─────────────────────────
      {
        displayName: 'Table Name or ID',
        name: 'table',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getTables',
          loadOptionsDependsOn: ['connectionId'],
        },
        required: true,
        default: '',
        description:
          'The table to use (shown as schema.table). Choose from the list, or specify using an expression.',
        displayOptions: {
          show: { resource: ['database', 'schema'], operation: ['sampleRows', 'getColumns'] },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 50 },
        default: 10,
        description: 'Max number of rows to sample',
        displayOptions: { show: { resource: ['database'], operation: ['sampleRows'] } },
      },

      // ── Justification (sandbox / requestApproval) ───────────────
      {
        displayName: 'Justification',
        name: 'justification',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'Why this statement runs',
        description: 'A short reason recorded for audit/approval',
        displayOptions: {
          show: { resource: ['database', 'write'], operation: ['sandbox', 'requestApproval'] },
        },
      },
      {
        displayName: 'Operation Summary',
        name: 'operationSummary',
        type: 'string',
        default: '',
        description: 'Optional human-readable summary of the write',
        displayOptions: { show: { resource: ['write'], operation: ['requestApproval'] } },
      },

      // ── Approval ID (checkApproval / executeApproved) ───────────
      {
        displayName: 'Approval ID',
        name: 'approvalId',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID returned by "Request Approval"',
        displayOptions: {
          show: { resource: ['write'], operation: ['checkApproval', 'executeApproved'] },
        },
      },
    ],
  };

  methods = {
    loadOptions: {
      async getConnections(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const connections = (await relataApiRequest.call(
          this,
          'GET',
          '/mcp/connections',
        )) as RelataConnection[];
        return (connections ?? []).map((c) => ({
          name: `${c.name} (${c.engine} · ${c.databaseName})`,
          value: c.id,
          description: `${c.host}:${c.port} — MCP access: ${c.mcpAccessStatus}`,
        }));
      },

      async getTables(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const connectionId = this.getCurrentNodeParameter('connectionId') as string;
        if (!connectionId) return [];
        const schema = (await relataApiRequest.call(
          this,
          'GET',
          `/mcp/connections/${encodeURIComponent(connectionId)}/schema`,
        )) as RelataSchema;
        return (schema.tables ?? []).map((t) => ({
          name: `${t.schema}.${t.name}`,
          value: `${t.schema}.${t.name}`,
        }));
      },

      async getSchedules(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const schedules = (await relataApiRequest.call(
          this,
          'GET',
          '/mcp/backups/schedules',
        )) as Array<{
          id: string;
          name: string;
          cron: string;
          enabled: boolean;
        }>;
        return (schedules ?? []).map((s) => ({
          name: `${s.name} (${s.cron})${s.enabled ? '' : ' — disabled'}`,
          value: s.id,
        }));
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const out = await runOperation.call(this, resource, operation, i);
        for (const json of out) {
          returnData.push({ json, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

async function runOperation(
  this: IExecuteFunctions,
  resource: string,
  operation: string,
  i: number,
): Promise<IDataObject[]> {
  if (resource === 'connection' && operation === 'list') {
    const connections = (await relataApiRequest.call(
      this,
      'GET',
      '/mcp/connections',
    )) as RelataConnection[];
    return (connections ?? []) as unknown as IDataObject[];
  }

  if (resource === 'database') {
    const connectionId = this.getNodeParameter('connectionId', i) as string;
    const cid = encodeURIComponent(connectionId);

    if (operation === 'executeQuery') {
      const sql = this.getNodeParameter('sqlQuery', i) as string;
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/connections/${cid}/query`,
        { sql },
      )) as RelataQueryResult;
      return resultToItems(res);
    }

    if (operation === 'sampleRows') {
      const tableValue = this.getNodeParameter('table', i) as string;
      const limit = this.getNodeParameter('limit', i) as number;
      const { schema, table } = splitQualifiedTable(tableValue);
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/connections/${cid}/sample-rows`,
        { schema, table, limit },
      )) as RelataQueryResult;
      return resultToItems(res);
    }

    if (operation === 'sandbox') {
      const sql = this.getNodeParameter('sqlQuery', i) as string;
      const justification = this.getNodeParameter('justification', i) as string;
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/connections/${cid}/sandbox`,
        { sql, justification },
      )) as IDataObject & RelataQueryResult;
      return [
        {
          ok: res.ok,
          rolledBack: res.rolledBack,
          rowCount: res.rowCount,
          rows: rowsToObjects(res.columns ?? [], res.rows ?? []),
          error: res.error ?? null,
        },
      ];
    }
  }

  if (resource === 'schema') {
    const connectionId = this.getNodeParameter('connectionId', i) as string;
    const cid = encodeURIComponent(connectionId);

    if (operation === 'getTables') {
      const schema = (await relataApiRequest.call(
        this,
        'GET',
        `/mcp/connections/${cid}/schema`,
      )) as RelataSchema;
      return (schema.tables ?? []).map((t) => ({
        schema: t.schema,
        name: t.name,
        columnCount: t.columns?.length ?? 0,
      }));
    }

    if (operation === 'getColumns') {
      const tableValue = this.getNodeParameter('table', i) as string;
      const { schema: schemaName, table } = splitQualifiedTable(tableValue);
      const schema = (await relataApiRequest.call(
        this,
        'GET',
        `/mcp/connections/${cid}/schema`,
      )) as RelataSchema;
      const match = (schema.tables ?? []).find(
        (t) => t.schema === schemaName && t.name === table,
      );
      return (match?.columns ?? []).map((c) => ({ ...c }));
    }

    if (operation === 'getRelations') {
      const res = (await relataApiRequest.call(
        this,
        'GET',
        `/mcp/connections/${cid}/relations`,
      )) as { relations?: IDataObject[] };
      return (res.relations ?? []) as IDataObject[];
    }
  }

  if (resource === 'write') {
    if (operation === 'requestApproval') {
      const connectionId = this.getNodeParameter('connectionId', i) as string;
      const sql = this.getNodeParameter('sqlQuery', i) as string;
      const justification = this.getNodeParameter('justification', i) as string;
      const operationSummary = this.getNodeParameter(
        'operationSummary',
        i,
        '',
      ) as string;
      const body: IDataObject = { sql, justification };
      if (operationSummary) body.operationSummary = operationSummary;
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/connections/${encodeURIComponent(connectionId)}/write-approvals`,
        body,
      )) as IDataObject;
      return [res];
    }

    if (operation === 'checkApproval') {
      const approvalId = this.getNodeParameter('approvalId', i) as string;
      const res = (await relataApiRequest.call(
        this,
        'GET',
        `/mcp/write-approvals/${encodeURIComponent(approvalId)}`,
      )) as IDataObject;
      return [res];
    }

    if (operation === 'executeApproved') {
      const approvalId = this.getNodeParameter('approvalId', i) as string;
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/write-approvals/${encodeURIComponent(approvalId)}/execute`,
      )) as RelataQueryResult;
      return resultToItems(res);
    }
  }

  if (resource === 'backups') {
    if (operation === 'listSchedules') {
      const res = (await relataApiRequest.call(
        this,
        'GET',
        '/mcp/backups/schedules',
      )) as IDataObject[];
      return res ?? [];
    }

    if (operation === 'triggerRun') {
      const scheduleId = this.getNodeParameter('scheduleId', i) as string;
      const res = (await relataApiRequest.call(
        this,
        'POST',
        `/mcp/backups/schedules/${encodeURIComponent(scheduleId)}/run`,
      )) as IDataObject;
      return [res];
    }

    if (operation === 'listLogs') {
      const res = (await relataApiRequest.call(
        this,
        'GET',
        '/mcp/backups/logs',
      )) as IDataObject[];
      return res ?? [];
    }
  }

  throw new Error(`Unsupported operation "${operation}" for resource "${resource}"`);
}

/** Maps a columnar query result to row objects; never returns zero items. */
function resultToItems(res: RelataQueryResult): IDataObject[] {
  const rows = rowsToObjects(res.columns ?? [], res.rows ?? []);
  if (rows.length === 0) {
    return [{ rowCount: res.rowCount ?? 0, truncated: res.truncated ?? false }];
  }
  if (res.truncated) {
    rows[rows.length - 1] = { ...rows[rows.length - 1], _truncated: true };
  }
  return rows;
}
