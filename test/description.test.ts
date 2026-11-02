import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Hyperline } from '../nodes/Hyperline/Hyperline.node';
import hyperlinePaths from './fixtures/hyperline-paths.json';

const node = new Hyperline();
const { properties } = node.description;

/**
 * `HYPERLINE_RESOURCES=coupon,taxRate npx vitest run` limits the per-resource
 * checks to those resources, which helps while other resources are in progress.
 */
// eslint-disable-next-line @n8n/community-nodes/no-restricted-globals -- test-only filter, not shipped in the package
const onlyResources = process.env.HYPERLINE_RESOURCES?.split(',').map((value) => value.trim());
const inScope = (resource: unknown) => !onlyResources || onlyResources.includes(String(resource));
const scopedProperties = properties.filter(
	(property) =>
		property.name === 'resource' ||
		!property.displayOptions?.show?.resource ||
		property.displayOptions.show.resource.some(inScope),
);

type DocumentedEndpoints = Record<string, Record<string, { query: string[]; body: string[] }>>;
const documented: DocumentedEndpoints = hyperlinePaths;

function isOption(option: unknown): option is INodePropertyOptions {
	return typeof option === 'object' && option !== null && 'value' in option;
}

function operationsFor(resource: string) {
	const operation = properties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes(resource),
	);
	return (operation?.options ?? []).filter(isOption);
}

/**
 * Matches a routed URL such as `=/v1/customers/{{$parameter.customer}}` to its
 * spec path. When several paths match (`/v1/customers/segments` also fits
 * `/v1/customers/{id}`), the one with the most literal segments wins.
 */
function specPathFor(url: string): string | undefined {
	const concrete = url.replace(/^=/, '').replace(/\{\{[^}]+\}\}/g, ':id');
	const literalSegments = (path: string) =>
		path.split('/').filter((segment) => segment !== '' && !segment.startsWith('{')).length;
	return Object.keys(documented)
		.filter((path) => new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(concrete))
		.sort((a, b) => literalSegments(b) - literalSegments(a))[0];
}

type SentParameter = { type: 'query' | 'body'; property: string };

/**
 * Collects `routing.send` declarations, including those nested in collections,
 * and the body fields preSend functions declare through `bodyProperties`.
 */
function sendsIn(property: INodeProperties): SentParameter[] {
	const send = property.routing?.send;
	const own: SentParameter[] =
		(send?.type === 'query' || send?.type === 'body') && send.property
			? [{ type: send.type, property: send.property }]
			: [];
	for (const preSend of send?.preSend ?? []) {
		const bodyProperties = (preSend as { bodyProperties?: string[] }).bodyProperties ?? [];
		own.push(...bodyProperties.map((bodyProperty) => ({ type: 'body' as const, property: bodyProperty })));
	}

	const nested = (property.options ?? []).flatMap((option) => {
		if (typeof option !== 'object' || option === null) return [];
		const candidates = 'values' in option ? (option.values ?? []) : [option];
		return candidates
			.filter((candidate): candidate is INodeProperties => 'type' in candidate)
			.flatMap(sendsIn);
	});

	return [...own, ...nested];
}

function parametersSentBy(resource: string, operation: INodePropertyOptions): SentParameter[] {
	const request = operation.routing?.request;
	const fromOperation: SentParameter[] = [
		...Object.keys(request?.qs ?? {}).map((property) => ({ type: 'query' as const, property })),
		...Object.keys((request?.body as Record<string, unknown>) ?? {}).map((property) => ({
			type: 'body' as const,
			property,
		})),
	];

	const fromFields = properties
		.filter((property) => {
			const show = property.displayOptions?.show;
			if (!show?.resource?.includes(resource)) return false;
			return !show.operation || show.operation.includes(operation.value);
		})
		.flatMap(sendsIn);

	return [...fromOperation, ...fromFields];
}

/** Query parameters a paginated operation repeats on follow-up pages. */
function carriedOverQuery(resource: string, operation: INodePropertyOptions): string[] | undefined {
	const returnAll = properties.find(
		(property) =>
			property.name === 'returnAll' &&
			property.displayOptions?.show?.resource?.includes(resource) &&
			property.displayOptions?.show?.operation?.includes(operation.value),
	);
	const pagination = returnAll?.routing?.operations?.pagination;
	if (!pagination || typeof pagination === 'function' || pagination.type !== 'generic') return undefined;
	return Object.keys(pagination.properties.request.qs ?? {});
}

describe('Hyperline node description', () => {
	const allResourceValues = (properties.find((property) => property.name === 'resource')?.options ?? [])
		.filter(isOption)
		.map((option) => String(option.value));
	const resourceValues = allResourceValues.filter(inScope);

	it('has an operation list with routing for every resource', () => {
		expect(allResourceValues.length).toBe(37);
		for (const resource of resourceValues) {
			const operations = operationsFor(resource);
			expect(operations.length, resource).toBeGreaterThan(0);
			for (const operation of operations) {
				expect(operation.routing?.request?.url, `${resource}.${operation.value}`).toMatch(
					/^=?\/v\d\//,
				);
				expect(operation.routing?.request?.ignoreHttpStatusErrors).toBe(true);
				expect(operation.routing?.output?.postReceive?.length).toBeGreaterThan(0);
			}
		}
	});

	it('only shows parameters for resources and operations that exist', () => {
		for (const property of scopedProperties) {
			const show = property.displayOptions?.show;
			if (!show) continue;
			for (const resource of show.resource ?? []) {
				expect(allResourceValues, property.name).toContain(resource);
				for (const operation of show.operation ?? []) {
					expect(
						operationsFor(String(resource)).map((option) => option.value),
						property.name,
					).toContain(operation);
				}
			}
		}
	});

	it('only calls endpoints and methods that exist in the Hyperline OpenAPI spec', () => {
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				const path = specPathFor(String(url));
				expect(path, `${resource}.${operation.value} uses unknown path ${url}`).toBeDefined();
				expect(
					Object.keys(documented[String(path)]),
					`${resource}.${operation.value} ${method} ${url}`,
				).toContain(method);
			}
		}
	});

	it('only sends query and body parameters the endpoint accepts', () => {
		const problems: string[] = [];
		let checked = 0;
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				const accepted = documented[String(specPathFor(String(url)))]?.[String(method)];
				if (!accepted) continue; // covered by the endpoint test above

				for (const { type, property } of parametersSentBy(resource, operation)) {
					checked += 1;
					const topLevel = property.split('.')[0];
					const allowed = type === 'query' ? accepted.query : accepted.body;
					if (!allowed.includes(topLevel)) {
						problems.push(
							`${resource}.${String(operation.value)} sends ${type} "${property}", which ${method} ${url} does not accept`,
						);
					}
				}
			}
		}
		expect(problems).toEqual([]);
		// Guards against the collector walking past every field and reporting a clean run.
		if (!onlyResources) expect(checked).toBeGreaterThan(100);
	});

	it('repeats every filter query parameter during pagination', () => {
		const problems: string[] = [];
		let paginated = 0;
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const carried = carriedOverQuery(resource, operation);
				if (!carried) continue;
				paginated += 1;
				for (const { type, property } of parametersSentBy(resource, operation)) {
					if (type === 'query' && !carried.includes(property)) {
						problems.push(`${resource}.${String(operation.value)} pagination misses ${property}`);
					}
				}
			}
		}
		expect(problems).toEqual([]);
		if (!onlyResources) expect(paginated).toBeGreaterThan(5);
	});

	it('keeps collection entries and options in alphabetical order', () => {
		const unsorted: string[] = [];
		const check = (names: string[], where: string) => {
			const sorted = [...names].sort((a, b) => a.localeCompare(b));
			if (names.join('|') !== sorted.join('|')) unsorted.push(where);
		};
		for (const property of scopedProperties) {
			if (property.type === 'collection') {
				check(
					(property.options ?? []).map((option) => ('displayName' in option ? option.displayName : '')),
					`${property.name} for ${JSON.stringify(property.displayOptions?.show)}`,
				);
			}
			if (property.type === 'options' && property.name !== 'operation') {
				check((property.options ?? []).filter(isOption).map((o) => o.name), property.name);
			}
		}
		expect(unsorted).toEqual([]);
	});

	it('uses the right indefinite article in every visible string', () => {
		const texts: string[] = [];
		const collect = (property: INodeProperties) => {
			texts.push(property.displayName, property.description ?? '', property.placeholder ?? '');
			for (const option of property.options ?? []) {
				if ('action' in option) texts.push(option.name, option.action ?? '', option.description ?? '');
				else if ('type' in option) collect(option);
			}
		};
		scopedProperties.forEach(collect);
		const wrong = texts.filter((text) => /\ba [aeio]/i.test(text) || /\ban [^aeiou]/i.test(text));
		expect(wrong).toEqual([]);
	});

	it('registers every list search method it references', () => {
		const methods = scopedProperties.flatMap((property) =>
			(property.modes ?? []).flatMap((mode) => {
				const method = mode.typeOptions?.searchListMethod;
				return method ? [method] : [];
			}),
		);
		expect(methods.length).toBeGreaterThan(0);
		for (const method of methods) {
			expect(node.methods.listSearch).toHaveProperty(method);
		}
	});
});

/**
 * Endpoints in Hyperline's OpenAPI spec that the node deliberately leaves out.
 * Use the HTTP Request node with the Hyperline API credential for these.
 */
const NOT_COVERED: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /^[A-Z]+ \/oauth\//, reason: 'OAuth app flow, not used with API keys' },
	{
		pattern: /^[A-Z]+ \/v1\/accounting\/(journal-entries|journal-entry-lines|ledgers|accounts|primary-ledger|rules)/,
		reason: 'ledger management (journal entries, ledgers, accounts, rules) is not in the node yet',
	},
	{ pattern: /^[A-Z]+ \/v1\/(ai|agents)\//, reason: 'AI billing and agent monitoring are not in the node yet' },
	{ pattern: /^GET \/v1\/analytics$/, reason: 'account analytics are not in the node yet' },
	{ pattern: /^[A-Z]+ \/v1\/apps/, reason: 'API app management' },
	{ pattern: /^[A-Z]+ \/v1\/companies$/, reason: 'company management' },
	{ pattern: /^[A-Z]+ \/v1\/organisations/, reason: 'organisation settings' },
	{ pattern: /^[A-Z]+ \/v1\/invoicing-entities/, reason: 'invoicing entities are not in the node yet' },
	{ pattern: /^POST \/v1\/integrations\/components\/token$/, reason: 'embedded UI components token' },
	{ pattern: /^POST \/v1\/payments$/, reason: 'payments are not in the node yet' },
	{
		pattern: /^GET \/v1\/webhooks\/(endpoints\/\{id\}|messages)$/,
		reason: 'webhook endpoints are managed by the Hyperline Trigger',
	},
	{ pattern: /^GET \/v1\/invoices(\/\{id\})?$/, reason: 'superseded by the v2 invoice endpoints the node uses' },
];

/** Webhook endpoint routes the Hyperline Trigger calls to register and remove itself. */
const TRIGGER_ENDPOINTS = [
	'GET /v1/webhooks/endpoints',
	'POST /v1/webhooks/endpoints',
	'PUT /v1/webhooks/endpoints/{id}',
	'DELETE /v1/webhooks/endpoints/{id}',
];

describe('Hyperline API coverage', () => {
	it('has an operation for every endpoint in the spec, apart from the documented exclusions', () => {
		if (onlyResources) return;
		const resources = (properties.find((property) => property.name === 'resource')?.options ?? [])
			.filter(isOption)
			.map((option) => String(option.value));
		const covered = new Set(TRIGGER_ENDPOINTS);
		for (const resource of resources) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				covered.add(`${String(method)} ${String(specPathFor(String(url)))}`);
			}
		}

		const endpoints = Object.entries(documented).flatMap(([path, methods]) =>
			Object.keys(methods).map((method) => `${method} ${path}`),
		);
		const excluded = (endpoint: string) => NOT_COVERED.some(({ pattern }) => pattern.test(endpoint));

		const missing = endpoints.filter((endpoint) => !covered.has(endpoint) && !excluded(endpoint));
		expect(missing, 'add an operation, or an entry in NOT_COVERED with the reason').toEqual([]);

		const coveredButExcluded = endpoints.filter((endpoint) => covered.has(endpoint) && excluded(endpoint));
		expect(coveredButExcluded, 'remove these from NOT_COVERED').toEqual([]);
	});
});

describe('Hyperline Trigger node description', () => {
	it('is a webhook trigger with a full lifecycle', async () => {
		const { HyperlineTrigger } = await import('../nodes/HyperlineTrigger/HyperlineTrigger.node');
		const trigger = new HyperlineTrigger();
		expect(trigger.description.group).toEqual(['trigger']);
		expect(trigger.description.inputs).toEqual([]);
		expect(trigger.description.webhooks?.[0]?.httpMethod).toBe('POST');
		expect(Object.keys(trigger.webhookMethods.default).sort()).toEqual([
			'checkExists',
			'create',
			'delete',
		]);
	});

	it('only manages webhook endpoints through documented routes', () => {
		expect(documented['/v1/webhooks/endpoints']).toHaveProperty('GET');
		expect(documented['/v1/webhooks/endpoints'].POST.body).toEqual(
			expect.arrayContaining(['url', 'description', 'event_types', 'secret']),
		);
		expect(documented['/v1/webhooks/endpoints/{id}']).toHaveProperty('PUT');
		expect(documented['/v1/webhooks/endpoints/{id}']).toHaveProperty('DELETE');
	});
});
