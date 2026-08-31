import Transaction from '../models/Transaction.js';
import { getMonthlySummary } from './analyticsController.js';

export const getReport = async (req, res) => {
  const month = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const summary = await getMonthlySummary(req.user._id, month);
  const start = new Date(month + '-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
  const byCategory = await Transaction.aggregate([
    { $match:{ user:req.user._id, type:'expense', date:{ $gte:start, $lt:end } } },
    { $group:{ _id:'$category', total:{$sum:'$amount'} } },
    { $sort:{ total:-1 } }
  ]);
  const biggest = await Transaction.find({ user:req.user._id, type:'expense', date:{ $gte:start, $lt:end } }).sort({ amount:-1 }).limit(5);
  // comparison with previous month
  const prev = new Date(start); prev.setMonth(prev.getMonth()-1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
  const prevSummary = await getMonthlySummary(req.user._id, prevMonth);
  res.json({ month, summary: { ...summary, savingsRate: summary.income? Math.round((summary.available/summary.income*100)*10)/10:0 }, categories: byCategory, biggestExpenses: biggest, comparison: { prevMonth, prevSummary } });
};

export const exportCsv = async (req, res) => {
  const tx = await Transaction.find({ user:req.user._id }).sort({ date:-1 }).lean();
  const header = 'date,type,category,subcategory,merchant,amount,paymentMethod,notes\n';
  const rows = tx.map(t=> `${t.date.toISOString().slice(0,10)},${t.type},${t.category},${t.subcategory||''},${t.merchant||''},${t.amount},${t.paymentMethod||''},"${(t.notes||'').replace(/"/g,'""')}"`).join('\n');
  res.header('Content-Type','text/csv').header('Content-Disposition','attachment; filename="transactions.csv"').send(header+rows);
};

export const exportExcel = async (req, res) => {
  const XLSX = await import('xlsx');
  const tx = await Transaction.find({ user:req.user._id }).sort({ date:-1 }).lean();
  const ws = XLSX.utils.json_to_sheet(tx.map(t=>({ Date:t.date.toISOString().slice(0,10), Type:t.type, Category:t.category, Subcategory:t.subcategory, Merchant:t.merchant, Amount:t.amount, Payment:t.paymentMethod, Notes:t.notes })));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  res.header('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition','attachment; filename="transactions.xlsx"').send(buf);
};