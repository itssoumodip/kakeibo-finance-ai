import express from 'express';
import { protect } from '../middleware/auth.js';
import { listBudgets, upsertBudget, deleteBudget } from '../controllers/budgetController.js';
import { validate, budgetSchema } from '../utils/validate.js';
const r=express.Router(); r.use(protect);
r.get('/', listBudgets); r.post('/', validate(budgetSchema), upsertBudget); r.delete('/:id', deleteBudget);
export default r;