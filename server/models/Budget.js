import mongoose from 'mongoose';
const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true }, // Food, Transport, etc
  limit: { type: Number, required: true },
  month: { type: String, required: true }, // YYYY-MM  e.g. 2026-08
}, { timestamps: true });
budgetSchema.index({ user:1, month:1, category:1 }, { unique: true });
export default mongoose.model('Budget', budgetSchema);