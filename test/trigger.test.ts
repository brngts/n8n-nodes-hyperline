import { createHmac } from 'node:crypto';
import type { ICredentialTestFunctions, ICredentialsDecrypted, IWebhookFunctions } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { HyperlineTrigger } from '../nodes/HyperlineTrigger/HyperlineTrigger.node';
import { signingSecretProblem } from '../nodes/HyperlineTrigger/signature';

const SECRET = `whsec_${Buffer.from('a signing key for the trigger tests').toString('base64')}`;
const WEBHOOK_ID = 'msg_1';

type Delivery = {
	body: Record<string, unknown>;
	authentication?: 'none' | 'signingSecret';
	signingSecret?: unknown;
	customActionTypes?: string;
	/** Overrides the headers, for deliveries that are unsigned or signed wrongly. */
	headers?: Record<string, string>;
	/** Seconds since epoch used for the timestamp header; defaults to now. */
	timestamp?: number;
};

function signedHeaders(rawBody: string, timestamp: number, secret = SECRET) {
	const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
	const signature = createHmac('sha256', key)
		.update(`${WEBHOOK_ID}.${timestamp}.${rawBody}`)
		.digest('base64');
	return {
		'webhook-id': WEBHOOK_ID,
		'webhook-timestamp': String(timestamp),
		'webhook-signature': `v1,${signature}`,
	};
}

/** Runs the trigger's webhook handler against a minimal stand-in for n8n's context. */
async function receive(delivery: Delivery) {
	const {
		body,
		authentication = 'signingSecret',
		customActionTypes,
		headers,
		timestamp = Math.floor(Date.now() / 1000),
	} = delivery;
	// A destructuring default would also replace an explicit `undefined`, which is a case worth testing.
	const signingSecret = 'signingSecret' in delivery ? delivery.signingSecret : SECRET;
	const rawBody = JSON.stringify(body);
	const response = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), end: vi.fn() };

	const context = {
		getHeaderData: () => headers ?? signedHeaders(rawBody, timestamp),
		getRequestObject: () => ({ rawBody: Buffer.from(rawBody) }),
		getResponseObject: () => response,
		getBodyData: () => body,
		getNodeParameter: (name: string, fallback?: unknown) => {
			if (name === 'authentication') return authentication;
			if (name === 'options') return customActionTypes === undefined ? fallback : { customActionTypes };
			throw new Error(`Unexpected parameter ${name}`);
		},
		getCredentials: async () => ({ signingSecret }),
		helpers: { returnJsonArray: (data: unknown) => [{ json: data }] },
	} as unknown as IWebhookFunctions;

	const result = await new HyperlineTrigger().webhook.call(context);
	return { result, response };
}

const INVOICE_SETTLED = { event_type: 'invoice.settled', data: { id: 'inv_1' } };

describe('Hyperline Trigger webhook', () => {
	it('starts the workflow for a correctly signed delivery of any event type', async () => {
		for (const event_type of ['invoice.settled', 'customer.created', 'some.future_event']) {
			const { result } = await receive({ body: { event_type, data: { id: 'x' } } });
			expect(result.workflowData?.[0]?.[0]?.json, event_type).toMatchObject({
				event_type,
				webhook_id: WEBHOOK_ID,
			});
		}
	});

	it('answers 401 and starts nothing when the signature is wrong', async () => {
		const wrongSecret = `whsec_${Buffer.from('some other key').toString('base64')}`;
		const rawBody = JSON.stringify(INVOICE_SETTLED);
		const { result, response } = await receive({
			body: INVOICE_SETTLED,
			headers: signedHeaders(rawBody, Math.floor(Date.now() / 1000), wrongSecret),
		});
		expect(response.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('answers 401 for an unsigned delivery', async () => {
		const { result, response } = await receive({ body: INVOICE_SETTLED, headers: {} });
		expect(response.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('answers 401 for a replayed delivery with an old timestamp', async () => {
		const { response } = await receive({
			body: INVOICE_SETTLED,
			timestamp: Math.floor(Date.now() / 1000) - 3600,
		});
		expect(response.status).toHaveBeenCalledWith(401);
	});

	it('answers 401 when the credential holds no usable secret, instead of accepting everything', async () => {
		for (const signingSecret of ['', '   ', undefined]) {
			const { result, response } = await receive({ body: INVOICE_SETTLED, signingSecret });
			expect(response.status, String(signingSecret)).toHaveBeenCalledWith(401);
			expect(result).toEqual({ noWebhookResponse: true });
		}
	});

	it('accepts unsigned deliveries only when authentication is None', async () => {
		const { result, response } = await receive({
			body: INVOICE_SETTLED,
			authentication: 'none',
			headers: { 'webhook-id': WEBHOOK_ID },
		});
		expect(response.status).not.toHaveBeenCalled();
		expect(result.workflowData?.[0]?.[0]?.json).toMatchObject({ event_type: 'invoice.settled' });
	});

	describe('Custom Action Types', () => {
		const customAction = (type: string) => ({
			event_type: 'custom_action',
			data: { custom_action_type: type },
		});

		it('passes custom actions on when no filter is set', async () => {
			const { result } = await receive({ body: customAction('sync_quote') });
			expect(result.workflowData).toHaveLength(1);
		});

		it('passes on only the listed custom action types', async () => {
			const filter = ' sync_quote , send_to_erp ';
			const listed = await receive({ body: customAction('send_to_erp'), customActionTypes: filter });
			expect(listed.result.workflowData).toHaveLength(1);

			const other = await receive({ body: customAction('something_else'), customActionTypes: filter });
			// Acknowledged with 200 so Hyperline does not retry, but nothing runs.
			expect(other.result).toEqual({});
			expect(other.response.status).not.toHaveBeenCalled();
		});

		it('does not filter events that are not custom actions', async () => {
			const { result } = await receive({ body: INVOICE_SETTLED, customActionTypes: 'sync_quote' });
			expect(result.workflowData).toHaveLength(1);
		});
	});
});

describe('Hyperline Trigger credential test', () => {
	const trigger = new HyperlineTrigger();
	const check = (signingSecret: unknown) =>
		trigger.methods.credentialTest.hyperlineWebhookApiTest.call(
			{} as ICredentialTestFunctions,
			{ data: { signingSecret } } as unknown as ICredentialsDecrypted,
		);

	it('is the method the credential points to', () => {
		const [credential] = trigger.description.credentials ?? [];
		expect(credential?.testedBy).toBe('hyperlineWebhookApiTest');
		expect(trigger.methods.credentialTest).toHaveProperty(String(credential?.testedBy));
	});

	it('accepts a secret as Hyperline shows it, with or without whsec_', async () => {
		expect((await check(SECRET)).status).toBe('OK');
		expect((await check(SECRET.slice('whsec_'.length))).status).toBe('OK');
		expect((await check(`  ${SECRET}\n`)).status).toBe('OK');
	});

	it('rejects an empty or garbled secret with a reason', async () => {
		for (const secret of ['', '   ', 'whsec_', 'not base64!', 'whsec_ab cd', undefined, 42]) {
			const result = await check(secret);
			expect(result.status, String(secret)).toBe('Error');
			expect(result.message).not.toBe('');
		}
	});
});

describe('signingSecretProblem', () => {
	it('returns nothing for a usable secret', () => {
		expect(signingSecretProblem(SECRET)).toBeUndefined();
	});

	it('names the problem for an unusable one', () => {
		expect(signingSecretProblem('')).toMatch(/empty/);
		expect(signingSecretProblem('whsec_***')).toMatch(/base64/);
	});
});
