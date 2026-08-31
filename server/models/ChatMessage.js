import mongoose from 'mongoose';
const chatMessageSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
  meta: Object, // { transactionId, toolCalls }
}, { timestamps: true });
export default mongoose.model('ChatMessage', chatMessageSchema);