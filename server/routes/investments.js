import express from 'express';
import { protect } from '../middleware/auth.js';
import { listInvestments, investmentHistory } from '../controllers/investmentController.js';
const r=express.Router(); r.use(protect);
r.get('/', listInvestments); r.get('/history', investmentHistory);
export default r;