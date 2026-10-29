export const HYPERLINE_CREDENTIAL_NAME = 'hyperlineApi';

export type HyperlineEnvironment = 'production' | 'sandbox';

/**
 * Sandbox and production are separate hosts, not separate key prefixes or paths.
 * A sandbox key sent to the production host is rejected with a 401 that reads
 * like a bad key, so the host always follows the credential's Environment.
 */
const HOSTS: Record<HyperlineEnvironment, { api: string; ingest: string }> = {
	production: {
		api: 'https://api.hyperline.co',
		ingest: 'https://ingest.hyperline.co',
	},
	sandbox: {
		api: 'https://sandbox.api.hyperline.co',
		ingest: 'https://sandbox.ingest.hyperline.co',
	},
};

/** Base URL of the main API, as an expression resolved against the credential. */
export const API_BASE_URL = `={{ $credentials.environment === "sandbox" ? "${HOSTS.sandbox.api}" : "${HOSTS.production.api}" }}`;

/** Base URL of the events ingestion API, which lives on its own host. */
export const INGEST_BASE_URL = `={{ $credentials.environment === "sandbox" ? "${HOSTS.sandbox.ingest}" : "${HOSTS.production.ingest}" }}`;

export function apiBaseUrl(environment: unknown): string {
	return environment === 'sandbox' ? HOSTS.sandbox.api : HOSTS.production.api;
}

/** The largest page Hyperline's list endpoints accept. */
export const PAGE_SIZE = 100;
