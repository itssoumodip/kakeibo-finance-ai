import express from 'express';
import { protect } from '../middleware/auth.js';
import { listTransactions, createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController.js';
import { validate, transactionSchema } from '../utils/validate.js';
const r=express.Router(); r.use(protect);
r.get('/', listTransactions); r.post('/', validate(transactionSchema), createTransaction); r.patch('/:id', updateTransaction); r.delete('/:id', deleteTransaction);
export default r;