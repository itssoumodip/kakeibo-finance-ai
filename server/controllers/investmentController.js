import Transaction from '../models/Transaction.js';

export const listInvestments = async (req, res) => {
  const { month } = req.query;
  const m = month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const start = new Date(m + '-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
  const docs = await Transaction.find({ user: req.user._id, type: 'investment', date: { $gte: start, $lt: end } }).sort({ date: -1 });
  const total = docs.reduce((s,d)=>s+d.amount,0);
  const breakdown = {};
  docs.forEach(d => { const k = d.subcategory || d.merchant || 'Other'; breakdown[k]=(breakdown[k]||0)+d.amount; });
  res.json({ month: m, total, investments: docs, breakdown: Object.entries(breakdown).map(([label, amount])=>({ label, amount })) });
};

export const investmentHistory = async (req, res) => {
  const docs = await Transaction.find({ user: req.user._id, type: 'investment' }).sort({ date: -1 }).limit(20);
  res.json(docs);
};