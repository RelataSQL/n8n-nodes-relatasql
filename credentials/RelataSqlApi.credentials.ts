import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
  INodeProperties,
} from 'n8n-workflow';

export class RelataSqlApi implements ICredentialType {
  name = 'relataSqlApi';

  displayName = 'RelataSQL API';

  icon: Icon = 'file:relatasql.png';

  documentationUrl = 'https://github.com/RelataSQL/n8n-nodes-relatasql';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.relatasql.com',
      required: true,
      placeholder: 'https://api.relatasql.com',
      description:
        'RelataSQL API base URL (no trailing slash). Keep the default cloud API URL.',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'A RelataSQL API key from Settings → API Keys (starts with "relata_live_").',
    },
  ];

  // Injected on every request the node makes.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  // Validates the key by listing connections (cheap, API-key-gated).
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/mcp/connections',
    },
  };
}
