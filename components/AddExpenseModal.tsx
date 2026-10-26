'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Euro,
  Calendar,
  Tag,
  Users,
  Check,
  Percent,
  Sliders,
  AlertCircle,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { SplitType, calculateSplits } from '@/lib/splits';

interface GroupItem {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
}

export interface ExpenseItem {
  id: string;
  groupId?: string | null;
  payerId: string;
  description: string;
  amount: number;
  category: string;
  splitType: string;
  date: string | Date;
  notes?: string | null;
  payer?: { id: string; name: string; avatarUrl?: string | null };
  splits?: Array<{
    userId: string;
    amount: number;
    share?: number | null;
    user?: { id?: string; name: string; avatarUrl?: string | null };
  }>;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupItem[];
  defaultGroupId?: string | null;
  currentUserId: string;
  onExpenseAdded: () => void;
  expenseToEdit?: ExpenseItem | null;
  onDeleteExpense?: (expenseId: string) => Promise<void> | void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  currentUserId,
  onExpenseAdded,
  expenseToEdit,
  onDeleteExpense,
}: AddExpenseModalProps) {
  const [groupId, setGroupId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('Food & Drink');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');

  // Participants array for current selected group
  const [participants, setParticipants] = useState<
    Array<{
      userId: string;
      name: string;
      avatarUrl?: string | null;
      included: boolean;
      value: number; // exact amount, percentage, or shares
    }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize modal state whenever it is opened or when expenseToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      const targetGroupId = expenseToEdit.groupId || defaultGroupId || groups[0]?.id || '';
      setGroupId(targetGroupId);
      setDescription(expenseToEdit.description || '');
      setAmount(expenseToEdit.amount != null ? expenseToEdit.amount.toString() : '');
      setCategory(expenseToEdit.category || 'Food & Drink');
      setDate(
        expenseToEdit.date
          ? new Date(expenseToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNotes(expenseToEdit.notes || '');
      setPayerId(expenseToEdit.payerId || currentUserId);
      const st = (expenseToEdit.splitType as SplitType) || 'EQUAL';
      setSplitType(st);

      const targetGroup = groups.find((g) => g.id === targetGroupId);
      if (targetGroup && targetGroup.members) {
        setParticipants(
          targetGroup.members.map((m) => {
            const existingSplit = expenseToEdit.splits?.find((s: any) => s.userId === m.id);
            const included = !!existingSplit;
            let val = 1;
            if (st === 'EXACT') {
              val = existingSplit ? existingSplit.amount : 0;
            } else if (st === 'PERCENT') {
              val = existingSplit
                ? (existingSplit.share ??
                    Math.round((existingSplit.amount / (expenseToEdit.amount || 1)) * 100))
                : 0;
            } else if (st === 'SHARES') {
              val = existingSplit ? (existingSplit.share ?? 1) : 1;
            }
            return {
              userId: m.id,
              name: m.name,
              avatarUrl: m.avatarUrl,
              included,
              value: val,
            };
          })
        );
      }
    } else {
      const targetGroupId = defaultGroupId || groups[0]?.id || '';
      setGroupId(targetGroupId);
      setDescription('');
      setAmount('');
      setCategory('Food & Drink');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setPayerId(currentUserId);
      setSplitType('EQUAL');

      const targetGroup = groups.find((g) => g.id === targetGroupId);
      if (targetGroup && targetGroup.members) {
        setParticipants(
          targetGroup.members.map((m) => ({
            userId: m.id,
            name: m.name,
            avatarUrl: m.avatarUrl,
            included: true,
            value: 1,
          }))
        );
      }
    }
  }, [isOpen, expenseToEdit, defaultGroupId, groups, currentUserId]);

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    const selectedGroup = groups.find((g) => g.id === newGroupId);
    if (selectedGroup && selectedGroup.members) {
      setParticipants(
        selectedGroup.members.map((m) => ({
          userId: m.id,
          name: m.name,
          avatarUrl: m.avatarUrl,
          included: true,
          value: splitType === 'PERCENT' ? Math.round(100 / selectedGroup.members.length) : 1,
        }))
      );
      if (!selectedGroup.members.some((m) => m.id === payerId)) {
        setPayerId(selectedGroup.members[0]?.id || currentUserId);
      }
    }
  };

  const handleSplitTypeChange = (newSplitType: SplitType) => {
    setSplitType(newSplitType);
    const includedCount = participants.filter((p) => p.included).length || 1;
    const currentNumAmount = parseFloat(amount) || 0;

    setParticipants((prev) =>
      prev.map((p) => {
        let val = p.value;
        if (newSplitType === 'PERCENT') {
          val = p.included ? Math.round(100 / includedCount) : 0;
        } else if (newSplitType === 'EXACT') {
          val = p.included ? Math.round((currentNumAmount / includedCount) * 100) / 100 : 0;
        } else if (newSplitType === 'SHARES') {
          val = p.included ? 1 : 0;
        } else {
          val = 1;
        }
        return { ...p, value: val };
      })
    );
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const splitCalc = calculateSplits(numAmount, splitType, participants);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description for the expense');
      return;
    }

    if (!splitCalc.valid) {
      setError(splitCalc.error || 'Please correct the split values');
      return;
    }

    setLoading(true);

    try {
      const url = expenseToEdit ? `/api/expenses/${expenseToEdit.id}` : '/api/expenses';
      const method = expenseToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId || null,
          payerId,
          description: description.trim(),
          amount: numAmount,
          category,
          splitType,
          date,
          notes: notes.trim(),
          participants: participants.map((p) => ({
            userId: p.userId,
            name: p.name,
            included: p.included,
            value: p.value,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      onExpenseAdded();
      onClose();
      // Reset form
      setDescription('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (userId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, included: !p.included } : p))
    );
  };

  const handleUpdateParticipantValue = (userId: string, val: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, value: val } : p))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-splitwise-teal text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {expenseToEdit ? (
              <Pencil className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Euro className="w-5 h-5 stroke-[2.5]" />
            )}
            <h2 className="text-base sm:text-lg font-bold">
              {expenseToEdit ? 'Edit expense' : 'Add an expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              With you and:
            </label>
            <select
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-splitwise-teal"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members?.length || 0} members)
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Category */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Category
                </label>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
                    €
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 sm:py-2.5 text-xl sm:text-2xl font-black text-gray-900 border-2 border-gray-200 rounded-xl focus:border-splitwise-teal outline-none"
                  />
                </div>

                {/* Category */}
                <div className="w-44">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 sm:py-3 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-splitwise-teal"
                  >
                    <option value="Food & Drink">🍽️ Food & Drink</option>
                    <option value="Groceries">🛒 Groceries</option>
                    <option value="Rent">🏠 Rent</option>
                    <option value="Utilities">⚡ Utilities</option>
                    <option value="Travel">✈️ Travel</option>
                    <option value="Entertainment">🎟️ Entertainment</option>
                    <option value="General">🧾 General</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description (Under Amount, clearly marked as mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Mandatory field
                </span>
              </div>
              <input
                type="text"
                placeholder="What was this expense for? (e.g. Dinner, Groceries, Rent)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full text-sm font-semibold border-2 border-gray-200 focus:border-splitwise-teal rounded-xl px-3.5 py-2.5 outline-none placeholder:text-gray-400 placeholder:font-normal transition focus:bg-white bg-gray-50/50"
              />
            </div>
          </div>

          {/* Paid by who? */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">Paid by:</span>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="bg-teal-50 border border-teal-200 text-splitwise-darkTeal font-bold px-3 py-1.5 rounded-lg outline-none"
            >
              {participants.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.name} {p.userId === currentUserId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split Mode Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Split Method:</span>
              <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSplitTypeChange('EQUAL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'EQUAL'
                      ? 'bg-white text-splitwise-teal shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  = Equal
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitTypeChange('EXACT')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'EXACT'
                      ? 'bg-white text-splitwise-teal shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  € Exact
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitTypeChange('PERCENT')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'PERCENT'
                      ? 'bg-white text-splitwise-teal shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  % Percent
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitTypeChange('SHARES')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    splitType === 'SHARES'
                      ? 'bg-white text-splitwise-teal shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  || Shares
                </button>
              </div>
            </div>

            {/* Split Breakdown Area */}
            <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
              {splitType === 'EQUAL' && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-500 mb-1">
                    Select members sharing this bill equally:
                  </p>
                  {participants.map((p) => {
                    const splitObj = splitCalc.splits.find((s) => s.userId === p.userId);
                    return (
                      <label
                        key={p.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={p.included}
                            onChange={() => handleToggleParticipant(p.userId)}
                            className="rounded text-splitwise-teal focus:ring-splitwise-teal w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                        </div>
                        {p.included && splitObj && (
                          <span className="text-xs font-black text-splitwise-teal">
                            €{splitObj.amount.toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {splitType === 'EXACT' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-gray-500">Enter exact amount for each person:</span>
                    <span
                      className={`font-bold ${
                        splitCalc.valid ? 'text-emerald-600' : 'text-splitwise-orange'
                      }`}
                    >
                      {splitCalc.valid ? '✓ Matched' : splitCalc.error}
                    </span>
                  </div>
                  {participants.map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200"
                    >
                      <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 font-bold">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.value || ''}
                          onChange={(e) =>
                            handleUpdateParticipantValue(p.userId, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-right text-xs font-bold border border-gray-300 rounded focus:border-splitwise-teal outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === 'PERCENT' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-gray-500">Enter percentage (must sum to 100%):</span>
                    <span
                      className={`font-bold ${
                        splitCalc.valid ? 'text-emerald-600' : 'text-splitwise-orange'
                      }`}
                    >
                      {splitCalc.valid ? '✓ 100%' : splitCalc.error}
                    </span>
                  </div>
                  {participants.map((p) => {
                    const splitObj = splitCalc.splits.find((s) => s.userId === p.userId);
                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200"
                      >
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">{p.name}</span>
                          {splitObj && (
                            <span className="text-[10px] text-gray-400">
                              = €{splitObj.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={p.value || ''}
                            onChange={(e) =>
                              handleUpdateParticipantValue(p.userId, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-right text-xs font-bold border border-gray-300 rounded focus:border-splitwise-teal outline-none"
                          />
                          <span className="text-xs text-gray-400 font-bold">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {splitType === 'SHARES' && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-500 mb-1">
                    Assign shares (e.g. 2 shares = pays double):
                  </p>
                  {participants.map((p) => {
                    const splitObj = splitCalc.splits.find((s) => s.userId === p.userId);
                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200"
                      >
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">{p.name}</span>
                          {splitObj && (
                            <span className="text-[10px] text-gray-400">
                              = €{splitObj.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={p.value || 1}
                            onChange={(e) =>
                              handleUpdateParticipantValue(p.userId, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-1 text-right text-xs font-bold border border-gray-300 rounded focus:border-splitwise-teal outline-none"
                          />
                          <span className="text-xs text-gray-400 font-bold">shares</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Date & Optional Notes */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 text-gray-700 outline-none focus:ring-1 focus:ring-splitwise-teal"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                placeholder="Receipt info, memo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 text-gray-700 outline-none focus:ring-1 focus:ring-splitwise-teal"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            {expenseToEdit && onDeleteExpense ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
                    await onDeleteExpense(expenseToEdit.id);
                    onClose();
                  }
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete expense</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-splitwise-teal hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
