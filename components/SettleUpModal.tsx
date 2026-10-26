'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface GroupItem {
  id: string;
  name: string;
  members: Array<{ id: string; name: string }>;
}

export interface SettlementItem {
  id: string;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
  date: string | Date;
  fromUserId: string;
  toUserId: string;
  groupId?: string | null;
}

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserItem[];
  groups: GroupItem[];
  defaultGroupId?: string | null;
  defaultFromUserId?: string;
  defaultToUserId?: string;
  defaultAmount?: number;
  currentUserId: string;
  onSettlementAdded: () => void;
  settlementToEdit?: SettlementItem | null;
  onDeleteSettlement?: (settlementId: string) => Promise<void> | void;
}

export function SettleUpModal({
  isOpen,
  onClose,
  users,
  groups,
  defaultGroupId,
  defaultFromUserId,
  defaultToUserId,
  defaultAmount,
  currentUserId,
  onSettlementAdded,
  settlementToEdit,
  onDeleteSettlement,
}: SettleUpModalProps) {
  const [fromUserId, setFromUserId] = useState<string>('');
  const [toUserId, setToUserId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (settlementToEdit) {
      setFromUserId(settlementToEdit.fromUserId);
      setToUserId(settlementToEdit.toUserId);
      setAmount(settlementToEdit.amount != null ? settlementToEdit.amount.toString() : '');
      setGroupId(settlementToEdit.groupId || defaultGroupId || '');
      setPaymentMethod(settlementToEdit.paymentMethod || 'Cash');
      setNotes(settlementToEdit.notes || '');
      setDate(
        settlementToEdit.date
          ? new Date(settlementToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
    } else {
      const from = defaultFromUserId || currentUserId;
      setFromUserId(from);
      let to = defaultToUserId || '';
      if (!to && users.length > 0) {
        const otherUser = users.find((u) => u.id !== from);
        if (otherUser) to = otherUser.id;
      }
      setToUserId(to);
      setAmount(defaultAmount ? defaultAmount.toFixed(2) : '');
      setGroupId(defaultGroupId || '');
      setPaymentMethod('Cash');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [
    isOpen,
    settlementToEdit,
    defaultFromUserId,
    defaultToUserId,
    defaultAmount,
    defaultGroupId,
    currentUserId,
    users,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (fromUserId === toUserId) {
      setError('Sender and receiver cannot be the same person');
      return;
    }

    setLoading(true);

    try {
      const url = settlementToEdit ? `/api/settlements/${settlementToEdit.id}` : '/api/settlements';
      const method = settlementToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId || null,
          fromUserId,
          toUserId,
          amount: parsedAmount,
          paymentMethod,
          notes: notes.trim(),
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record settlement');
      }

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // Confetti is decorative
      }

      onSettlementAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fromUser = users.find((u) => u.id === fromUserId);
  const toUser = users.find((u) => u.id === toUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-splitwise-teal text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {settlementToEdit ? (
              <Pencil className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            )}
            <h2 className="text-base sm:text-lg font-bold">
              {settlementToEdit ? 'Edit settlement payment' : 'Settle up payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
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

          {/* From & To Selector Graphic */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
            {/* Sender */}
            <div className="flex-1 text-center">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Payer (Gives)
              </label>
              <select
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="w-full text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-splitwise-teal"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-gray-400 font-bold px-1">
              <ArrowRight className="w-5 h-5 text-splitwise-teal stroke-[2.5]" />
            </div>

            {/* Receiver */}
            <div className="flex-1 text-center">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Recipient (Receives)
              </label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-splitwise-teal"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Amount Paid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">
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
          </div>

          {/* Group */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Apply to Group (optional)
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-1 focus:ring-splitwise-teal"
            >
              <option value="">No specific group (Direct settlement)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'Bank Transfer', 'PayPal', 'Venmo'].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                    paymentMethod === m
                      ? 'bg-splitwise-lightTeal text-splitwise-darkTeal border-splitwise-teal'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                placeholder="Memo or check #"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            {settlementToEdit && onDeleteSettlement ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
                    await onDeleteSettlement(settlementToEdit.id);
                    onClose();
                  }
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete payment</span>
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
                {loading ? 'Saving...' : settlementToEdit ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
