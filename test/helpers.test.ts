import type { IDataObject, IExecuteSingleFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { toLineItem } from '../nodes/Hyperline/resources/invoice/lineItems';
import { environmentMismatchHint, readApiMessage } from '../nodes/Hyperline/shared/errors';
import { toUtcIso } from '../nodes/Hyperline/shared/dates';
import { cursorPagination, offsetPagination } from '../nodes/Hyperline/shared/pagination';
import { fileNameFromDisposition, unwrapList } from '../nodes/Hyperline/shared/postReceive';
import { sendMultipartFile, setJsonBodyProperty } from '../nodes/Hyperline/shared/preSend';

describe('toLineItem', () => {
	it('maps form fields to the API names and drops empty ones', () => {
		expect(
			toLineItem({
				name: 'Consulting',
				description: '',
				unitAmount: 50000,
				unitsCount: 2,
				taxRate: 19,
				periodStart: '2026-10-01T00:00:00Z',
			}),
		).toEqual({
			name: 'Consulting',
			unit_amount: 50000,
			units_count: 2,
			tax_rate: 19,
			period_start: '2026-10-01T00:00:00Z',
		});
	});
});

describe('readApiMessage', () => {
	it('reads JSON bodies, string bodies and buffers', () => {
		expect(readApiMessage({ message: 'Customer not found' })).toBe('Customer not found');
		expect(readApiMessage('{"message":"Invalid tax ID"}')).toBe('Invalid tax ID');
		expect(readApiMessage(Buffer.from('{"message":"Invoice not found"}'))).toBe('Invoice not found');
		expect(readApiMessage({ message: 'Validation failed', errors: [{ message: 'name is required' }] })).toBe(
			'Validation failed name is required',
		);
		expect(readApiMessage('<html>')).toBeUndefined();
	});
});

describe('environmentMismatchHint', () => {
	it('flags a key used against the other environment', () => {
		expect(environmentMismatchHint('test_abc', 'production')).toMatch(/Sandbox/);
		expect(environmentMismatchHint('prod_abc', 'sandbox')).toMatch(/Production/);
		expect(environmentMismatchHint('test_abc', 'sandbox')).toBeUndefined();
		expect(environmentMismatchHint('prod_abc', 'production')).toBeUndefined();
	});
});

describe('pagination', () => {
	it('carries every filter over to follow-up cursor pages', () => {
		const { qs } = cursorPagination(['status', 'customer_id']).properties.request;
		expect(qs).toMatchObject({
			status: '={{ $request.qs?.status }}',
			customer_id: '={{ $request.qs?.customer_id }}',
			limit: 100,
		});
		expect(qs?.cursor).toContain('next_cursor');
	});

	it('advances offset pages by what the previous page returned', () => {
		const pagination = offsetPagination(['status']);
		expect(pagination.properties.request.qs).toMatchObject({ take: 100, status: '={{ $request.qs?.status }}' });
		expect(pagination.properties.continue).toContain('meta?.total');
	});
});

describe('sendMultipartFile', () => {
	it('sends routed body fields and the input binary as multipart form data', async () => {
		const context = {
			getNodeParameter: (name: string, fallback: unknown) =>
				name === 'binaryPropertyName' ? 'document' : fallback,
			getNode: () => ({}),
			helpers: {
				assertBinaryData: () => ({ fileName: 'contract.pdf', mimeType: 'application/pdf', data: '' }),
				getBinaryDataBuffer: async () => Buffer.from('%PDF-1.4'),
			},
		} as unknown as IExecuteSingleFunctions;

		const request = await sendMultipartFile('file').call(context, {
			url: '/v1/files',
			body: { name: 'Signed contract', customer_id: 'cus_123' },
			headers: { 'Content-Type': 'application/json' },
		});

		const contentType = String(request.headers?.['Content-Type']);
		const boundary = contentType.split('boundary=')[1];
		expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
		const body = (request.body as Buffer).toString();
		expect(body).toContain(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nSigned contract\r\n`);
		expect(body).toContain('name="customer_id"\r\n\r\ncus_123\r\n');
		expect(body).toContain(
			'Content-Disposition: form-data; name="file"; filename="contract.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n',
		);
		expect(body.endsWith(`--${boundary}--\r\n`)).toBe(true);
	});
});

describe('setJsonBodyProperty', () => {
	const contextWith = (value: unknown) =>
		({ getNodeParameter: () => value, getNode: () => ({}) }) as unknown as IExecuteSingleFunctions;

	it('parses arrays and objects into one body property', async () => {
		const request = await setJsonBodyProperty('customers', 'customers', 'Customers (JSON)', 'array').call(
			contextWith('[{"name":"Acme"}]'),
			{ url: '/v1/customers/batch', body: { other: 1 } },
		);
		expect(request.body).toEqual({ other: 1, customers: [{ name: 'Acme' }] });
	});

	it('rejects the wrong JSON shape', async () => {
		await expect(
			setJsonBodyProperty('customers', 'customers', 'Customers (JSON)', 'array').call(contextWith('{}'), {
				url: '/v1/customers/batch',
			}),
		).rejects.toThrow('Customers (JSON) must be a JSON array');
	});
});

describe('list and download helpers', () => {
	const context = {} as IExecuteSingleFunctions;

	it('unwraps both list response shapes into one item per record', async () => {
		expect(await unwrapList.call(context, [{ json: { data: [{ id: 'a' }, { id: 'b' }], meta: {} } }])).toEqual([
			{ json: { id: 'a' } },
			{ json: { id: 'b' } },
		]);
		const bareArray = [{ json: [{ id: 'a' }, 'b'] as unknown as IDataObject }];
		expect(await unwrapList.call(context, bareArray)).toEqual([
			{ json: { id: 'a' } },
			{ json: { value: 'b' } },
		]);
	});

	it('reads file names from Content-Disposition', () => {
		expect(fileNameFromDisposition('attachment; filename="export.csv"')).toBe('export.csv');
		expect(fileNameFromDisposition("attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.xlsx")).toBe('résumé.xlsx');
		expect(fileNameFromDisposition('inline')).toBeUndefined();
		expect(fileNameFromDisposition(undefined)).toBeUndefined();
	});
});

describe('toUtcIso', () => {
	it('reads local times in the workflow timezone, across daylight saving time', () => {
		expect(toUtcIso('2026-11-02T00:00:00', 'Europe/Berlin')).toBe('2026-11-01T23:00:00.000Z');
		expect(toUtcIso('2026-07-01T00:00:00', 'Europe/Berlin')).toBe('2026-06-30T22:00:00.000Z');
		expect(toUtcIso('2026-03-01', 'America/New_York')).toBe('2026-03-01T05:00:00.000Z');
		expect(toUtcIso('2026-03-29T03:30:00', 'Europe/Berlin')).toBe('2026-03-29T01:30:00.000Z');
	});

	it('keeps the instant of values that carry an offset, and passes through invalid ones', () => {
		expect(toUtcIso('2026-07-01T00:00:00+02:00', 'America/New_York')).toBe('2026-06-30T22:00:00.000Z');
		expect(toUtcIso('2026-07-01T00:00:00Z', 'Europe/Berlin')).toBe('2026-07-01T00:00:00.000Z');
		expect(toUtcIso('next tuesday', 'Europe/Berlin')).toBe('next tuesday');
		expect(toUtcIso('2026-07-01T00:00:00', 'Not/AZone')).toBe('2026-07-01T00:00:00');
	});

	it('converts invoice line item periods', () => {
		expect(toLineItem({ name: 'Seats', periodStart: '2026-07-01T00:00:00' }, 'Europe/Berlin')).toEqual({
			name: 'Seats',
			period_start: '2026-06-30T22:00:00.000Z',
		});
	});
});
