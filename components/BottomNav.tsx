'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Plus,
  Activity,
  Receipt,
  Euro,
  X,
} from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  selectedGroupId: string | null;
  onSelectView: (view: 'dashboard' | 'activity' | 'all_expenses') => void;
  onOpenGroupsDrawer: () => void;
  onOpenAddExpense: () => void;
  onOpenSettleUp: () => void;
}

export function BottomNav({
  currentView,
  selectedGroupId,
  onSelectView,
  onOpenGroupsDrawer,
  onOpenAddExpense,
  onOpenSettleUp,
}: BottomNavProps) {
  const [showSpeedDial, setShowSpeedDial] = useState(false);

  const isDashboardActive = currentView === 'dashboard' && !selectedGroupId;
  const isGroupsActive = !!selectedGroupId;
  const isActivityActive = currentView === 'activity' && !selectedGroupId;
  const isExpensesActive = currentView === 'all_expenses' && !selectedGroupId;

  return (
    <>
      {/* Backdrop for Speed Dial FAB */}
      {showSpeedDial && (
        <div
          onClick={() => setShowSpeedDial(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden animate-in fade-in duration-100"
        />
      )}

      {/* Speed Dial Menu Options (Floating above FAB) */}
      {showSpeedDial && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 md:hidden animate-in zoom-in-90 slide-in-from-bottom-6 duration-150">
          <button
            onClick={() => {
              setShowSpeedDial(false);
              onOpenAddExpense();
            }}
            className="flex items-center gap-2.5 bg-splitwise-orange text-white px-5 py-2.5 rounded-full shadow-lg font-bold text-sm active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add an expense</span>
          </button>

          <button
            onClick={() => {
              setShowSpeedDial(false);
              onOpenSettleUp();
            }}
            className="flex items-center gap-2.5 bg-splitwise-teal text-white px-5 py-2.5 rounded-full shadow-lg font-bold text-sm active:scale-95 transition"
          >
            <Euro className="w-4 h-4 stroke-[3]" />
            <span>Settle up</span>
          </button>
        </div>
      )}

      {/* Bottom Bar Container */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1 max-w-md mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => onSelectView('dashboard')}
            className={`flex flex-col items-center justify-center h-full transition ${
              isDashboardActive ? 'text-splitwise-teal font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Dashboard</span>
          </button>

          {/* Groups Drawer */}
          <button
            onClick={onOpenGroupsDrawer}
            className={`flex flex-col items-center justify-center h-full transition ${
              isGroupsActive ? 'text-splitwise-teal font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Groups</span>
          </button>

          {/* Center Floating Action Button (FAB) */}
          <div className="flex items-center justify-center -mt-5">
            <button
              onClick={() => setShowSpeedDial(!showSpeedDial)}
              aria-label="Add or settle"
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 ${
                showSpeedDial
                  ? 'bg-gray-800 rotate-45'
                  : 'bg-splitwise-teal shadow-teal-500/40 ring-4 ring-white'
              }`}
            >
              {showSpeedDial ? (
                <Plus className="w-6 h-6 stroke-[3]" />
              ) : (
                <Plus className="w-6 h-6 stroke-[3]" />
              )}
            </button>
          </div>

          {/* Activity */}
          <button
            onClick={() => onSelectView('activity')}
            className={`flex flex-col items-center justify-center h-full transition ${
              isActivityActive ? 'text-splitwise-teal font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Activity</span>
          </button>

          {/* All Expenses */}
          <button
            onClick={() => onSelectView('all_expenses')}
            className={`flex flex-col items-center justify-center h-full transition ${
              isExpensesActive ? 'text-splitwise-teal font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Expenses</span>
          </button>
        </div>
      </div>
    </>
  );
}
