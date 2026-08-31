import express from 'express';
import { protect } from '../middleware/auth.js';
import { getReport, exportCsv, exportExcel } from '../controllers/reportController.js';
const r=express.Router(); r.use(protect);
r.get('/', getReport); r.get('/export/csv', exportCsv); r.get('/export/excel', exportExcel);
export default r;