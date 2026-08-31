import express from 'express';
import { protect } from '../middleware/auth.js';
import { listSessions, getSessionMessages, sendMessage } from '../controllers/chatController.js';
const r = express.Router(); r.use(protect);
r.get('/sessions', listSessions);
r.get('/sessions/:id/messages', getSessionMessages);
r.post('/', sendMessage);
export default r;