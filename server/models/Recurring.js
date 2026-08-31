import mongoose from 'mongoose';
const recurringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // Netflix, Nifty 50 SIP
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income','expense','investment'], required: true },
  category: String,
  frequency: { type: String, enum: ['monthly','weekly','yearly'], default: 'monthly' },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Recurring', recurringSchema);