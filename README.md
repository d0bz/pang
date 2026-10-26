# Pang (Splitwise-style Bill Sharing App) 🧾💰

A full-stack bill sharing application built with Next.js 14, TypeScript, Tailwind CSS, Prisma ORM, and SQLite.

Features complete user authentication, groups, multi-payer bill splitting (Equal, Exact amounts, Percentages, Shares), Settle Up workflows with payment logging and confetti celebrations, and Pang's signature **Smart Debt Simplification** algorithm (min-cash-flow).

---

## 🌟 Key Features

1. **User Accounts & Instant Demo Account Switcher**:
   - Register or sign in with email and password.
   - 1-click **"Switch User"** top bar to toggle between Alice, Bob, Charlie, and Dana to test multi-user group balances and payments in real time.

2. **Groups & Categories**:
   - Create groups for **Apartments 🏠**, **Trips ✈️**, **Homes 🏡**, and **General 👥**.
   - Add members from existing users or invite new members by email.
   - Real-time group balances showing who is owed or owes money.

3. **Multi-Mode Bill Splitting Engine** (`lib/splits.ts`):
   - **Equal Split (`=`)**: Even division among selected members with automatic cent-rounding discrepancy handling.
   - **Exact Amounts (`$`)**: Assign specific dollar amounts per person with real-time balance validation.
   - **Percentages (`%`)**: Split by percentage with exact 100% sum verification and automatic cent rounding adjustment.
   - **Shares (`||`)**: Split by ratios/shares (e.g. 2 shares vs 1 share).

4. **Smart Debt Simplification ("Simplify Debts")** (`lib/simplifyDebts.ts`):
   - Greedy Minimum Cash Flow algorithm that eliminates circular/transitive debts (e.g., A owes B, B owes C, C owes A).
   - Reduces total transactions across the group to at most $N-1$ payments.
   - Interactive **Smart Debts** modal showing before-and-after comparison of direct vs simplified debts, metrics on payments saved, and a complete net balance ledger.
   - One-click **"Copy Settlement Plan"** formatted for WhatsApp/group chat.

5. **Settle Up Workflow**:
   - Record payments between any two users with prefilled debt amounts.
   - Supports Cash, Bank Transfer, PayPal, and Venmo methods.
   - Instant balance updates with celebratory confetti.

6. **Activity & Audit Feed**:
   - Real-time audit trail of every expense added, settlement recorded, or member joined.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js v20.19.2)
- npm

### 2. Run the App
The app is pre-built, seeded with demo data, and ready to run:

```bash
cd /src/agy/splitwise

# Start the production server on port 3000
PORT=3000 npm run start
```

Or for development with hot-reloading:
```bash
PORT=3000 npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧑‍🤝‍🧑 Demo Accounts (Pre-Seeded)

The database comes pre-seeded with realistic roommates and trip expenses:

| User | Email | Password | Role / Balances |
|------|-------|----------|-----------------|
| **Alice Chen** | `alice@example.com` | `password123` | Roommate / Creditor in Apartment |
| **Bob Smith** | `bob@example.com` | `password123` | Roommate in Apartment |
| **Charlie Brown** | `charlie@example.com` | `password123` | Roommate in Apartment |
| **Dana Scully** | `dana@example.com` | `password123` | Friend in Lake Tahoe Ski Trip |

*Use the demo buttons in the top navbar to instantly test any user's perspective!*

---

## 🛠️ Project Structure

```
splitwise/
├── app/
│   ├── api/
│   │   ├── auth/           # Login, register, logout, session, user switcher
│   │   ├── dashboard/      # Consolidated Splitwise dashboard & summaries
│   │   ├── expenses/       # Add & delete expenses with splits
│   │   ├── groups/         # Group CRUD, balances, & member management
│   │   ├── settlements/    # Record & undo payment settlements
│   │   └── users/          # Search & list users
│   ├── globals.css         # Tailwind styles & Splitwise color tokens
│   ├── layout.tsx          # Root layout & page metadata
│   └── page.tsx            # Main app shell & state coordinator
├── components/
│   ├── Navbar.tsx          # Top navigation & demo switcher
│   ├── Sidebar.tsx         # Dashboard, Activity, All Expenses, & Group list
│   ├── DashboardView.tsx   # 3-stat summary, You Owe vs You Are Owed lists
│   ├── GroupView.tsx       # Group ledger, timeline, & simplified debts card
│   ├── AddExpenseModal.tsx # Multi-split modal (Equal, Exact, %, Shares)
│   ├── SettleUpModal.tsx   # Payment recording modal with confetti
│   ├── SmartCalculationModal.tsx # Before/after debt simplification & share
│   ├── CreateGroupModal.tsx# Create group with category & members
│   ├── AddMemberModal.tsx  # Add new members by contact or email
│   ├── ActivityView.tsx    # Chronological event audit log
│   ├── AllExpensesView.tsx # Searchable and filterable bills list
│   └── AuthModal.tsx       # Login & signup modal
├── lib/
│   ├── auth.ts             # Password hashing & session cookies
│   ├── prisma.ts           # Prisma SQLite singleton
│   ├── simplifyDebts.ts    # Minimum Cash Flow debt simplification algorithm
│   └── splits.ts           # Splitting calculation & cent-rounding handlers
├── prisma/
│   ├── schema.prisma       # Database schema (User, Group, Expense, Split, Settlement, Activity)
│   └── seed.ts             # Realistic demo dataset
└── tailwind.config.ts      # Authentic Splitwise color palette
```

---

## 🧮 Debt Simplification Algorithm

Splitwise's famous **Debt Simplification** feature solves the circular debt problem.
For example, in a group of 3:
- Alice paid $2,400 for Rent (Bob owes $800, Charlie owes $800)
- Bob paid $90 for Wifi (Alice owes $30, Charlie owes $30)
- Charlie paid $120 for Groceries (Alice owes $40, Bob owes $40)

Without simplification, 6 pairwise transactions are generated.

The **Min-Cash-Flow Greedy Algorithm** in `lib/simplifyDebts.ts`:
1. Computes the exact net balance of every participant:
   $$\text{Net Balance}_i = \sum \text{Paid}_i - \sum \text{Owed}_i$$
2. Partitions users into **Creditors** ($\text{Net} > 0$) and **Debtors** ($\text{Net} < 0$).
3. Greedily pairs the largest debtor with the largest creditor:
   $$\text{Settlement} = \min(\text{Creditor Balance}, |\text{Debtor Balance}|)$$
4. Decrements both balances and repeats until all balances reach $\$0.00$.

Result: All debts are settled in at most $N - 1$ payments, eliminating circular payments.
