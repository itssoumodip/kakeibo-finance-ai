import Transaction from '../models/Transaction.js';

export const getAnalytics = async (req, res) => {
  const range = req.query.range || '30D'; // 7D,30D,3M,6M,1Y
  const now = new Date();
  let from = new Date(now);
  if (range==='7D') from.setDate(now.getDate()-7);
  else if (range==='30D') from.setDate(now.getDate()-30);
  else if (range==='3M') from.setMonth(now.getMonth()-3);
  else if (range==='6M') from.setMonth(now.getMonth()-6);
  else if (range==='1Y') from.setFullYear(now.getFullYear()-1);
  else from.setDate(now.getDate()-30);

  const matchBase = { user: req.user._id, date: { $gte: from, $lte: now } };

  const [incomeAgg, expenseAgg, categoryAgg, merchantAgg, spendingOverTime] = await Promise.all([
    Transaction.aggregate([{ $match: { ...matchBase, type:'income' } }, { $group:{_id:null, total:{$sum:'$amount'}}} ]),
    Transaction.aggregate([{ $match: { ...matchBase, type:'expense' } }, { $group:{_id:null, total:{$sum:'$amount'}}} ]),
    Transaction.aggregate([{ $match: { ...matchBase, type:'expense' } }, { $group:{_id:'$category', total:{$sum:'$amount'}}}, { $sort:{ total:-1}} ]),
    Transaction.aggregate([{ $match: { ...matchBase } }, { $group:{_id:'$merchant', total:{$sum:'$amount'}, count:{$sum:1}}}, { $sort:{ total:-1}}, { $limit:5}]),
    Transaction.aggregate([
      { $match: { ...matchBase, type:'expense' } },
      { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$date' } }, total:{$sum:'$amount'} } },
      { $sort:{ _id:1 } }
    ]),
  ]);

  const income = incomeAgg[0]?.total || 0;
  const expenses = expenseAgg[0]?.total || 0;
  const savingsRate = income ? ((income - expenses - (await investmentTotal(req.user._id, from, now))) / income * 100) : 0;

  // 6-month monthly buckets for spending trend
  const sixFrom = new Date(now); sixFrom.setMonth(now.getMonth()-5); sixFrom.setDate(1);
  const monthly = await Transaction.aggregate([
    { $match: { user: req.user._id, type:'expense', date:{ $gte: sixFrom } } },
    { $group:{ _id:{ $dateToString:{ format:'%Y-%m', date:'$date'}}, total:{$sum:'$amount'} } },
    { $sort:{ _id:1 } }
  ]);

  res.json({
    income, expenses,
    investments: await investmentTotal(req.user._id, from, now),
    savingsRate: Math.round(savingsRate*10)/10,
    categoryBreakdown: categoryAgg.map(c=>({ category:c._id, amount:c.total })),
    topMerchants: merchantAgg.map(m=>({ merchant:m._id, amount:m.total })),
    spendingOverTime: spendingOverTime.map(s=>({ date:s._id, amount:s.total })),
    monthlyTrend: monthly.map(m=>({ month:m._id, total:m.total })),
  });
};

async function investmentTotal(userId, from, to) {
  const a = await Transaction.aggregate([{ $match:{ user:userId, type:'investment', date:{ $gte: from, $lte: to } } }, { $group:{_id:null, total:{$sum:'$amount'}}} ]);
  return a[0]?.total || 0;
}

export const getMonthlySummary = async (userId, monthStr) => {
  const start = new Date(monthStr + '-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
  const agg = await Transaction.aggregate([
    { $match:{ user:userId, date:{ $gte:start, $lt:end } } },
    { $group:{ _id:'$type', total:{$sum:'$amount'} } }
  ]);
  const map = Object.fromEntries(agg.map(a=>[a._id,a.total]));
  return { income: map.income||0, expenses: map.expense||0, investments: map.investment||0, available: (map.income||0)-(map.expense||0)-(map.investment||0) };
};