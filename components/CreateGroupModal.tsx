'use client';

import React, { useState } from 'react';
import { X, Users, Building, Home, Plane, Tag, Plus, Check, AlertCircle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsers: UserItem[];
  currentUserId: string;
  onGroupCreated: (newGroupId: string) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  availableUsers,
  currentUserId,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('apartment');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddEmail = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (newEmail.trim() && newEmail.includes('@')) {
      if (!emailList.includes(newEmail.trim().toLowerCase())) {
        setEmailList((prev) => [...prev, newEmail.trim().toLowerCase()]);
      }
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setEmailList((prev) => prev.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          memberUserIds: selectedUserIds,
          memberEmails: emailList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      onGroupCreated(data.group.id);
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setSelectedUserIds([]);
      setEmailList([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'apartment', label: 'Apartment', icon: Building },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'trip', label: 'Trip', icon: Plane },
    { id: 'other', label: 'Other', icon: Tag },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-splitwise-dark text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-splitwise-teal stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-bold">Start a new group</h2>
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

          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ski Trip 2026, Sunset Apartment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-base font-semibold border-2 border-gray-200 focus:border-splitwise-teal px-3 py-2 rounded-xl outline-none"
            />
          </div>

          {/* Group Type / Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Type of Group
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition text-xs font-semibold ${
                      isSelected
                        ? 'bg-splitwise-lightTeal border-splitwise-teal text-splitwise-darkTeal shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-1 focus:ring-splitwise-teal"
            />
          </div>

          {/* Add Members from existing users */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Add Members
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/60">
              {availableUsers
                .filter((u) => u.id !== currentUserId)
                .map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                          alt={u.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="font-semibold text-gray-800">{u.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(u.id)}
                        className="rounded text-splitwise-teal focus:ring-splitwise-teal w-4 h-4"
                      />
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Or invite by email */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Or invite by email address:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="friend@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmail(e);
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-1 focus:ring-splitwise-teal"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold transition"
              >
                Add
              </button>
            </div>

            {/* Email chips */}
            {emailList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {emailList.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 bg-teal-50 text-splitwise-darkTeal border border-teal-200 px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
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
              {loading ? 'Creating...' : 'Save Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
