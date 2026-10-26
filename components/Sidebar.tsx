'use client';

import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Receipt,
  Users,
  UserPlus,
  Plus,
  Home,
  Plane,
  Building,
  Tag,
  CircleDot,
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

interface SidebarProps {
  currentView: string;
  selectedGroupId: string | null;
  groups: GroupItem[];
  friends: FriendItem[];
  onSelectView: (view: 'dashboard' | 'activity' | 'all_expenses') => void;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriend: () => void;
}

export function Sidebar({
  currentView,
  selectedGroupId,
  groups,
  friends,
  onSelectView,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenAddFriend,
}: SidebarProps) {
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
    <aside className="hidden md:flex md:w-64 flex-shrink-0 bg-white border-r border-gray-200/80 min-h-[calc(100vh-4rem)] p-4 flex-col justify-between">
      <div className="space-y-6">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <button
            onClick={() => onSelectView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'dashboard' && !selectedGroupId
                ? 'bg-splitwise-lightTeal text-splitwise-darkTeal font-bold shadow-xs'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-splitwise-teal" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectView('activity')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'activity' && !selectedGroupId
                ? 'bg-splitwise-lightTeal text-splitwise-darkTeal font-bold shadow-xs'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4 text-orange-500" />
            <span>Recent Activity</span>
          </button>

          <button
            onClick={() => onSelectView('all_expenses')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'all_expenses' && !selectedGroupId
                ? 'bg-splitwise-lightTeal text-splitwise-darkTeal font-bold shadow-xs'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-sky-500" />
            <span>All Expenses</span>
          </button>
        </nav>

        {/* GROUPS Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Groups
            </span>
            <button
              onClick={onOpenCreateGroup}
              className="text-xs text-splitwise-teal hover:text-teal-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>add</span>
            </button>
          </div>

          <div className="space-y-0.5">
            {groups.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2 italic">No groups yet</p>
            ) : (
              groups.map((g) => {
                const isSelected = selectedGroupId === g.id;
                const bal = g.userBalance ?? g.myBalance ?? 0;
                const isOwed = bal > 0.005;
                const owes = bal < -0.005;

                return (
                  <button
                    key={g.id}
                    onClick={() => onSelectGroup(g.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${
                      isSelected
                        ? 'bg-splitwise-lightTeal text-splitwise-darkTeal font-semibold shadow-xs border-l-4 border-splitwise-teal pl-2'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-gray-50 border border-gray-200">
                        {getGroupIcon(g.category)}
                      </div>
                      <span className="truncate text-xs font-medium text-gray-800">
                        {g.name}
                      </span>
                    </div>

                    {isOwed && (
                      <span className="text-[11px] font-bold text-splitwise-teal whitespace-nowrap pl-1">
                        +€{bal.toFixed(2)}
                      </span>
                    )}
                    {owes && (
                      <span className="text-[11px] font-bold text-splitwise-orange whitespace-nowrap pl-1">
                        -€{Math.abs(bal).toFixed(2)}
                      </span>
                    )}
                    {!isOwed && !owes && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap pl-1">
                        settled
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* FRIENDS Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Friends
            </span>
            <button
              onClick={onOpenAddFriend}
              className="text-xs text-splitwise-teal hover:text-teal-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>add</span>
            </button>
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2 italic">No friends added</p>
            ) : (
              friends.map((f) => {
                const isOwed = f.balance > 0.005;
                const owes = f.balance < -0.005;

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={f.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.name}`}
                        alt={f.name}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                      <span className="truncate text-gray-800 font-medium">{f.name}</span>
                    </div>

                    {isOwed && (
                      <span className="text-[10px] font-semibold text-splitwise-teal whitespace-nowrap pl-1">
                        owes +€{f.balance.toFixed(2)}
                      </span>
                    )}
                    {owes && (
                      <span className="text-[10px] font-semibold text-splitwise-orange whitespace-nowrap pl-1">
                        you owe €{Math.abs(f.balance).toFixed(2)}
                      </span>
                    )}
                    {!isOwed && !owes && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap pl-1">
                        settled
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer / Tip */}
      <div className="pt-4 border-t border-gray-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] text-slate-600">
          <p className="font-semibold text-slate-800 mb-0.5">💡 Smart Simplification</p>
          <p className="leading-tight text-slate-500">
            Pang automatically reduces circular debt so you make fewer payments!
          </p>
        </div>
      </div>
    </aside>
  );
}
