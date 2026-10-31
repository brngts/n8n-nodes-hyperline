#!/usr/bin/env node
/**
 * Pulls Hyperline's live OpenAPI specs and regenerates
 * test/fixtures/hyperline-paths.json: every path, method and accepted
 * query/body parameter, which the description tests check the node against.
 *
 * Run with `npm run sync:openapi` after Hyperline ships API changes.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS = ['https://api.hyperline.co/openapi', 'https://ingest.hyperline.co/openapi'];
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function resolver(spec) {
	const resolve = (node) => {
		let current = node;
		while (current && typeof current === 'object' && '$ref' in current) {
			current = current.$ref
				.split('/')
				.slice(1)
				.reduce((value, key) => value[key], spec);
		}
		return current;
	};
	return resolve;
}

/** Top-level property names of a schema, across allOf/anyOf/oneOf branches. */
function propertyNames(schema, resolve, seen = new Set()) {
	const resolved = resolve(schema);
	if (!resolved || typeof resolved !== 'object' || seen.has(resolved)) return [];
	seen.add(resolved);
	const names = Object.keys(resolved.properties ?? {});
	for (const key of ['allOf', 'anyOf', 'oneOf']) {
		for (const branch of resolved[key] ?? []) names.push(...propertyNames(branch, resolve, seen));
	}
	return names;
}

function describeEndpoints(spec, into) {
	const resolve = resolver(spec);
	for (const [path, operations] of Object.entries(spec.paths)) {
		for (const method of METHODS) {
			const operation = operations[method];
			if (!operation) continue;
			const query = (operation.parameters ?? [])
				.map(resolve)
				.filter((parameter) => parameter.in === 'query')
				.map((parameter) => parameter.name);
			const content = resolve(operation.requestBody)?.content ?? {};
			const schema = content['application/json']?.schema ?? content['multipart/form-data']?.schema;
			const body = schema ? propertyNames(schema, resolve) : [];
			into[path] ??= {};
			into[path][method.toUpperCase()] = {
				query: [...new Set(query)].sort(),
				body: [...new Set(body)].sort(),
			};
		}
	}
}

const specs = await Promise.all(
	SPECS.map(async (url) => {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`${url} answered ${response.status}`);
		return await response.json();
	}),
);

const endpoints = {};
for (const spec of specs) describeEndpoints(spec, endpoints);
await writeFile(
	join(ROOT, 'test/fixtures/hyperline-paths.json'),
	`${JSON.stringify(endpoints, null, '\t')}\n`,
);

console.log(`${Object.keys(endpoints).length} paths`);
