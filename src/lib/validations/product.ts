import { z } from 'zod';

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(['ropa', 'calzado', 'accesorios']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(12),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const productIdSchema = z.object({
  id: z.string().uuid(),
});
