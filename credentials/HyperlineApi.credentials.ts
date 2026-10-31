import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HyperlineApi implements ICredentialType {
	name = 'hyperlineApi';

	displayName = 'Hyperline API';

	icon: Icon = { light: 'file:../icons/hyperline.svg', dark: 'file:../icons/hyperline.dark.svg' };

	documentationUrl = 'https://docs.hyperline.co/developers/getting-started';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Production',
					value: 'production',
					description: 'Live data on api.hyperline.co. Production keys start with "prod_".',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
					description: 'Test data on sandbox.api.hyperline.co. Sandbox keys start with "test_".',
				},
			],
			default: 'production',
			description:
				'Sandbox and production are separate hosts. The key must belong to the environment you pick, otherwise Hyperline rejects it as invalid.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create a key in Hyperline under Settings > API > New API key, with read and write scopes, in the same environment you picked above.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ $credentials.environment === "sandbox" ? "https://sandbox.api.hyperline.co" : "https://api.hyperline.co" }}',
			url: '/v2/customers',
			method: 'GET',
			qs: {
				limit: 1,
			},
		},
	};
}
