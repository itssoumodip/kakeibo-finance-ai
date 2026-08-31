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
  const { content, sessionId } = req.body;
  if (!content) return res.status(400).json({ message:'content required' });
  let session;
  if (sessionId) {
    session = await ChatSession.findOne({ _id: sessionId, user:req.user._id });
    if (!session) return res.status(404).json({ message:'Session not found' });
  } else {
    session = await ChatSession.create({ user:req.user._id, title: content.slice(0,40) });
  }
  await ChatMessage.create({ session: session._id, user:req.user._id, role:'user', content });
  // build history for LLM: last 10 msgs
  const history = await ChatMessage.find({ session: session._id }).sort({ createdAt:-1 }).limit(10).lean();
  const messages = [...history].reverse().map(m=>({ role:m.role==='assistant'?'assistant':'user', content:m.content }));
  // ensure current user message is included (it is)
  const ai = await chatWithTools({ userId: req.user._id, messages });
  const assistantMsg = await ChatMessage.create({ session: session._id, user:req.user._id, role:'assistant', content: ai.content, meta:{ toolCalls: ai.toolCalls } });
  session.updatedAt = new Date(); await session.save();
  res.json({ sessionId: session._id, userMessage: content, assistant: assistantMsg, ai });
};