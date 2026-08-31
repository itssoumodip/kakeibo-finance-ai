# KAKEIBO — AI Financial Assistant 💰 (家計簿)

> **Talk to your money. Understand your money. Control your money.**

Modern Gen-Z personal finance app with neumorphic premium UI + Mistral AI chat that logs transactions from plain English.

![Vite](https://img.shields.io/badge/Vite-8.x-646CFF) ![React](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248) ![Mistral](https://img.shields.io/badge/AI-Mistral-ff6b00)

---

## ✨ Features

- **AI Chat** — `Took Rapido for ₹120` → auto `expense/Transport/Rapido Bike`, `Invested ₹500 in Nifty 50 SIP` → investment, `Where did my money go?` → real aggregates. Voice 🎙️ + document 📎 (PDF/CSV/image).
- **Dashboard** — Available balance, income/spent/invested, 7D/30D/3M chart, category bars, recent activity (live `moneyy`).
- **Transactions** — search, filters (All/Income/Expenses/Investments), edit/delete, `+ Add`, recurring toggles.
- **Budgets** — donut 70% + category breakdown with edit/delete, `+ New budget`, AI insight.
- **Investments** — total, rate `total/income`, allocation, history, `1W/1M/1Y`.
- **Analytics** — savings rate, income vs expenses, 6-mo trend, composition donut, top merchants, category comparison (filters 7D-1Y).
- **Reports** — monthly snapshot + CSV/Excel export (`xlsx`), month picker, comparison.
- **Auth** — JWT register/login, forgot/reset via token (dev returns token), change password, protected routes.
- **UI** — neumorphic subtle shadows, pastel accents, Geist font, GSAP 0.22s page/stagger, dark mode (persisted), fully responsive (sidebar → bottom nav).

## 🖥️ Demo

- Login: `demo@moneyy.app / demo123` (empty after wipe — add via AI chat)
- Try: `Took Rapido for ₹180` → `Had pizza for ₹550` → `Where am I spending too much?`

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Vite, React Router v7, Tailwind 3.4, Recharts, Lucide, GSAP, Context (Auth/Theme) |
| Backend | Node 22 + Express 4, Mongoose 8, JWT + bcryptjs, `express-rate-limit`, `zod` validation |
| DB | MongoDB Atlas (`moneyy` DB → `users/transactions/budgets/recurrings/chatsessions/chatmessages`) |
| AI | Mistral (`@mistralai/mistralai` `mistral-small-latest`, tool-calling 10 finance tools, fallback parser) |

## 📁 Structure

```
moneyy-app/
├── src/
│   ├── pages/          Overview, TransactionsPage, BudgetsPage, InvestmentsPage, AnalyticsPage, AssistantPage, ReportsPage, SettingsPage + Login/Register/ForgotPassword
│   ├── components/layout/ Sidebar, Header
│   ├── components/ui/  Card
│   ├── context/        AuthContext, ThemeContext (dark persisted)
│   ├── services/api.ts  fetch wrapper (Bearer)
│   ├── data/demo.ts     fallback demo only when no token
│   ├── utils/gsap.ts    pageIn 0.22s + stagger
│   └── App.tsx          RequireAuth + Routes
├── server/
│   ├── server.js        Express + CORS + rate limit + health
│   ├── config/db.js     mongoose + Google DNS + retry
│   ├── models/          User, Transaction, Budget, Recurring, ChatSession/Message
│   ├── routes/          auth, transactions, categories, budgets, investments, analytics, reports, recurring, chat
│   ├── controllers/     auth (register/login/me/change-password/forgot/reset), finance, chat
│   ├── services/ai/     tools.js (10), mistral.js (tool loop), openai.js shim
│   └── .env.example
└── .env.example
```

## 🚀 Quick Start

**Prereqs:** Node 20+, MongoDB Atlas (or local `mongod`), Mistral key (optional — fallback works)

```bash
# 1. clone
git clone <repo> && cd moneyy-app

# 2. backend
cd server
cp .env.example .env
# edit .env → MONGODB_URI, JWT_SECRET (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"), MISTRAL_API_KEY
npm install
npm run dev          # http://localhost:5000  (health: /api/health)

# 3. frontend (new terminal)
cd ..
cp .env.example .env  # VITE_API_URL=http://localhost:5000
npm install
npm run dev          # http://localhost:5173 or :5174
# Register → Login → AI chat
```

**Env — `server/.env`:**
```ini
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.ntl9m.mongodb.net/moneyy?retryWrites=true&w=majority
JWT_SECRET=replace-with-32-char-hex
JWT_EXPIRES_IN=7d
MISTRAL_API_KEY=... # https://console.mistral.ai/api-keys
MISTRAL_MODEL=mistral-small-latest
FRONTEND_URL=http://localhost:5173,http://localhost:5174
NODE_ENV=development
```

**` .env` (frontend):**
```ini
VITE_API_URL=http://localhost:5000
```

## 🔌 API

All finance routes require `Authorization: Bearer <JWT>`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | `{name,email,password}` → `token,user` |
| `POST` | `/api/auth/login` | `{email,password}` → `token,user` |
| `GET` | `/api/auth/me` | current user |
| `PATCH` | `/api/auth/me` | `{name}` |
| `POST` | `/api/auth/change-password` | `{currentPassword,newPassword}` |
| `POST` | `/api/auth/forgot-password` | `{email}` → `resetToken` (dev) |
| `POST` | `/api/auth/reset-password` | `{token,password}` |
| `GET` | `/api/transactions?type=&search=&limit=` | list |
| `POST` | `/api/transactions` | `{amount,type,category,subcategory,merchant}` |
| `PATCH` | `/api/transactions/:id` | update |
| `DELETE` | `/api/transactions/:id` | delete |
| `GET` | `/api/categories` | distinct categories |
| `GET` | `/api/budgets?month=YYYY-MM` | + spent/remaining |
| `POST` | `/api/budgets` | `{category,limit,month}` upsert |
| `DELETE` | `/api/budgets/:id` | delete |
| `GET` | `/api/investments?month=` | + breakdown |
| `GET` | `/api/analytics?range=7D|30D|3M|6M|1Y` | income/expenses/savings/category/merchants/trend |
| `GET` | `/api/reports?month=YYYY-MM` | summary + categories + comparison |
| `GET` | `/api/reports/export/csv` | download |
| `GET` | `/api/reports/export/excel` | download |
| `GET` | `/api/recurring` | list |
| `POST` | `/api/recurring` | create |
| `PATCH` | `/api/recurring/:id` | toggle |
| `GET` | `/api/chat/sessions` | list |
| `GET` | `/api/chat/sessions/:id/messages` | history |
| `POST` | `/api/chat` | `{content,sessionId}` → Mistral + 10 tools |

**Mistral tools (server never lets LLM touch DB directly):** `createTransaction`, `updateTransaction`, `deleteTransaction`, `getTransactions`, `getMonthlySummary`, `getCategorySpending`, `getMerchantSpending`, `getBudgetStatus`, `getInvestmentSummary`, `getFinancialReport`.

## 🎨 Design

Gen-Z + premium neumorphic (soft raised/inset, 24px radius, pill buttons, `Geist` font). Light `warm off-white #fcf9f8` / dark `charcoal #121214`, pastel `mint/coral/lavender/sky`, GSAP `0.22s` pageIn.

## 🛠️ Scripts

```bash
# frontend
npm run dev      # Vite
npm run build    # tsc -b && vite build
npm run preview

# backend
npm run dev      # node --watch server.js
npm start        # node server.js
```

## 📦 Deploy

- **Frontend:** Vercel/Netlify — set `VITE_API_URL` to deployed API
- **Backend:** Render/Fly/Atlas — set `MONGODB_URI`, `JWT_SECRET`, `MISTRAL_API_KEY`, `FRONTEND_URL`
- **DB:** Atlas → `moneyy` (or `kakeibo`) auto-created on first register

## 🔐 Notes

- Collections live only after first write — `Browse Collections → moneyy` appears after Register + one transaction.
- Demo user is empty after wipe — start fresh via `Register`.
- Voice uses Web Speech API (Chrome), document attach is preview + name sent to Mistral (extend to `multer` + `xlsx` parse for CSV import).

## 📝 License

MIT — built for portfolio. PRs welcome.

---
**Kakeibo (家計簿)** — *Talk to your money.* — Japanese budgeting, Gen-Z AI.
