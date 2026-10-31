import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { HYPERLINE_CREDENTIAL_NAME, PAGE_SIZE } from '../Hyperline/shared/constants';
import { hyperlineApiRequest } from '../Hyperline/shared/transport';
import { WEBHOOK_EVENT_TYPES } from './events';
import { generateWebhookSecret, verifyHyperlineSignature } from './signature';

const ALL_EVENTS = '*';

const WEBHOOK_DESCRIPTION = 'n8n workflow trigger';

type WebhookEndpoint = {
	id: string;
	url: string;
	event_types?: string[] | null;
};

type WebhookEndpointList = {
	data: WebhookEndpoint[];
	meta?: { iterator?: string | null };
};

/** Upper bound for the endpoint listing loop, so a misbehaving API cannot keep us busy forever. */
const MAX_ENDPOINT_PAGES = 20;

/** "All Events" replaces any other selection; Hyperline sends everything when no filter is set. */
function eventTypesFilter(selected: unknown): string[] | undefined {
	const events = Array.isArray(selected)
		? selected.filter((event): event is string => typeof event === 'string')
		: [];
	if (events.length === 0 || events.includes(ALL_EVENTS)) return undefined;
	return [...new Set(events)].sort();
}

function sameEventTypes(a: string[] | null | undefined, b: string[] | undefined): boolean {
	const left = a && a.length > 0 ? [...a].sort() : undefined;
	if (left === undefined || b === undefined) return left === b;
	return left.length === b.length && left.every((value, index) => value === b[index]);
}

async function findEndpointByUrl(
	this: IHookFunctions,
	url: string,
): Promise<WebhookEndpoint | undefined> {
	let iterator: string | undefined;
	for (let page = 0; page < MAX_ENDPOINT_PAGES; page++) {
		const response: WebhookEndpointList = await hyperlineApiRequest.call(
			this,
			'GET',
			'/v1/webhooks/endpoints',
			{ limit: PAGE_SIZE, iterator },
		);
		const match = (response.data ?? []).find((endpoint) => endpoint.url === url);
		if (match) return match;
		const next = response.meta?.iterator;
		if (!next || next === iterator || (response.data ?? []).length === 0) return undefined;
		iterator = next;
	}
	return undefined;
}

export class HyperlineTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperline Trigger',
		name: 'hyperlineTrigger',
		icon: { light: 'file:../../icons/hyperline.svg', dark: 'file:../../icons/hyperline.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].includes("*") ? "All events" : $parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something happens in Hyperline',
		defaults: {
			name: 'Hyperline Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: HYPERLINE_CREDENTIAL_NAME,
				required: true,
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'All Events',
						value: ALL_EVENTS,
						description: 'Every event type, including ones Hyperline adds later',
					},
					...WEBHOOK_EVENT_TYPES,
				],
				default: [],
				required: true,
				description: 'Which Hyperline events start the workflow',
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

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;
				const webhookData = this.getWorkflowStaticData('node');
				const eventTypes = eventTypesFilter(this.getNodeParameter('events'));

				const existing = await findEndpointByUrl.call(this, webhookUrl);
				if (!existing) return false;

				// Hyperline never returns an endpoint's secret, so an endpoint this node did
				// not create (or whose secret was lost) cannot be verified. Replace it.
				if (existing.id !== webhookData.webhookId || typeof webhookData.webhookSecret !== 'string') {
					await hyperlineApiRequest.call(this, 'DELETE', `/v1/webhooks/endpoints/${existing.id}`);
					return false;
				}

				if (sameEventTypes(existing.event_types, eventTypes)) return true;

				// An update without `event_types` may keep the old filter, so switching to
				// All Events recreates the endpoint instead.
				if (eventTypes === undefined) {
					await hyperlineApiRequest.call(this, 'DELETE', `/v1/webhooks/endpoints/${existing.id}`);
					return false;
				}
				await hyperlineApiRequest.call(
					this,
					'PUT',
					`/v1/webhooks/endpoints/${existing.id}`,
					{},
					{ url: webhookUrl, description: WEBHOOK_DESCRIPTION, event_types: eventTypes },
				);
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const eventTypes = eventTypesFilter(this.getNodeParameter('events'));
				const secret = generateWebhookSecret();

				const response: WebhookEndpoint = await hyperlineApiRequest.call(
					this,
					'POST',
					'/v1/webhooks/endpoints',
					{},
					{
						url: webhookUrl,
						description: WEBHOOK_DESCRIPTION,
						event_types: eventTypes,
						secret,
					},
				);

				if (!response.id) return false;
				webhookData.webhookId = response.id;
				webhookData.webhookSecret = secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (typeof webhookData.webhookId !== 'string') return true;

				try {
					await hyperlineApiRequest.call(
						this,
						'DELETE',
						`/v1/webhooks/endpoints/${webhookData.webhookId}`,
					);
				} catch (error) {
					this.logger.warn(`Could not delete Hyperline webhook endpoint ${webhookData.webhookId}`, {
						error: error instanceof Error ? error.message : String(error),
					});
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').webhookSecret;
		const headers = this.getHeaderData();

		const isValid =
			typeof secret === 'string' &&
			verifyHyperlineSignature({
				secret,
				rawBody: request.rawBody ?? '',
				webhookId: headers['webhook-id'],
				webhookTimestamp: headers['webhook-timestamp'],
				signatureHeader: headers['webhook-signature'],
			});

		if (!isValid) {
			this.getResponseObject().status(401).send('Invalid signature').end();
			return { noWebhookResponse: true };
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
