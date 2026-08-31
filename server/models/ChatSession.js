import mongoose from 'mongoose';
const chatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New chat' },
}, { timestamps: true });
export default mongoose.model('ChatSession', chatSessionSchema);