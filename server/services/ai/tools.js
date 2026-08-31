export const financeTools = [
  {
    type: 'function',
    function: {
      name: 'createTransaction',
      description: 'Create a transaction when user describes spending/income/investment e.g. "Took Rapido bike for ₹120" or "Invested ₹500 in Nifty 50 SIP"',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in INR' },
          type: { type: 'string', enum: ['income','expense','investment'] },
          category: { type: 'string', description: 'Food, Transport, Bills, Shopping, Entertainment, Investment, Income etc' },
          subcategory: { type: 'string', description: 'Detailed subcategory e.g. Rapido Bike, Pizza, Nifty 50 SIP' },
          merchant: { type: 'string', description: 'Merchant name e.g. Rapido, Zomato, Uber' },
        },
        required: ['amount','type','category']
      }
    }
  },
  { type: 'function', function: { name: 'updateTransaction', description: 'Update a transaction by id', parameters: { type: 'object', properties: { id:{type:'string'}, amount:{type:'number'}, category:{type:'string'}, subcategory:{type:'string'} }, required:['id'] } } },
  { type: 'function', function: { name: 'deleteTransaction', description: 'Delete a transaction', parameters: { type:'object', properties:{ id:{type:'string'}}, required:['id'] } } },
  { type: 'function', function: { name: 'getTransactions', description: 'List transactions with filters', parameters: { type:'object', properties:{ type:{type:'string', enum:['income','expense','investment']}, category:{type:'string'}, search:{type:'string'}, limit:{type:'number'} } } } },
  { type: 'function', function: { name: 'getMonthlySummary', description: 'Get income/expenses/investments/available/savingsRate for a month YYYY-MM', parameters: { type:'object', properties:{ month:{type:'string', description:'YYYY-MM, defaults to current'} } } } },
  { type: 'function', function: { name: 'getCategorySpending', description: 'Spending breakdown by category for period', parameters: { type:'object', properties:{ from:{type:'string'}, to:{type:'string'} } } } },
  { type: 'function', function: { name: 'getMerchantSpending', description: 'Total spent at a merchant e.g. Rapido this month', parameters: { type:'object', properties:{ merchant:{type:'string'}, month:{type:'string'} }, required:['merchant'] } } },
  { type: 'function', function: { name: 'getBudgetStatus', description: 'Budget limits vs spent per category', parameters: { type:'object', properties:{ month:{type:'string'} } } } },
  { type: 'function', function: { name: 'getInvestmentSummary', description: 'Investment total, breakdown, history', parameters: { type:'object', properties:{ month:{type:'string'} } } } },
  { type: 'function', function: { name: 'getFinancialReport', description: 'Full monthly report with categories, biggest expenses, comparison', parameters: { type:'object', properties:{ month:{type:'string'} } } } },
];