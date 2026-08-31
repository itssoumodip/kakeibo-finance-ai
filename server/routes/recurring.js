import express from 'express';
import { protect } from '../middleware/auth.js';
import { listRecurring, createRecurring, updateRecurring, deleteRecurring } from '../controllers/recurringController.js';
const r=express.Router(); r.use(protect);
r.get('/', listRecurring); r.post('/', createRecurring); r.patch('/:id', updateRecurring); r.delete('/:id', deleteRecurring);
export default r;