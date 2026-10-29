import { describe, expect, it } from 'vitest';
import { toLineItem } from '../nodes/Hyperline/resources/invoice/lineItems';
import { environmentMismatchHint, readApiMessage } from '../nodes/Hyperline/shared/errors';
import { cursorPagination, offsetPagination } from '../nodes/Hyperline/shared/pagination';

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
