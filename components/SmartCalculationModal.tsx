'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  Copy,
  CheckCircle2,
  TrendingDown,
  Info,
  Scale,
  Share2,
} from 'lucide-react';

interface MemberBalance {
  userId: string;
  name: string;
  netBalance: number;
}

interface Transaction {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

interface SmartCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  members: MemberBalance[];
  simplifiedDebts: Transaction[];
  directDebts: Transaction[];
  onSettleDebt?: (fromUserId: string, toUserId: string, amount: number) => void;
}

export function SmartCalculationModal({
  isOpen,
  onClose,
  groupName,
  members,
  simplifiedDebts,
  directDebts,
  onSettleDebt,
}: SmartCalculationModalProps) {
  const [activeTab, setActiveTab] = useState<'comparison' | 'matrix'>('comparison');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const directCount = directDebts.length;
  const simplifiedCount = simplifiedDebts.length;
  const transactionsSaved = Math.max(0, directCount - simplifiedCount);
  const percentSaved =
    directCount > 0 ? Math.round((transactionsSaved / directCount) * 100) : 0;

  const handleCopy = () => {
    let text = `📊 Pang Smart Settlement Plan for ${groupName}:\n\n`;
    if (simplifiedDebts.length === 0) {
      text += `🎉 All balances are settled up! Nobody owes anything.`;
    } else {
      text += `⚡ Optimized Settlement (saves ${transactionsSaved} circular payments):\n`;
      simplifiedDebts.forEach((d) => {
        text += `• ${d.fromUserName} pays ${d.toUserName} €${d.amount.toFixed(2)}\n`;
      });
      text += `\nNet Member Summary:\n`;
      members.forEach((m) => {
        const sign = m.netBalance > 0 ? '+' : '';
        text += `• ${m.name}: ${sign}€${m.netBalance.toFixed(2)}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-splitwise-dark to-slate-900 text-white px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-xl bg-splitwise-teal text-white shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Smart Debt Simplification</h2>
              <p className="text-xs text-gray-400">
                Minimum Cash Flow algorithm for {groupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                {transactionsSaved > 0
                  ? `Eliminated ${transactionsSaved} redundant transactions (${percentSaved}% reduction)`
                  : 'Balances are already fully optimized'}
              </p>
              <p className="text-[11px] text-emerald-700">
                Instead of {directCount} payments across friends, only {simplifiedCount} are needed to balance everyone to €0.00.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Share summary</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Without Simplification */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Direct Bilateral Debts
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {directCount} payments
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {directDebts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No direct debts recorded.</p>
                ) : (
                  directDebts.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-gray-700 truncate">
                        <span className="font-semibold text-gray-900">{d.fromUserName}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-gray-900">{d.toUserName}</span>
                      </div>
                      <span className="font-bold text-gray-600 ml-2">€{d.amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* With Simplification */}
            <div className="border-2 border-splitwise-teal/40 rounded-xl p-4 bg-splitwise-lightTeal/30 relative shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-teal-200/60">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-splitwise-teal" />
                  <span className="text-xs font-bold uppercase tracking-wider text-splitwise-darkTeal">
                    Simplified Plan
                  </span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-splitwise-teal text-white shadow-xs">
                  {simplifiedCount} {simplifiedCount === 1 ? 'payment' : 'payments'}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {simplifiedDebts.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-emerald-800">Everyone is square!</p>
                  </div>
                ) : (
                  simplifiedDebts.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white p-2 rounded-lg border border-teal-200 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 text-gray-700 truncate">
                        <span className="font-bold text-gray-900">{d.fromUserName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-splitwise-teal stroke-[2.5]" />
                        <span className="font-bold text-gray-900">{d.toUserName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-splitwise-teal">€{d.amount.toFixed(2)}</span>
                        {onSettleDebt && (
                          <button
                            onClick={() => {
                              onSettleDebt(d.fromUserId, d.toUserId, d.amount);
                              onClose();
                            }}
                            className="text-[10px] bg-splitwise-teal hover:bg-teal-600 text-white font-bold px-2 py-0.5 rounded transition"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Net Balances Ledger Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-gray-500" />
                <span>Net Balances Ledger</span>
              </span>
              <span className="text-[11px] text-gray-400">Sum of all net balances = €0.00</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-white text-gray-500 border-b border-gray-100 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-4 text-center">Position</th>
                  <th className="py-2.5 px-4 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => {
                  const isPositive = m.netBalance > 0.005;
                  const isNegative = m.netBalance < -0.005;

                  return (
                    <tr key={m.userId} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-bold text-gray-900">{m.name}</td>
                      <td className="py-2.5 px-4 text-center">
                        {isPositive && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Creditor (receives)
                          </span>
                        )}
                        {isNegative && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            Debtor (pays)
                          </span>
                        )}
                        {!isPositive && !isNegative && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Even
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black">
                        {isPositive && (
                          <span className="text-splitwise-teal">+€{m.netBalance.toFixed(2)}</span>
                        )}
                        {isNegative && (
                          <span className="text-splitwise-orange">
                            -€{Math.abs(m.netBalance).toFixed(2)}
                          </span>
                        )}
                        {!isPositive && !isNegative && (
                          <span className="text-gray-400">€0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Algorithm Explanation Footer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
              <p className="font-semibold text-slate-800">How Pang Debt Simplification Works:</p>
              <p>
                When multiple roommates or travel companions incur shared bills, circular debts arise
                (e.g., Alice owes Bob €20, Bob owes Charlie €20, and Charlie owes Alice €20).
                Our Min-Cash-Flow engine greedily matches the largest debtors with the largest creditors,
                collapsing transitive loops so everyone is settled with the mathematically minimal number of payments.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold text-splitwise-teal hover:underline"
          >
            <Share2 className="w-4 h-4" />
            <span>Copy settlement message for WhatsApp/group chat</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
