import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const currentMonth = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};

export const listBudgets = async (req, res) => {
  const month = req.query.month || currentMonth();
  const budgets = await Budget.find({ user: req.user._id, month });
  // compute spent per category
  const start = new Date(month + '-01T00:00:00.000Z');
  const end = new Date(start); end.setMonth(end.getMonth()+1);
  const agg = await Transaction.aggregate([
    { $match: { user: req.user._id, type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } }
  ]);
  const spentMap = Object.fromEntries(agg.map(a => [a._id, a.spent]));
  const totalLimit = budgets.reduce((s,b)=>s+b.limit,0);
  const totalSpent = Object.values(spentMap).reduce((s,v)=>s+v,0);
  res.json({ month, budgets: budgets.map(b=>({ ...b.toObject(), spent: spentMap[b.category]||0, remaining: b.limit-(spentMap[b.category]||0) })), total: { limit: totalLimit, spent: totalSpent, pct: totalLimit? Math.round(totalSpent/totalLimit*100):0 } });
};

export const upsertBudget = async (req, res) => {
  const { category, limit, month } = req.body;
  if (!category || limit==null) return res.status(400).json({ message: 'category/limit required' });
  const m = month || currentMonth();
  const doc = await Budget.findOneAndUpdate({ user: req.user._id, category, month: m }, { limit: Number(limit) }, { upsert: true, new: true });
  res.json(doc);
};

export const deleteBudget = async (req, res) => {
  await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
};