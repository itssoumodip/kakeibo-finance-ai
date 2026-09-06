import ChatSession from '../models/ChatSession.js';
import ChatMessage from '../models/ChatMessage.js';
import { chatWithTools } from '../services/ai/mistral.js';

export const listSessions = async (req,res)=>{
  const sessions = await ChatSession.find({ user:req.user._id }).sort({ updatedAt:-1 });
  res.json(sessions);
};
export const getSessionMessages = async (req,res)=>{
  const msgs = await ChatMessage.find({ session:req.params.id, user:req.user._id }).sort({ createdAt:1 });
  res.json(msgs);
};
export const sendMessage = async (req,res)=>{
  const t0 = Date.now();
  try {
    const { content, sessionId, clientId } = req.body;
    if (!content) return res.status(400).json({ message:'content required' });
    // Idempotent retry: if this clientId was already processed (client timed out
    // but the server finished), return the saved reply instead of re-running
    // the LLM + tools (which would double-log transactions).
    if (clientId) {
      const priorUser = await ChatMessage.findOne({ user:req.user._id, 'meta.clientId': clientId }).lean();
      if (priorUser) {
        const priorAi = await ChatMessage.findOne({
          user:req.user._id, session: priorUser.session, role:'assistant',
          createdAt: { $gte: priorUser.createdAt },
        }).sort({ createdAt: 1 }).lean();
        if (priorAi) {
          console.log(`[chat] deduped retry ${Date.now()-t0}ms`);
          return res.json({ sessionId: priorUser.session, userMessage: content, assistant: priorAi, ai: priorAi, deduped: true });
        }
      }
    }
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user:req.user._id });
      if (!session) return res.status(404).json({ message:'Session not found' });
    } else {
      session = await ChatSession.create({ user:req.user._id, title: content.slice(0,40) });
    }
    await ChatMessage.create({ session: session._id, user:req.user._id, role:'user', content, meta:{ ...(clientId ? { clientId } : {}) } });
    // build history for LLM: last 10 msgs
    const history = await ChatMessage.find({ session: session._id }).sort({ createdAt:-1 }).limit(10).lean();
    const messages = [...history].reverse().map(m=>({ role:m.role==='assistant'?'assistant':'user', content:m.content }));
    // ensure current user message is included (it is)
    // chatWithTools never throws on 429 (falls back locally), but guard anyway
    // so a failure can never escape as unhandledRejection + hung request.
    const ai = await chatWithTools({ userId: req.user._id, messages });
    const assistantMsg = await ChatMessage.create({ session: session._id, user:req.user._id, role:'assistant', content: ai.content, meta:{ toolCalls: ai.toolCalls } });
    session.updatedAt = new Date(); await session.save();
    console.log(`[chat] replied in ${Date.now()-t0}ms`);
    res.json({ sessionId: session._id, userMessage: content, assistant: assistantMsg, ai });
  } catch (e) {
    const s = `${e?.status || ''} ${e?.code || ''} ${e?.message || ''}`.toLowerCase();
    const rateLimited = e?.status === 429 || s.includes('429') || s.includes('rate limit');
    console.error('[chat] sendMessage failed:', e?.message || e);
    if (!res.headersSent) {
      res.status(rateLimited ? 429 : 500).json({
        message: rateLimited
          ? 'AI is rate-limited right now — please wait a minute and try again.'
          : 'Chat failed — please try again.',
        retryable: rateLimited,
      });
    }
  }
};