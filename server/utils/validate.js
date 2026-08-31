import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
});
export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(['income','expense','investment']),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  merchant: z.string().optional(),
  paymentMethod: z.string().optional(),
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export const budgetSchema = z.object({
  category: z.string().min(1),
  limit: z.coerce.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(', ');
    const err = new Error(msg);
    err.status = 400;
    return next(err);
  }
  req.body = parsed.data;
  next();
};