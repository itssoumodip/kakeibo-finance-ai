import mongoose from 'mongoose';
const txSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true }, // always positive, type decides sign
  type: { type: String, enum: ['income','expense','investment'], required: true },
  category: { type: String, required: true }, // Food, Transport, Bills, Shopping, Entertainment, Investment, Income
  subcategory: String, // Pizza, Rapido Bike, Nifty 50 SIP
  merchant: String, // Rapido, Zomato, Uber
  paymentMethod: { type: String, default: 'UPI' },
  date: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });
txSchema.index({ user:1, date:-1 });
txSchema.index({ user:1, category:1 });
export default mongoose.model('Transaction', txSchema);