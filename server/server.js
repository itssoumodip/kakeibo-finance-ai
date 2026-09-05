import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import txRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import budgetRoutes from './routes/budgets.js';
import investmentRoutes from './routes/investments.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
import recurringRoutes from './routes/recurring.js';
import chatRoutes from './routes/chat.js';
import { notFound, errorHandler } from './middleware/error.js';

// prevent ECONNRESET crash — log and keep running
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason?.message || reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err.message));

const app = express();

const allowed = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',').map(s=>s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin) || allowed.includes('*') || origin.includes('localhost')) return cb(null, true);
    return cb(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60*1000, max: 200, standardHeaders: true }));

app.get('/api/health', (req,res)=>{
  const states = ['disconnected','connected','connecting','disconnecting'];
  res.json({
    ok:true,
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    db: states[req.app.get('mongoose')?.connection?.readyState ?? 0] || 'unknown',
  });
});
app.get('/', (req,res)=>res.json({ name:'Moneyy API', version:'1.0.0', health:'/api/health' }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', txRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/chat', chatRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (!process.env.MONGODB_URI) console.warn('⚠ MONGODB_URI not set - Copy server/.env.example -> server/.env');
if (!process.env.JWT_SECRET) console.warn('⚠ JWT_SECRET not set - auth will fail. Set in server/.env');

import mongoose from 'mongoose';
app.set('mongoose', mongoose);

let server;
// Listen immediately so /api/health responds even while DB retries in background.
// Previously the server never listened until Mongo connected, so the frontend
// just hung (looked like "slow loading") on any DB outage.
server = app.listen(PORT, ()=> console.log(`✅ Moneyy server on :${PORT}  (health: /api/health)`));
connectDB().then(()=> {
  console.log('✅ DB ready — API fully operational');
}).catch(e=>{
  console.error('❌ DB connect failed after retries:', e.message);
  console.error('   → API is up but DB routes will fail until Mongo connects.');
  console.error('   → Most likely: Atlas Network Access IP whitelist. Add your IP or 0.0.0.0/0.');
});

// graceful shutdown
process.on('SIGINT', async()=>{ console.log('SIGINT — closing'); try{ await server?.close(); }catch{} process.exit(0); });

export default app;
