import {
	NodeConnectionTypes,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type INodeCredentialTestResult,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { signingSecretProblem, verifyHyperlineSignature } from './signature';

// Hyperline webhook endpoints are created by hand in Hyperline, so this node has nothing to
// register, look up or remove there. The rule below assumes a node that manages its own endpoint.
// eslint-disable-next-line @n8n/community-nodes/webhook-lifecycle-complete
export class HyperlineTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperline Trigger',
		name: 'hyperlineTrigger',
		icon: { light: 'file:../../icons/hyperline.svg', dark: 'file:../../icons/hyperline.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["authentication"] === "none" ? "On Hyperline event (unverified)" : "On Hyperline event"}}',
		description: 'Starts the workflow when Hyperline sends a webhook event',
		defaults: {
			name: 'Hyperline Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				// A string literal, not a constant: the lint rule that looks for `testedBy` cannot resolve constants.
				name: 'hyperlineWebhookApi',
				required: true,
				testedBy: 'hyperlineWebhookApiTest',
				displayOptions: {
					show: {
						authentication: ['signingSecret'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					"In Hyperline, add a webhook endpoint with this node's webhook URL and choose which events to send. Use the Test URL while building and the Production URL once the workflow is active.",
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'Accept every request sent to the webhook URL',
					},
					{
						name: 'Signing Secret',
						value: 'signingSecret',
						description: "Only accept deliveries signed with the endpoint's signing secret",
					},
				],
				default: 'signingSecret',
				description: 'Whether to check that deliveries really come from Hyperline',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Custom Action Types',
						name: 'customActionTypes',
						type: 'string',
						default: '',
						placeholder: 'e.g. sync_quote, send_to_erp',
						description:
							'Comma-separated custom action types to react to. Other custom actions are ignored. Applies to the Custom Action event.',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			// There is no API to call for a signing secret, so this only catches an empty or garbled paste.
			async hyperlineWebhookApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const problem = signingSecretProblem(credential.data?.signingSecret);
				return problem === undefined
					? {
							status: 'OK',
							message: 'The secret looks valid. It is checked when Hyperline delivers an event.',
						}
					: { status: 'Error', message: problem };
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headers = this.getHeaderData();

		if (this.getNodeParameter('authentication') === 'signingSecret') {
			const { signingSecret } = await this.getCredentials('hyperlineWebhookApi');

			const isValid =
				typeof signingSecret === 'string' &&
				verifyHyperlineSignature({
					secret: signingSecret,
					rawBody: this.getRequestObject().rawBody ?? '',
					webhookId: headers['webhook-id'],
					webhookTimestamp: headers['webhook-timestamp'],
					signatureHeader: headers['webhook-signature'],
				});

			if (!isValid) {
				this.getResponseObject().status(401).send('Invalid signature').end();
				return { noWebhookResponse: true };
			}
		}

		const body: IDataObject = this.getBodyData();
		const options = this.getNodeParameter('options', {}) as { customActionTypes?: string };
		const customActionTypes = (options.customActionTypes ?? '')
			.split(',')
			.map((type) => type.trim())
			.filter((type) => type !== '');

		if (body.event_type === 'custom_action' && customActionTypes.length > 0) {
			const data = (body.data ?? {}) as IDataObject;
			if (!customActionTypes.includes(String(data.custom_action_type))) {
				// Acknowledge so Hyperline does not retry, but do not start the workflow.
				return {};
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					...body,
					// Stays the same when Hyperline retries a delivery, so it can be used to skip duplicates.
					webhook_id: headers['webhook-id'],
				}),
			],
		};
	}
}
