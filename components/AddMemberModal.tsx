'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  existingMemberUserIds: string[];
  allUsers: UserItem[];
  onMemberAdded: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  existingMemberUserIds,
  allUsers,
  onMemberAdded,
}: AddMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const candidateUsers = allUsers.filter((u) => !existingMemberUserIds.includes(u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId && !email.trim()) {
      setError('Please select a user or enter an email address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId || undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      onMemberAdded();
      onClose();
      setEmail('');
      setSelectedUserId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-splitwise-teal text-white px-5 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base font-bold">Add to {groupName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {candidateUsers.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Select from contacts
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  if (e.target.value) setEmail('');
                }}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-1 focus:ring-splitwise-teal"
              >
                <option value="">-- Choose person --</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Or invite by email
            </label>
            <input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value) setSelectedUserId('');
              }}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-1 focus:ring-splitwise-teal"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-splitwise-teal hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
