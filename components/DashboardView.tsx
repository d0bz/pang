'use client';

import React, { useState } from 'react';
import {
  Euro,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';

interface DashboardViewProps {
  summary: {
    totalBalance: number;
    youAreOwed: number;
    youOwe: number;
  };
  friends: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    balance: number;
  }>;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string | Date;
    payer: { id: string; name: string };
    group?: { id: string; name: string } | null;
    splits: Array<{ userId: string; amount: number; user: { name: string } }>;
  }>;
  currentUserId: string;
  onOpenAddExpense: () => void;
  onOpenSettleUp: (fromUserId?: string, toUserId?: string, amount?: number) => void;
  onSelectGroup: (groupId: string) => void;
  onEditExpense?: (expense: any) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export function DashboardView({
  summary,
  friends,
  recentExpenses,
  currentUserId,
  onOpenAddExpense,
  onOpenSettleUp,
  onSelectGroup,
  onEditExpense,
  onDeleteExpense,
}: DashboardViewProps) {
  const [mobileDebtTab, setMobileDebtTab] = useState<'owe' | 'owed'>('owe');

  const friendsYouOwe = friends.filter((f) => f.balance < -0.005);
  const friendsWhoOweYou = friends.filter((f) => f.balance > 0.005);

  const isPositive = summary.totalBalance > 0.005;
  const isNegative = summary.totalBalance < -0.005;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Summary of all shared expenses and active balances</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAddExpense}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 bg-splitwise-orange hover:bg-orange-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add expense</span>
          </button>

          <button
            onClick={() => onOpenSettleUp()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 bg-splitwise-teal hover:bg-teal-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95"
          >
            <Euro className="w-4 h-4 stroke-[2.5]" />
            <span>Settle up</span>
          </button>
        </div>
      </div>

      {/* 3-Stat Summary Box (Compact on Mobile, Card on Desktop) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Balance */}
        <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total</span>
            <span className="hidden sm:inline-block p-1 rounded-md bg-gray-100 text-gray-600">
              <Euro className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div
              className={`text-sm sm:text-2xl font-black tracking-tight truncate ${
                isPositive
                  ? 'text-splitwise-teal'
                  : isNegative
                  ? 'text-splitwise-orange'
                  : 'text-gray-700'
              }`}
            >
              {isPositive && `+€${summary.totalBalance.toFixed(2)}`}
              {isNegative && `-€${Math.abs(summary.totalBalance).toFixed(2)}`}
              {!isPositive && !isNegative && '€0.00'}
            </div>
            <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate hidden sm:block">
              {isPositive && 'overall you are owed'}
              {isNegative && 'overall you owe'}
              {!isPositive && !isNegative && 'settled up'}
            </p>
          </div>
        </div>

        {/* You Owe */}
        <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate text-splitwise-orange">You Owe</span>
            <span className="hidden sm:inline-block p-1 rounded-md bg-orange-50 text-splitwise-orange">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-black tracking-tight text-splitwise-orange truncate">
              €{summary.youOwe.toFixed(2)}
            </div>
            <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate hidden sm:block">
              to {friendsYouOwe.length} friends
            </p>
          </div>
        </div>

        {/* You Are Owed */}
        <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate text-splitwise-teal">You Are Owed</span>
            <span className="hidden sm:inline-block p-1 rounded-md bg-teal-50 text-splitwise-teal">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-black tracking-tight text-splitwise-teal truncate">
              €{summary.youAreOwed.toFixed(2)}
            </div>
            <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate hidden sm:block">
              from {friendsWhoOweYou.length} friends
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher between You Owe and You Are Owed */}
      <div className="sm:hidden flex rounded-xl bg-gray-200/70 p-1 text-xs font-bold">
        <button
          onClick={() => setMobileDebtTab('owe')}
          className={`flex-1 py-2 rounded-lg transition ${
            mobileDebtTab === 'owe'
              ? 'bg-white text-splitwise-orange shadow-xs font-extrabold'
              : 'text-gray-600'
          }`}
        >
          You Owe ({friendsYouOwe.length})
        </button>
        <button
          onClick={() => setMobileDebtTab('owed')}
          className={`flex-1 py-2 rounded-lg transition ${
            mobileDebtTab === 'owed'
              ? 'bg-white text-splitwise-teal shadow-xs font-extrabold'
              : 'text-gray-600'
          }`}
        >
          You Are Owed ({friendsWhoOweYou.length})
        </button>
      </div>

      {/* Split Details: YOU OWE vs YOU ARE OWED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: YOU OWE */}
        <div
          className={`bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden ${
            mobileDebtTab !== 'owe' ? 'hidden sm:block' : 'block'
          }`}
        >
          <div className="bg-gray-50/70 border-b border-gray-200/80 px-4 sm:px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-splitwise-orange"></div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                You Owe
              </h2>
            </div>
            <span className="text-xs font-semibold text-gray-400">
              {friendsYouOwe.length} {friendsYouOwe.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {friendsYouOwe.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs sm:text-sm font-medium text-gray-700">You don't owe anything!</p>
                <p className="text-[11px] text-gray-400 mt-0.5">All your debts are fully cleared.</p>
              </div>
            ) : (
              friendsYouOwe.map((friend) => (
                <div
                  key={friend.id}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between hover:bg-gray-50/60 transition"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <img
                      src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`}
                      alt={friend.name}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900">{friend.name}</h3>
                      <p className="text-[11px] sm:text-xs text-splitwise-orange font-bold">
                        you owe €{Math.abs(friend.balance).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenSettleUp(currentUserId, friend.id, Math.abs(friend.balance))}
                    className="text-xs font-bold text-splitwise-teal hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Settle up
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: YOU ARE OWED */}
        <div
          className={`bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden ${
            mobileDebtTab !== 'owed' ? 'hidden sm:block' : 'block'
          }`}
        >
          <div className="bg-gray-50/70 border-b border-gray-200/80 px-4 sm:px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-splitwise-teal"></div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                You Are Owed
              </h2>
            </div>
            <span className="text-xs font-semibold text-gray-400">
              {friendsWhoOweYou.length} {friendsWhoOweYou.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {friendsWhoOweYou.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-700">Nobody owes you money</p>
                <p className="text-[11px] text-gray-400 mt-0.5">When you pay for expenses, credits show here.</p>
              </div>
            ) : (
              friendsWhoOweYou.map((friend) => (
                <div
                  key={friend.id}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between hover:bg-gray-50/60 transition"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <img
                      src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`}
                      alt={friend.name}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900">{friend.name}</h3>
                      <p className="text-[11px] sm:text-xs text-splitwise-teal font-bold">
                        owes you €{friend.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenSettleUp(friend.id, currentUserId, friend.balance)}
                    className="text-xs font-bold text-splitwise-teal hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Settle up
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Recent Expenses</h2>
          </div>
          <span className="text-[11px] text-gray-400">Latest shared bills</span>
        </div>

        <div className="divide-y divide-gray-100">
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-xs sm:text-sm">
              No expenses recorded yet. Tap "Add expense" to get started!
            </div>
          ) : (
            recentExpenses.map((exp) => {
              const isPayer = exp.payer.id === currentUserId;
              const mySplit = exp.splits.find((s) => s.userId === currentUserId);
              const youLent = isPayer ? exp.amount - (mySplit?.amount ?? 0) : 0;
              const youBorrowed = !isPayer && mySplit ? mySplit.amount : 0;

              const formattedDate = new Date(exp.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={exp.id}
                  className="px-3.5 sm:px-5 py-3 flex items-center justify-between hover:bg-gray-50/70 transition"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-600 font-bold text-[10px] sm:text-xs uppercase leading-none border border-gray-200 flex-shrink-0">
                      <span>{formattedDate.split(' ')[0]}</span>
                      <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                        {formattedDate.split(' ')[1]}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {exp.description}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                        {exp.payer.name} paid €{exp.amount.toFixed(2)}
                        {exp.group && (
                          <span
                            onClick={() => exp.group && onSelectGroup(exp.group.id)}
                            className="text-splitwise-teal hover:underline ml-1 cursor-pointer font-medium"
                          >
                            • {exp.group.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-2">
                    <div className="text-right">
                      {isPayer && youLent > 0.005 && (
                        <div>
                          <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                            you lent
                          </span>
                          <span className="text-xs sm:text-sm font-black text-splitwise-teal">
                            €{youLent.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {!isPayer && youBorrowed > 0.005 && (
                        <div>
                          <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
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

                    {(onEditExpense || onDeleteExpense) && (
                      <div className="flex items-center gap-1">
                        {onEditExpense && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditExpense(exp);
                            }}
                            className="text-gray-400 hover:text-splitwise-teal p-1.5 rounded-md hover:bg-gray-100 transition"
                            title="Edit expense"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteExpense && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteExpense(exp.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
