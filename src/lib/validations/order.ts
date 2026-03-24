import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  idempotency_key: z.string().uuid(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
