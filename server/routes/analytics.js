import express from 'express';
import { protect } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/analyticsController.js';
const r=express.Router(); r.use(protect); r.get('/', getAnalytics); export default r;