import express from 'express';
import { protect } from '../middleware/auth.js';
import { listCategories, createCategory } from '../controllers/categoryController.js';
const r = express.Router();
r.use(protect);
r.get('/', listCategories);
r.post('/', createCategory);
export default r;