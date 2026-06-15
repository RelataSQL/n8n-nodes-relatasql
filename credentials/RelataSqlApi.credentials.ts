import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class RelataSqlApi implements ICredentialType {
  name = 'relataSqlApi';

  displayName = 'RelataSQL API';

  documentationUrl = 'https://github.com/LeoPro23/n8n-nodes-relatasql';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'https://api.your-relatasql-domain.com',
      description:
        'Base URL of your RelataSQL backend (relataback) API, with no trailing slash.',
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
