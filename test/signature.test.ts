import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseSignatures, verifyHyperlineSignature } from '../nodes/HyperlineTrigger/signature';
import svixExample from './fixtures/svix-example.json';

/**
 * Hyperline delivers webhooks through Svix. The fixture is Svix's published
 * verification example, whose signature also appears in Hyperline's docs.
 */
const SVIX_EXAMPLE = svixExample;

function sign(secret: string, id: string, timestamp: string, body: string): string {
	return createHmac('sha256', Buffer.from(secret, 'base64'))
		.update(`${id}.${timestamp}.${body}`)
		.digest('base64');
}

describe('verifyHyperlineSignature', () => {
	it('accepts the published Svix example', () => {
		expect(verifyHyperlineSignature(SVIX_EXAMPLE)).toBe(true);
	});

	it('accepts the secret without its whsec_ prefix', () => {
		expect(
			verifyHyperlineSignature({ ...SVIX_EXAMPLE, secret: SVIX_EXAMPLE.secret.slice(6) }),
		).toBe(true);
	});

	it('accepts a header listing several signatures when one matches', () => {
		expect(
			verifyHyperlineSignature({
				...SVIX_EXAMPLE,
				signatureHeader: `v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= ${SVIX_EXAMPLE.signatureHeader} v2,MzJsNDk4MzI0K2VvdSMjMTEjQEBAQDEyMzMzMzEyMwo=`,
			}),
		).toBe(true);
	});

	it('rejects a changed body', () => {
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, rawBody: '{"test": 2432232315}' })).toBe(false);
	});

	it('rejects a different message ID', () => {
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, webhookId: 'msg_other' })).toBe(false);
	});

	it('rejects deliveries older or newer than five minutes', () => {
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, nowSeconds: 1614265330 + 301 })).toBe(false);
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, nowSeconds: 1614265330 - 301 })).toBe(false);
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, nowSeconds: 1614265330 + 299 })).toBe(true);
	});

	it('rejects missing headers', () => {
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, signatureHeader: undefined })).toBe(false);
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, webhookId: undefined })).toBe(false);
		expect(verifyHyperlineSignature({ ...SVIX_EXAMPLE, webhookTimestamp: undefined })).toBe(false);
	});

	it('verifies a delivery signed with a raw Buffer body', () => {
		const secret = Buffer.from('a signing key for the tests').toString('base64');
		const body = Buffer.from('{"event_type":"invoice.settled","data":{"id":"inv_1"}}');
		const signature = sign(secret, 'msg_1', '1700000000', body.toString());
		expect(
			verifyHyperlineSignature({
				secret,
				rawBody: body,
				webhookId: 'msg_1',
				webhookTimestamp: '1700000000',
				signatureHeader: `v1,${signature}`,
				nowSeconds: 1700000000,
			}),
		).toBe(true);
	});

	it('ignores whitespace around a pasted secret', () => {
		expect(
			verifyHyperlineSignature({ ...SVIX_EXAMPLE, secret: `  ${SVIX_EXAMPLE.secret}\n` }),
		).toBe(true);
	});

	it('rejects a blank secret, even for a delivery signed with an empty key', () => {
		// An empty key still yields a valid HMAC, so without a guard anyone could forge this.
		const body = '{"event_type":"invoice.settled"}';
		const signature = createHmac('sha256', Buffer.alloc(0))
			.update(`msg_1.1700000000.${body}`)
			.digest('base64');
		for (const secret of ['', '   ', 'whsec_']) {
			expect(
				verifyHyperlineSignature({
					secret,
					rawBody: body,
					webhookId: 'msg_1',
					webhookTimestamp: '1700000000',
					signatureHeader: `v1,${signature}`,
					nowSeconds: 1700000000,
				}),
				JSON.stringify(secret),
			).toBe(false);
		}
	});
});

describe('parseSignatures', () => {
	it('keeps only v1 signatures', () => {
		expect(parseSignatures('v1,abc v2,def v1,ghi')).toEqual(['abc', 'ghi']);
		expect(parseSignatures(undefined)).toEqual([]);
	});
});
