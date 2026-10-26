'use client';

import React, { useState } from 'react';
import {
  Euro,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Sparkles,
  Receipt,
  CheckCircle2,
  Copy,
  Utensils,
  Home,
  Zap,
  Plane,
  ShoppingCart,
  Users,
  AlertTriangle,
  Pencil,
} from 'lucide-react';

interface GroupMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  iban?: string | null;
  role: string;
  netBalance: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  splitType: string;
  date: string | Date;
  notes?: string | null;
  payerId: string;
  payer: { id: string; name: string; avatarUrl?: string | null };
  splits: Array<{
    id: string;
    userId: string;
    amount: number;
    share?: number | null;
    user: { id: string; name: string; avatarUrl?: string | null };
  }>;
}

interface Settlement {
  id: string;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
  date: string | Date;
  fromUserId: string;
  toUserId: string;
  fromUser: { id: string; name: string; avatarUrl?: string | null };
  toUser: { id: string; name: string; avatarUrl?: string | null };
}

interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

interface GroupViewProps {
  group: {
    id: string;
    name: string;
    description?: string | null;
    category: string;
    simplifyDebts: boolean;
  };
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  debts: {
    simplified: SimplifiedDebt[];
    direct: Array<{
      fromUserId: string;
      fromUserName: string;
      toUserId: string;
      toUserName: string;
      amount: number;
    }>;
  };
  stats: {
    currentUserBalance: number;
    totalSpending: number;
    myTotalPaid: number;
    myTotalShare: number;
  };
  currentUserId: string;
  onOpenAddExpense: () => void;
  onOpenSettleUp: (fromUserId?: string, toUserId?: string, amount?: number) => void;
  onOpenAddMember: () => void;
  onOpenSmartCalculation: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditSettlement?: (settlement: Settlement) => void;
  onDeleteSettlement: (settlementId: string) => void;
  onToggleSimplifyDebts: (active: boolean) => void;
  onDeleteGroup?: (groupId: string) => Promise<void> | void;
  onToggleLock?: (locked: boolean) => void;
}

export function GroupView({
  group,
  members,
  expenses,
  settlements,
  debts,
  stats,
  currentUserId,
  onOpenAddExpense,
  onOpenSettleUp,
  onOpenAddMember,
  onOpenSmartCalculation,
  onEditExpense,
  onDeleteExpense,
  onEditSettlement,
  onDeleteSettlement,
  onDeleteGroup,
  onToggleLock,
}: GroupViewProps) {
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileGroupTab, setMobileGroupTab] = useState<'feed' | 'balances'>('feed');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDeleteGroup) return;
    setIsDeleting(true);
    try {
      await onDeleteGroup(group.id);
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food & drink':
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'rent':
      case 'home':
        return <Home className="w-4 h-4 text-emerald-500" />;
      case 'utilities':
        return <Zap className="w-4 h-4 text-indigo-500" />;
      case 'travel':
        return <Plane className="w-4 h-4 text-sky-500" />;
      case 'groceries':
        return <ShoppingCart className="w-4 h-4 text-green-500" />;
      default:
        return <Receipt className="w-4 h-4 text-splitwise-teal" />;
    }
  };

  const copySettlementSummary = () => {
    if (debts.simplified.length === 0) {
      navigator.clipboard.writeText(`All debts in ${group.name} are settled! 🎉`);
    } else {
      const summaryText = debts.simplified
        .map((d) => `• ${d.fromUserName} pays ${d.toUserName} €${d.amount.toFixed(2)}`)
        .join('\n');
      navigator.clipboard.writeText(`Settlement Plan for ${group.name}:\n${summaryText}`);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  type TimelineItem =
    | { type: 'expense'; data: Expense; date: Date }
    | { type: 'settlement'; data: Settlement; date: Date };

  const timelineItems: TimelineItem[] = [
    ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: new Date(e.date) })),
    ...settlements.map((s) => ({ type: 'settlement' as const, data: s, date: new Date(s.date) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const isOwedInGroup = stats.currentUserBalance > 0.005;
  const owesInGroup = stats.currentUserBalance < -0.005;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Group Header Banner */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {group.category}
              </span>
              {group.description && (
                <span className="text-xs text-gray-500 truncate max-w-xs">{group.description}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {group.name}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 5).map((m) => (
                  <img
                    key={m.userId}
                    src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                    alt={m.name}
                    title={m.name}
                    className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full ring-2 ring-white object-cover"
                  />
                ))}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-gray-500">
                {members.length} members
              </span>
              <button
                onClick={onOpenAddMember}
                className="text-[11px] sm:text-xs text-splitwise-teal hover:text-teal-700 font-bold flex items-center gap-0.5 ml-1 hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            {onToggleLock && (
              <button
                onClick={() => onToggleLock(!(group as any).locked)}
                className="flex items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-50 border border-gray-200 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition"
                title={(group as any).locked ? 'Unlock group' : 'Lock group (no new bills)'}
              >
                <span>{(group as any).locked ? '🔒 Unlock' : '🔓 Lock'}</span>
              </button>
            )}
            <button
              onClick={onOpenAddExpense}
              disabled={!!(group as any).locked}
              className="flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 bg-splitwise-orange hover:bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add bill</span>
            </button>

            <button
              onClick={() => onOpenSettleUp()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-splitwise-teal hover:bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95"
            >
              <Euro className="w-4 h-4 stroke-[2.5]" />
              <span>Settle up</span>
            </button>

            <button
              onClick={onOpenSmartCalculation}
              className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition"
              title="View Debt Simplification Details"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Smart Debts</span>
            </button>

            {onDeleteGroup && (
              <button
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="flex items-center justify-center gap-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition"
                title="Delete this group"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                <span className="hidden xl:inline">Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Current User Net Position Strip */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500">Your balance:</span>
            {isOwedInGroup && (
              <span className="text-xs sm:text-sm font-bold text-splitwise-teal bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                You are owed €{stats.currentUserBalance.toFixed(2)}
              </span>
            )}
            {owesInGroup && (
              <span className="text-xs sm:text-sm font-bold text-splitwise-orange bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                You owe €{Math.abs(stats.currentUserBalance).toFixed(2)}
              </span>
            )}
            {!isOwedInGroup && !owesInGroup && (
              <span className="text-xs sm:text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                All settled up!
              </span>
            )}
          </div>

          <div className="text-[11px] sm:text-xs text-gray-500">
            Total Group Spent: <strong className="text-gray-800">€{stats.totalSpending.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (Expenses vs Balances & Smart Debts) */}
      <div className="lg:hidden flex rounded-xl bg-gray-200/70 p-1 text-xs font-bold">
        <button
          onClick={() => setMobileGroupTab('feed')}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mobileGroupTab === 'feed'
              ? 'bg-white text-splitwise-teal shadow-xs font-extrabold'
              : 'text-gray-600'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Expenses ({timelineItems.length})</span>
        </button>
        <button
          onClick={() => setMobileGroupTab('balances')}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mobileGroupTab === 'balances'
              ? 'bg-white text-splitwise-teal shadow-xs font-extrabold'
              : 'text-gray-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Smart Debts & Balances</span>
        </button>
      </div>

      {/* Main Two-Column Layout (or switched by tabs on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Columns: Feed of Expenses and Settlements */}
        <div
          className={`lg:col-span-2 space-y-3 ${
            mobileGroupTab !== 'feed' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Expenses & Settlements</h2>
            <span className="text-xs text-gray-400">
              {timelineItems.length} {timelineItems.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {timelineItems.length === 0 ? (
            <div className="bg-white rounded-xl p-8 sm:p-10 border border-gray-200 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">No expenses yet</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Be the first to add a bill to start sharing expenses.
              </p>
              <button
                onClick={onOpenAddExpense}
                disabled={!!(group as any).locked}
                className="inline-flex disabled:opacity-50 items-center gap-2 bg-splitwise-teal text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-600 transition"
              >
                <Plus className="w-4 h-4" />
                Add an expense
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {timelineItems.map((item) => {
                if (item.type === 'settlement') {
                  const sett = item.data;
                  const formattedDate = item.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={sett.id}
                      className="bg-emerald-50/50 hover:bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between transition group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {sett.fromUser.name} paid {sett.toUser.name} €{sett.amount.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span className="font-medium text-emerald-700">
                              Payment ({sett.paymentMethod})
                            </span>
                            {sett.notes && <span className="truncate">• "{sett.notes}"</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2">
                        <span className="text-xs sm:text-sm font-black text-emerald-700">
                          €{sett.amount.toFixed(2)}
                        </span>
                        {onEditSettlement && (
                          <button
                            onClick={() => onEditSettlement(sett)}
                            className="text-gray-400 hover:text-splitwise-teal p-1.5 rounded-md hover:bg-emerald-100/60 transition"
                            title="Edit payment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteSettlement(sett.id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition"
                          title="Undo settlement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Expense Item
                const exp = item.data;
                const isExpanded = expandedExpenseId === exp.id;
                const isPayer = exp.payerId === currentUserId;
                const mySplit = exp.splits.find((s) => s.userId === currentUserId);
                const youLent = isPayer ? exp.amount - (mySplit?.amount ?? 0) : 0;
                const youBorrowed = !isPayer && mySplit ? mySplit.amount : 0;

                const formattedDate = item.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={exp.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                      className="p-3 sm:p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        {/* Date badge */}
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-600 font-bold text-[10px] sm:text-xs uppercase leading-none flex-shrink-0">
                          <span className="text-[9px] sm:text-[10px] text-gray-400">{formattedDate.split(' ')[0]}</span>
                          <span className="text-xs sm:text-sm font-black text-gray-900">
                            {formattedDate.split(' ')[1]}
                          </span>
                        </div>

                        {/* Category & Description */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="p-0.5 sm:p-1 rounded bg-gray-100 flex-shrink-0">{getCategoryIcon(exp.category)}</span>
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{exp.description}</h4>
                          </div>
                          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">
                            <strong className="text-gray-700">{exp.payer.name}</strong> paid €{exp.amount.toFixed(2)}
                            <span className="text-gray-400 ml-1 font-normal hidden sm:inline">
                              ({exp.splitType.toLowerCase()} split)
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right Amount & Status */}
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 pl-2">
                        <div className="text-right">
                          {isPayer && youLent > 0.005 && (
                            <div>
                              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                you lent
                              </span>
                              <span className="text-xs sm:text-sm font-black text-splitwise-teal">
                                €{youLent.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {!isPayer && youBorrowed > 0.005 && (
                            <div>
                              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                you borrowed
                              </span>
                              <span className="text-xs sm:text-sm font-black text-splitwise-orange">
                                €{youBorrowed.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {(!isPayer || youLent <= 0.005) && (!mySplit || youBorrowed <= 0.005) && (
                            <span className="text-[11px] text-gray-400 italic">not involved</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditExpense(exp);
                            }}
                            className="text-gray-400 hover:text-splitwise-teal p-1 rounded-md hover:bg-gray-100 transition hidden sm:inline-flex"
                            title="Edit expense"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteExpense(exp.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition hidden sm:inline-flex"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details breakdown */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gray-50/70 border-t border-gray-100 text-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 sm:mb-3 border-b border-gray-200/60">
                          <div>
                            <span className="font-semibold text-gray-700">Category: </span>
                            <span className="text-gray-600">{exp.category}</span>
                            {exp.notes && (
                              <p className="text-gray-500 italic mt-0.5">Note: "{exp.notes}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditExpense(exp);
                              }}
                              className="flex items-center gap-1 text-splitwise-teal hover:text-teal-700 font-semibold px-2.5 py-1 rounded-md hover:bg-teal-50 border border-teal-200 bg-white transition"
                              title="Edit expense"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteExpense(exp.id);
                              }}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold px-2.5 py-1 rounded-md hover:bg-red-50 border border-red-200 bg-white transition"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">
                          Splits Breakdown:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {exp.splits.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={
                                    s.user.avatarUrl ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.user.name}`
                                  }
                                  alt={s.user.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="font-medium text-gray-800 truncate">{s.user.name}</span>
                              </div>
                              <span className="font-bold text-gray-900 ml-2">€{s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Group Balances & Debt Simplification */}
        <div
          className={`space-y-4 sm:space-y-5 ${
            mobileGroupTab !== 'balances' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Debt Simplification Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800">
                  Smart Debts
                </h3>
              </div>
              <button
                onClick={onOpenSmartCalculation}
                className="text-xs text-splitwise-teal hover:underline font-bold"
              >
                Explain
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-gray-500 mb-3">
              Min-Cash-Flow algorithm reduces circular debt so you make the fewest payments.
            </p>

            <div className="space-y-2">
              {debts.simplified.length === 0 ? (
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-emerald-800">All Settled Up!</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">No outstanding debts in this group.</p>
                </div>
              ) : (
                debts.simplified.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs flex items-center justify-between hover:bg-gray-100/80 transition"
                  >
                    <div className="min-w-0 truncate pr-2">
                      <span className="font-bold text-gray-900">{d.fromUserName}</span>
                      <span className="text-gray-400 mx-1">pays</span>
                      <span className="font-bold text-gray-900">{d.toUserName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-splitwise-teal">€{d.amount.toFixed(2)}</span>
                      <button
                        onClick={() => onOpenSettleUp(d.fromUserId, d.toUserId, d.amount)}
                        className="text-[10px] bg-teal-50 hover:bg-teal-100 text-splitwise-teal border border-teal-200 px-2 py-1 rounded font-bold transition active:scale-95"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {debts.simplified.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment details</p>
                {Array.from(new Set(debts.simplified.map((d) => d.toUserId))).map((uid) => {
                  const m = members.find((x) => x.userId === uid);
                  if (!m) return null;
                  return (
                    <div key={uid} className="text-[11px] text-gray-700 flex items-center justify-between gap-2">
                      <span className="font-semibold">{m.name}</span>
                      {m.iban ? (
                        <button
                          onClick={() => navigator.clipboard.writeText(m.iban as string)}
                          title="Click to copy IBAN"
                          className="font-mono text-gray-900 hover:text-splitwise-teal truncate"
                        >
                          {m.iban.replace(/(.{4})/g, '$1 ').trim()}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">No IBAN added</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={copySettlementSummary}
                className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1.5"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied plan!' : 'Copy settlement plan'}</span>
              </button>

              <button
                onClick={onOpenSmartCalculation}
                className="text-xs text-splitwise-teal hover:underline font-bold"
              >
                Comparison
              </button>
            </div>
          </div>

          {/* Group Balances by Member */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800 mb-3">
              Group Balances
            </h3>

            <div className="divide-y divide-gray-100">
              {members.map((m) => {
                const isOwed = m.netBalance > 0.005;
                const owes = m.netBalance < -0.005;
                const isSelf = m.userId === currentUserId;

                return (
                  <div key={m.userId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                        alt={m.name}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-gray-800 block truncate">
                          {m.name} {isSelf && <span className="text-gray-400 font-normal">(you)</span>}
                        </span>
                        <span className="text-[10px] text-gray-400">{m.role}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      {isOwed && (
                        <span className="font-black text-splitwise-teal">
                          +€{m.netBalance.toFixed(2)}
                        </span>
                      )}
                      {owes && (
                        <span className="font-black text-splitwise-orange">
                          -€{Math.abs(m.netBalance).toFixed(2)}
                        </span>
                      )}
                      {!isOwed && !owes && <span className="text-gray-400 font-medium">settled</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Danger Zone */}
          {onDeleteGroup && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-red-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-gray-900">Delete this group</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    Permanently delete group, bills, and history
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-3 py-1.5 rounded-lg transition active:scale-95 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete group</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Group Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900">
                Delete "{group.name}"?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Are you sure you want to delete this group? All shared bills, split allocations, settlement records, and balances in this group will be permanently deleted.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>This action cannot be undone. Make sure all debts are settled before deleting.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
