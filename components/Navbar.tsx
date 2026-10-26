'use client';

import React, { useState } from 'react';
import {
  Euro,
  Plus,
  LogOut,
  ChevronDown,
  Users,
  Menu,
  ArrowLeft,
  User,
  CheckCircle2,
  Mail,
} from 'lucide-react';

interface NavbarProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    emailVerified?: boolean;
  } | null;
  selectedGroupId?: string | null;
  onBackToDashboard?: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAddExpense: () => void;
  onOpenSettleUp: () => void;
  onOpenCreateGroup: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  onResendVerification?: () => void;
}

export function Navbar({
  currentUser,
  selectedGroupId,
  onBackToDashboard,
  onOpenMobileDrawer,
  onOpenAddExpense,
  onOpenSettleUp,
  onOpenCreateGroup,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  onResendVerification,
}: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-splitwise-dark text-white border-b border-gray-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Mobile Drawer Button & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenMobileDrawer && (
            <button
              onClick={onOpenMobileDrawer}
              aria-label="Open menu"
              className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 active:scale-95 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Back button if inside a group on mobile */}
          {selectedGroupId && onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="md:hidden flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800/80 px-2 py-1 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div
            onClick={onBackToDashboard}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-splitwise-teal flex items-center justify-center text-white shadow-md shadow-teal-900/20 font-bold text-lg sm:text-xl tracking-tighter">
              <Euro className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                  Pang
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {currentUser ? (
            <>
              {/* Desktop quick action buttons (Mobile has the FAB) */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={onOpenAddExpense}
                  className="flex items-center gap-1.5 bg-splitwise-orange hover:bg-orange-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add expense</span>
                </button>

                <button
                  onClick={onOpenSettleUp}
                  className="flex items-center gap-1.5 bg-splitwise-teal hover:bg-teal-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition active:scale-95"
                >
                  <Euro className="w-4 h-4 stroke-[2.5]" />
                  <span>Settle up</span>
                </button>
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <img
                    src={
                      currentUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`
                    }
                    alt={currentUser.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-600 object-cover"
                  />
                  <span className="hidden md:inline-block text-xs font-semibold text-gray-200">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 text-gray-800 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center">
                        {currentUser.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResendVerification?.();
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition"
                            title="Click to send verification link"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Unverified • Send link</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={onOpenProfile}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-splitwise-teal flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Edit profile</span>
                      </button>
                      <button
                        onClick={onOpenCreateGroup}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-splitwise-teal flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>Create a new group</span>
                      </button>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-splitwise-teal hover:bg-teal-600 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
