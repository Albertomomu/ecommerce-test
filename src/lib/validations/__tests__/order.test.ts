import { describe, it, expect } from 'vitest';
import { createOrderSchema } from '../order';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '660e8400-e29b-41d4-a716-446655440001';

describe('createOrderSchema', () => {
  it('acepta pedido válido con un item', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: 2 }],
      idempotency_key: validUUID2,
    });
    expect(result.success).toBe(true);
  });

  it('acepta pedido válido con múltiples items', () => {
    const result = createOrderSchema.safeParse({
      items: [
        { product_id: validUUID, quantity: 1 },
        { product_id: validUUID2, quantity: 3 },
      ],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza array de items vacío', () => {
    const result = createOrderSchema.safeParse({
      items: [],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity negativa', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: -1 }],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity=0', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: 0 }],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity decimal', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: 1.5 }],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza product_id no UUID', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: 'not-a-uuid', quantity: 1 }],
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza idempotency_key no UUID', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: 1 }],
      idempotency_key: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin idempotency_key', () => {
    const result = createOrderSchema.safeParse({
      items: [{ product_id: validUUID, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin items', () => {
    const result = createOrderSchema.safeParse({
      idempotency_key: validUUID,
    });
    expect(result.success).toBe(false);
  });
});
