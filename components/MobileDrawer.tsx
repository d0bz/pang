'use client';

import React from 'react';
import {
  X,
  Plus,
  Building,
  Home,
  Plane,
  Tag,
  UserPlus,
  Euro,
} from 'lucide-react';

interface GroupItem {
  id: string;
  name: string;
  category: string;
  userBalance?: number;
  myBalance?: number;
  memberCount: number;
}

interface FriendItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  balance: number;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupItem[];
  friends: FriendItem[];
  currentUser: UserItem | null;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriend: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  groups,
  friends,
  currentUser,
  selectedGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenAddFriend,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const getGroupIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'apartment':
        return <Building className="w-4 h-4 text-emerald-600" />;
      case 'trip':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'home':
        return <Home className="w-4 h-4 text-amber-600" />;
      default:
        return <Tag className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="bg-splitwise-dark text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-splitwise-teal flex items-center justify-center font-bold text-white">
              <Euro className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Pang</h2>
              {currentUser && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-gray-400 truncate max-w-[130px]">
                    {currentUser.email}
                  </p>
                  {currentUser.emailVerified ? (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                      Verified
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded">
                      Unverified
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* GROUPS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Your Groups
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateGroup();
                }}
                className="text-xs text-splitwise-teal hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New group</span>
              </button>
            </div>

            <div className="space-y-1">
              {groups.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-400 italic">
                  No groups yet. Tap "+ New group" to create one.
                </div>
              ) : (
                groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  const bal = g.userBalance ?? g.myBalance ?? 0;
                  const isOwed = bal > 0.005;
                  const owes = bal < -0.005;

                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectGroup(g.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                        isSelected
                          ? 'bg-splitwise-lightTeal text-splitwise-darkTeal font-bold border border-splitwise-teal/40'
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-gray-100 border border-gray-200">
                          {getGroupIcon(g.category)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{g.name}</p>
                          <p className="text-[10px] text-gray-400">{g.memberCount} members</p>
                        </div>
                      </div>

                      {isOwed && (
                        <span className="text-xs font-black text-splitwise-teal whitespace-nowrap pl-2">
                          +${bal.toFixed(2)}
                        </span>
                      )}
                      {owes && (
                        <span className="text-xs font-black text-splitwise-orange whitespace-nowrap pl-2">
                          -${Math.abs(bal).toFixed(2)}
                        </span>
                      )}
                      {!isOwed && !owes && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap pl-2">
                          settled
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* FRIENDS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Friends
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddFriend();
                }}
                className="text-xs text-splitwise-teal hover:underline font-bold flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-1">
              {friends.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 italic">No friends added</p>
              ) : (
                friends.map((f) => {
                  const isOwed = f.balance > 0.005;
                  const owes = f.balance < -0.005;

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg text-xs hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={
                            f.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.name}`
                          }
                          alt={f.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="truncate font-medium text-gray-800">{f.name}</span>
                      </div>

                      {isOwed && (
                        <span className="text-[11px] font-bold text-splitwise-teal pl-1">
                          +${f.balance.toFixed(2)}
                        </span>
                      )}
                      {owes && (
                        <span className="text-[11px] font-bold text-splitwise-orange pl-1">
                          -${Math.abs(f.balance).toFixed(2)}
                        </span>
                      )}
                      {!isOwed && !owes && (
                        <span className="text-[10px] text-gray-400 pl-1">settled</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
