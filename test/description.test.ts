import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Hyperline } from '../nodes/Hyperline/Hyperline.node';
import { customerGetManyQueryParameters } from '../nodes/Hyperline/resources/customer';
import { invoiceGetManyQueryParameters } from '../nodes/Hyperline/resources/invoice';
import { productGetManyQueryParameters } from '../nodes/Hyperline/resources/product';
import { quoteGetManyQueryParameters } from '../nodes/Hyperline/resources/quote';
import { subscriptionGetManyQueryParameters } from '../nodes/Hyperline/resources/subscription';
import hyperlinePaths from './fixtures/hyperline-paths.json';

const node = new Hyperline();
const { properties } = node.description;

type DocumentedEndpoints = Record<string, Record<string, { query: string[]; body: string[] }>>;
const documented: DocumentedEndpoints = hyperlinePaths;

/** Body fields that preSend functions add, which `routing.send.property` cannot show. */
const PRE_SEND_BODY_FIELDS: Record<string, string[]> = {
	'invoice.create': ['line_items'],
	'billableEvent.send': ['record'],
};

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

/** Matches a routed URL such as `=/v1/customers/{{$parameter.customer}}` to its spec path. */
function specPathFor(url: string): string | undefined {
	const concrete = url.replace(/^=/, '').replace(/\{\{[^}]+\}\}/g, ':id');
	return Object.keys(documented).find((path) => {
		const pattern = new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`);
		return pattern.test(concrete);
	});
}

type SentParameter = { type: 'query' | 'body'; property: string };

/** Collects `routing.send` declarations, including those nested in collections. */
function sendsIn(property: INodeProperties): SentParameter[] {
	const send = property.routing?.send;
	const own: SentParameter[] =
		(send?.type === 'query' || send?.type === 'body') && send.property
			? [{ type: send.type, property: send.property }]
			: [];

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

	const fromPreSend = (PRE_SEND_BODY_FIELDS[`${resource}.${String(operation.value)}`] ?? []).map(
		(property) => ({ type: 'body' as const, property }),
	);

	return [...fromOperation, ...fromFields, ...fromPreSend];
}

function queryPropertiesIn(collection: INodeProperties | undefined): string[] {
	return (collection?.options ?? [])
		.filter((option): option is INodeProperties => 'type' in option)
		.flatMap((option) => {
			const send = option.routing?.send;
			return send?.type === 'query' && send.property ? [send.property] : [];
		});
}

describe('Hyperline node description', () => {
	const resourceValues = (properties.find((property) => property.name === 'resource')?.options ?? [])
		.filter(isOption)
		.map((option) => String(option.value));

	it('has an operation list with routing for every resource', () => {
		expect(resourceValues.length).toBe(6);
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
		for (const property of properties) {
			const show = property.displayOptions?.show;
			if (!show) continue;
			for (const resource of show.resource ?? []) {
				expect(resourceValues, property.name).toContain(resource);
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
		expect(checked).toBeGreaterThan(100);
	});

	it('repeats every filter query parameter during pagination', () => {
		const cases = [
			{ resource: 'customer', expected: customerGetManyQueryParameters },
			{ resource: 'invoice', expected: invoiceGetManyQueryParameters },
			{ resource: 'product', expected: productGetManyQueryParameters },
			{ resource: 'quote', expected: quoteGetManyQueryParameters },
			{ resource: 'subscription', expected: subscriptionGetManyQueryParameters },
		];
		for (const { resource, expected } of cases) {
			const collections = properties.filter(
				(property) =>
					(property.name === 'filters' || property.name === 'options') &&
					property.displayOptions?.show?.resource?.includes(resource) &&
					property.displayOptions?.show?.operation?.includes('getAll'),
			);
			expect(collections.length, resource).toBeGreaterThan(0);
			for (const parameter of collections.flatMap(queryPropertiesIn)) {
				expect(expected, `${resource} pagination misses ${parameter}`).toContain(parameter);
			}
		}
	});

	it('keeps collection entries and options in alphabetical order', () => {
		const unsorted: string[] = [];
		const check = (names: string[], where: string) => {
			const sorted = [...names].sort((a, b) => a.localeCompare(b));
			if (names.join('|') !== sorted.join('|')) unsorted.push(where);
		};
		for (const property of properties) {
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
		properties.forEach(collect);
		const wrong = texts.filter((text) => /\ba [aeio]/i.test(text) || /\ban [^aeiou]/i.test(text));
		expect(wrong).toEqual([]);
	});

	it('registers every list search method it references', () => {
		const methods = properties.flatMap((property) =>
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
