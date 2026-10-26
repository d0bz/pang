'use client';

import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  splitType?: string;
  date: string | Date;
  notes?: string | null;
  payerId?: string;
  groupId?: string | null;
  payer: { id: string; name: string; avatarUrl?: string | null };
  group?: { id: string; name: string } | null;
  splits: Array<{
    id?: string;
    userId: string;
    amount: number;
    share?: number | null;
    user: { id?: string; name: string; avatarUrl?: string | null };
  }>;
}

interface AllExpensesViewProps {
  expenses: any[];
  currentUserId: string;
  onOpenAddExpense: () => void;
  onSelectGroup: (groupId: string) => void;
  onEditExpense: (expense: any) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function AllExpensesView({
  expenses,
  currentUserId,
  onOpenAddExpense,
  onSelectGroup,
  onEditExpense,
  onDeleteExpense,
}: AllExpensesViewProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const filtered = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === 'ALL' || e.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Expenses</h1>
          <p className="text-sm text-gray-500">Every bill recorded across all of your groups</p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="flex items-center gap-2 bg-splitwise-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add an expense</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-splitwise-teal"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Food & Drink">Food & Drink</option>
            <option value="Groceries">Groceries</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Travel">Travel</option>
            <option value="Entertainment">Entertainment</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Expenses Table/List */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 overflow-hidden divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic text-sm">
            No matching expenses found.
          </div>
        ) : (
          filtered.map((exp) => {
            const isPayer = (exp.payer?.id || exp.payerId) === currentUserId;
            const mySplit = exp.splits?.find((s: any) => s.userId === currentUserId);
            const youLent = isPayer ? exp.amount - (mySplit?.amount ?? 0) : 0;
            const youBorrowed = !isPayer && mySplit ? mySplit.amount : 0;
            const isExpanded = expandedExpenseId === exp.id;

            const formattedDate = new Date(exp.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div key={exp.id} className="transition overflow-hidden">
                <div
                  onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-gray-50/70 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200 flex-shrink-0">
                      <Receipt className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{exp.description}</h4>
                      <p className="text-xs text-gray-500 truncate">
                        {formattedDate} • {exp.payer?.name} paid €{exp.amount.toFixed(2)}
                        {exp.group && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectGroup(exp.group.id);
                            }}
                            className="text-splitwise-teal hover:underline ml-1 font-semibold"
                          >
                            • {exp.group.name}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 pl-2">
                    <div className="text-right">
                      {isPayer && youLent > 0.005 && (
                        <div>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                            you lent
                          </span>
                          <span className="text-sm font-black text-splitwise-teal">
                            €{youLent.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {!isPayer && youBorrowed > 0.005 && (
                        <div>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                            you borrowed
                          </span>
                          <span className="text-sm font-black text-splitwise-orange">
                            €{youBorrowed.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {(!isPayer || youLent <= 0.005) && (!mySplit || youBorrowed <= 0.005) && (
                        <span className="text-xs text-gray-400 italic">not involved</span>
                      )}
                    </div>

                    {/* Quick action buttons & Chevron */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditExpense(exp);
                        }}
                        className="text-gray-400 hover:text-splitwise-teal p-1 rounded hover:bg-gray-100 transition hidden sm:inline-flex"
                        title="Edit expense"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteExpense(exp.id);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition hidden sm:inline-flex"
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
                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/80 border-t border-gray-100 text-xs">
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
                          type="button"
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
                          type="button"
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

                    {exp.splits && exp.splits.length > 0 && (
                      <div>
                        <p className="font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">
                          Splits Breakdown:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2">
                          {exp.splits.map((s: any) => (
                            <div
                              key={s.id || s.userId}
                              className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200"
                            >
                              <span className="font-medium text-gray-800 truncate">
                                {s.user?.name || s.name || 'User'}
                              </span>
                              <span className="font-bold text-gray-900 ml-2">€{s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
