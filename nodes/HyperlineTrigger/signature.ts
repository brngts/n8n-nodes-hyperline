import { createHmac, timingSafeEqual } from 'node:crypto';

/** Deliveries further than this from the current time are treated as replays, as Hyperline recommends. */
export const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * The HMAC key is the base64-decoded secret, with or without its `whsec_` prefix.
 * Surrounding whitespace is ignored because secrets are pasted in by hand.
 */
function secretKey(secret: string): Buffer {
	const trimmed = secret.trim();
	return Buffer.from(trimmed.startsWith('whsec_') ? trimmed.slice('whsec_'.length) : trimmed, 'base64');
}

/**
 * What is wrong with a pasted signing secret, or undefined when it looks usable.
 * This only checks the format: whether Hyperline really signs with this secret
 * is known once a delivery arrives.
 */
export function signingSecretProblem(secret: unknown): string | undefined {
	if (typeof secret !== 'string' || secret.trim() === '') return 'The signing secret is empty';
	const trimmed = secret.trim();
	const encoded = trimmed.startsWith('whsec_') ? trimmed.slice('whsec_'.length) : trimmed;
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
		return 'The signing secret is not valid base64. Copy it exactly as Hyperline shows it';
	}
	return undefined;
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

	// An empty key still produces a valid HMAC, so a blank secret would let anyone forge a delivery.
	const key = secretKey(secret);
	if (key.length === 0) return false;

	const timestamp = Number(webhookTimestamp);
	if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_AGE_SECONDS) {
		return false;
	}

	const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
	const expected = createHmac('sha256', key)
		.update(`${webhookId}.${webhookTimestamp}.`)
		.update(body)
		.digest();

	return parseSignatures(signatureHeader).some((signature) => {
		const actual = Buffer.from(signature, 'base64');
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	});
}
