'use client';

import React from 'react';
import { Activity as ActivityIcon, Receipt, CheckCircle2, UserPlus, Users, ArrowRight, Pencil, Trash2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  group?: {
    id: string;
    name: string;
  } | null;
}

interface ActivityViewProps {
  activities: ActivityItem[];
  onSelectGroup: (groupId: string) => void;
}

export function ActivityView({ activities, onSelectGroup }: ActivityViewProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'EXPENSE_ADDED':
        return <Receipt className="w-4 h-4 text-sky-600" />;
      case 'EXPENSE_UPDATED':
        return <Pencil className="w-4 h-4 text-amber-600" />;
      case 'EXPENSE_DELETED':
        return <Trash2 className="w-4 h-4 text-rose-600" />;
      case 'SETTLEMENT_RECORDED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'MEMBER_ADDED':
        return <UserPlus className="w-4 h-4 text-indigo-600" />;
      case 'GROUP_CREATED':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-splitwise-teal" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Activity</h1>
          <p className="text-sm text-gray-500">
            Audit log of all expenses, settlements, and member updates
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 overflow-hidden divide-y divide-gray-100">
        {activities.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic text-sm">
            No recent activity recorded yet.
          </div>
        ) : (
          activities.map((act) => {
            const dateStr = new Date(act.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <div
                key={act.id}
                className="p-4 flex items-start gap-3.5 hover:bg-gray-50/70 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-gray-200">
                  {getActivityIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{act.title}</p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{dateStr}</span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{act.description}</p>
                  )}

                  {act.group && (
                    <button
                      onClick={() => act.group && onSelectGroup(act.group.id)}
                      className="text-[11px] font-semibold text-splitwise-teal hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <span>In {act.group.name}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
