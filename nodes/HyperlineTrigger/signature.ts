import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Deliveries further than this from the current time are treated as replays, as Hyperline recommends. */
export const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * A signing secret Hyperline accepts when creating an endpoint: base64 of
 * random bytes, 32 to 100 characters. 24 bytes encode to exactly 32.
 */
export function generateWebhookSecret(): string {
	return randomBytes(24).toString('base64');
}

/** The HMAC key is the base64-decoded secret, with or without its `whsec_` prefix. */
function secretKey(secret: string): Buffer {
	return Buffer.from(secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret, 'base64');
}

/** `webhook-signature` holds space-separated `<version>,<base64 signature>` pairs. */
export function parseSignatures(header: unknown): string[] {
	if (typeof header !== 'string') return [];
	return header
		.split(' ')
		.map((entry) => entry.trim())
		.filter((entry) => entry.startsWith('v1,'))
		.map((entry) => entry.slice('v1,'.length));
}

type VerifyOptions = {
	secret: string;
	rawBody: Buffer | string;
	webhookId: unknown;
	webhookTimestamp: unknown;
	signatureHeader: unknown;
	/** Current time in seconds, injectable for tests */
	nowSeconds?: number;
};

/**
 * Verifies a Hyperline webhook delivery. Hyperline signs
 * `${webhook-id}.${webhook-timestamp}.${rawBody}` with HMAC-SHA256 and sends
 * the base64 digest in `webhook-signature`.
 */
export function verifyHyperlineSignature({
	secret,
	rawBody,
	webhookId,
	webhookTimestamp,
	signatureHeader,
	nowSeconds = Math.floor(Date.now() / 1000),
}: VerifyOptions): boolean {
	if (typeof webhookId !== 'string' || typeof webhookTimestamp !== 'string') return false;

	const timestamp = Number(webhookTimestamp);
	if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_AGE_SECONDS) {
		return false;
	}

	const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
	const expected = createHmac('sha256', secretKey(secret))
		.update(`${webhookId}.${webhookTimestamp}.`)
		.update(body)
		.digest();

	return parseSignatures(signatureHeader).some((signature) => {
		const actual = Buffer.from(signature, 'base64');
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	});
}
