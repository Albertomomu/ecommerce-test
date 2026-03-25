import { describe, it, expect } from 'vitest';
import { productQuerySchema, productIdSchema } from '../product';

describe('productQuerySchema', () => {
  it('acepta parámetros válidos completos', () => {
    const result = productQuerySchema.safeParse({
      search: 'camiseta',
      category: 'ropa',
      min_price: '10',
      max_price: '100',
      cursor: 'abc|123',
      limit: '24',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('camiseta');
      expect(result.data.category).toBe('ropa');
      expect(result.data.min_price).toBe(10);
      expect(result.data.max_price).toBe(100);
      expect(result.data.limit).toBe(24);
    }
  });

  it('usa limit=12 por defecto', () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(12);
    }
  });

  it('rechaza categoría inválida', () => {
    const result = productQuerySchema.safeParse({ category: 'electrónica' });
    expect(result.success).toBe(false);
  });

  it('rechaza precio negativo', () => {
    const result = productQuerySchema.safeParse({ min_price: '-5' });
    expect(result.success).toBe(false);
  });

  it('rechaza limit fuera de rango (>50)', () => {
    const result = productQuerySchema.safeParse({ limit: '100' });
    expect(result.success).toBe(false);
  });

  it('rechaza limit=0', () => {
    const result = productQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('acepta todas las categorías válidas', () => {
    for (const cat of ['ropa', 'calzado', 'accesorios']) {
      const result = productQuerySchema.safeParse({ category: cat });
      expect(result.success).toBe(true);
    }
  });

  it('acepta sin parámetros opcionales', () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('productIdSchema', () => {
  it('acepta UUID válido', () => {
    const result = productIdSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza string no UUID', () => {
    const result = productIdSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rechaza string vacío', () => {
    const result = productIdSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});
