import Transaction from '../models/Transaction.js';

export const listTransactions = async (req, res) => {
  const { type, category, search, from, to, page=1, limit=50 } = req.query;
  const q = { user: req.user._id };
  if (type && type !== 'All') q.type = type.toLowerCase();
  if (category) q.category = category;
  if (search) q.$or = [
    { merchant: { $regex: search, $options: 'i' } },
    { category: { $regex: search, $options: 'i' } },
    { subcategory: { $regex: search, $options: 'i' } },
  ];
  if (from || to) q.date = {};
  if (from) q.date.$gte = new Date(from);
  if (to) q.date.$lte = new Date(to);
  const docs = await Transaction.find(q).sort({ date: -1 }).limit(Number(limit)).skip((Number(page)-1)*Number(limit));
  const total = await Transaction.countDocuments(q);
  res.json({ transactions: docs, total });
};

export const createTransaction = async (req, res) => {
  const { amount, type, category, subcategory, merchant, paymentMethod, date, notes } = req.body;
  if (!amount || !type || !category) return res.status(400).json({ message: 'amount/type/category required' });
  const doc = await Transaction.create({
    user: req.user._id, amount: Number(amount), type, category, subcategory, merchant: merchant || subcategory || category,
    paymentMethod, date: date ? new Date(date) : new Date(), notes
  });
  res.status(201).json(doc);
};

export const updateTransaction = async (req, res) => {
  const doc = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  Object.assign(doc, req.body);
  if (req.body.amount) doc.amount = Number(req.body.amount);
  await doc.save();
  res.json(doc);
};

export const deleteTransaction = async (req, res) => {
  const doc = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
};