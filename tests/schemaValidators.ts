import { expect } from 'vitest';
import type { PaginatedResult } from '../src/index.js';

export function expectHasFields(obj: Record<string, unknown>, fields: string[], label: string = '') {
  for (const field of fields) {
    expect(obj, `${label} missing field: ${field}`).toHaveProperty(field);
  }
}

export function expectFieldTypes(
  obj: Record<string, unknown>,
  fieldTypeMap: Record<string, string>,
  label: string = ''
) {
  for (const [field, expectedType] of Object.entries(fieldTypeMap)) {
    const value = obj[field];
    if (value !== null && value !== undefined) {
      expect(typeof value, `${label}.${field}: expected ${expectedType}`).toBe(expectedType);
    }
  }
}

export function expectPaginationStructure<T>(result: PaginatedResult<T>) {
  expect(result.pagination).toBeDefined();
  const p = result.pagination!;
  expect(typeof p.totalRows).toBe('number');
  expect(typeof p.totalPages).toBe('number');
  expect(p.tableName).toBeDefined();
  expect(typeof p.tableName).toBe('string');
}
