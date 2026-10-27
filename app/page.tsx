'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { MobileDrawer } from '@/components/MobileDrawer';
import { DashboardView } from '@/components/DashboardView';
import { GroupView } from '@/components/GroupView';
import { ActivityView } from '@/components/ActivityView';
import { AllExpensesView } from '@/components/AllExpensesView';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { SettleUpModal } from '@/components/SettleUpModal';
import { SmartCalculationModal } from '@/components/SmartCalculationModal';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { AddMemberModal } from '@/components/AddMemberModal';
import { AuthModal, AuthMode } from '@/components/AuthModal';
import { ProfileModal } from '@/components/ProfileModal';
import { Loader2, Mail, CheckCircle2, AlertCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth & Notification state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authResetToken, setAuthResetToken] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  // Navigation state
  const [currentView, setCurrentView] = useState<'dashboard' | 'activity' | 'all_expenses'>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [currentGroupData, setCurrentGroupData] = useState<any>(null);

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settleUpDefaults, setSettleUpDefaults] = useState<{
    fromUserId?: string;
    toUserId?: string;
    amount?: number;
    groupId?: string;
  }>({});
  const [isSmartCalcOpen, setIsSmartCalcOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<any | null>(null);

  // Invite URL params state
  const [inviteParams, setInviteParams] = useState<{
    email?: string;
    isRegister?: boolean;
    groupName?: string;
  }>({});

  const handleResendVerification = async () => {
    if (!currentUser) return;
    try {
      setResendStatus('loading');
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification email');
      setResendStatus('sent');
      setNotification({
        type: 'success',
        message: data.message || `Verification link sent to ${currentUser.email}!`,
      });
      setTimeout(() => setResendStatus('idle'), 60000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
      setResendStatus('idle');
    }
  };

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      setAllUsers(data.allUsers || []);

      if (data.user) {
        setCurrentUser(data.user);
      } else {
        // Not logged in -> Prompt authentication
        setIsAuthModalOpen(true);
      }

      // Check URL query parameters for invites, password reset, or email verification
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        const actionParam = params.get('action');
        const groupParam = params.get('group');
        const tokenParam = params.get('token');
        const verifiedParam = params.get('verified');
        const errorParam = params.get('error');

        if (verifiedParam) {
          setNotification({
            type: 'success',
            message: '🎉 Email verified successfully! Your account is now active.',
          });
          try {
            confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
          } catch {}
          if (data.user) {
            setCurrentUser({ ...data.user, emailVerified: true });
          }
        } else if (errorParam) {
          setNotification({
            type: 'error',
            message: decodeURIComponent(errorParam),
          });
        } else if (actionParam === 'verify-email' && tokenParam) {
          fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenParam }),
          })
            .then((r) => r.json())
            .then((resData) => {
              if (resData.success && resData.user) {
                setCurrentUser(resData.user);
                setNotification({
                  type: 'success',
                  message: '🎉 Email address verified successfully!',
                });
                try {
                  confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
                } catch {}
              } else {
                setNotification({
                  type: 'error',
                  message: resData.error || 'Failed to verify email',
                });
              }
            })
            .catch((err) => {
              setNotification({ type: 'error', message: err.message });
            });
        } else if (actionParam === 'reset-password' && tokenParam) {
          setAuthMode('reset');
          setAuthResetToken(tokenParam);
          if (emailParam) {
            setInviteParams({ email: emailParam });
          }
          setIsAuthModalOpen(true);
        } else if (actionParam === 'forgot-password') {
          setAuthMode('forgot');
          if (emailParam) setInviteParams({ email: emailParam });
          setIsAuthModalOpen(true);
        } else if (emailParam) {
          setInviteParams({
            email: emailParam,
            isRegister: actionParam !== 'login',
            groupName: groupParam || undefined,
          });
          setAuthMode(actionParam === 'login' ? 'login' : 'register');
          setIsAuthModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch Dashboard & Groups when currentUser changes
  const fetchDashboardAndGroups = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [dashRes, groupsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/groups'),
      ]);

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardData(dashData);
      }

      if (groupsRes.ok) {
        const grpData = await groupsRes.json();
        setGroups(grpData.groups || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardAndGroups();
  }, [fetchDashboardAndGroups]);

  // Fetch Group details when selectedGroupId changes
  const fetchGroupDetail = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentGroupData(data);
      }
    } catch (err) {
      console.error('Error fetching group detail:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetail(selectedGroupId);
    } else {
      setCurrentGroupData(null);
    }
  }, [selectedGroupId, fetchGroupDetail]);

  // Refresh everything after an action
  const refreshAll = useCallback(() => {
    fetchDashboardAndGroups();
    if (selectedGroupId) {
      fetchGroupDetail(selectedGroupId);
    }
  }, [fetchDashboardAndGroups, fetchGroupDetail, selectedGroupId]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setDashboardData(null);
    setGroups([]);
    setCurrentGroupData(null);
    setSelectedGroupId(null);
    setIsAuthModalOpen(true);
  };

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsAddExpenseOpen(true);
  };

  const handleOpenEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleOpenEditSettlement = (settlement: any) => {
    setEditingSettlement(settlement);
    setIsSettleUpOpen(true);
  };

  const handleOpenSettleUp = (fromUserId?: string, toUserId?: string, amount?: number) => {
    setEditingSettlement(null);
    setSettleUpDefaults({
      fromUserId: fromUserId || currentUser?.id,
      toUserId,
      amount,
      groupId: selectedGroupId || undefined,
    });
    setIsSettleUpOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Expense deleted successfully.' });
        refreshAll();
      } else {
        const data = await res.json().catch(() => ({}));
        setNotification({ type: 'error', message: data.error || 'Failed to delete expense' });
      }
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete expense' });
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/settlements/${settlementId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Payment record removed.' });
        refreshAll();
      } else {
        const data = await res.json().catch(() => ({}));
        setNotification({ type: 'error', message: data.error || 'Failed to delete payment' });
      }
    } catch (err: any) {
      console.error('Error deleting settlement:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete payment' });
    }
  };

  const handleToggleSimplifyDebts = async (simplify: boolean) => {
    if (!selectedGroupId) return;
    try {
      await fetch(`/api/groups/${selectedGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simplifyDebts: simplify }),
      });
      refreshAll();
    } catch (err) {
      console.error('Error updating group:', err);
    }
  };

  const handleToggleLock = async (locked: boolean) => {
    if (!selectedGroupId) return;
    try {
      await fetch(`/api/groups/${selectedGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked }),
      });
      refreshAll();
    } catch (err) {
      console.error('Error locking group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete group');
      }
      setSelectedGroupId(null);
      setCurrentGroupData(null);
      setCurrentView('dashboard');
      setNotification({ type: 'success', message: 'Group deleted successfully.' });
      refreshAll();
    } catch (err: any) {
      console.error('Error deleting group:', err);
      setNotification({ type: 'error', message: err.message || 'Error deleting group' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-splitwise-teal animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-600">Loading Pang...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        selectedGroupId={selectedGroupId}
        onBackToDashboard={() => {
          setSelectedGroupId(null);
          setCurrentView('dashboard');
        }}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddExpense={handleOpenAddExpense}
        onOpenSettleUp={() => handleOpenSettleUp()}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onResendVerification={handleResendVerification}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top-2 duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-500 text-white shadow-sm'
              : notification.type === 'error'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-teal-600 text-white shadow-sm'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {notification.type === 'info' && <Mail className="w-4 h-4 flex-shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-black/10 rounded-md transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Unverified Email Alert Banner */}
      {currentUser && currentUser.emailVerified === false && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 px-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Please verify your email address (<strong>{currentUser.email}</strong>) to secure your account.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleResendVerification}
                disabled={resendStatus === 'loading' || resendStatus === 'sent'}
                className="font-bold underline text-amber-900 hover:text-amber-700 disabled:opacity-50 transition"
              >
                {resendStatus === 'loading'
                  ? 'Sending...'
                  : resendStatus === 'sent'
                  ? '✓ Verification sent!'
                  : 'Resend verification link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Left Sidebar (Desktop only) */}
        <Sidebar
          currentView={currentView}
          selectedGroupId={selectedGroupId}
          groups={groups}
          friends={dashboardData?.friends || []}
          onSelectView={(v) => {
            setSelectedGroupId(null);
            setCurrentView(v);
          }}
          onSelectGroup={(id) => {
            setSelectedGroupId(id);
          }}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenAddFriend={() => setIsAddMemberOpen(true)}
        />

        {/* Center Main Stage */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 min-w-0">
          {selectedGroupId && currentGroupData ? (
            <GroupView
              group={currentGroupData.group}
              members={currentGroupData.members}
              expenses={currentGroupData.expenses}
              settlements={currentGroupData.settlements}
              debts={currentGroupData.debts}
              stats={currentGroupData.stats}
              currentUserId={currentUser?.id}
              onOpenAddExpense={handleOpenAddExpense}
              onOpenSettleUp={handleOpenSettleUp}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
              onOpenSmartCalculation={() => setIsSmartCalcOpen(true)}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onEditSettlement={handleOpenEditSettlement}
              onDeleteSettlement={handleDeleteSettlement}
              onToggleSimplifyDebts={handleToggleSimplifyDebts}
              onDeleteGroup={handleDeleteGroup}
              onToggleLock={handleToggleLock}
            />
          ) : currentView === 'dashboard' && dashboardData ? (
            <DashboardView
              summary={dashboardData.summary}
              friends={dashboardData.friends}
              recentExpenses={dashboardData.recentExpenses}
              currentUserId={currentUser?.id}
              onOpenAddExpense={handleOpenAddExpense}
              onOpenSettleUp={handleOpenSettleUp}
              onSelectGroup={(id) => setSelectedGroupId(id)}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          ) : currentView === 'activity' ? (
            <ActivityView
              activities={dashboardData?.activities || []}
              onSelectGroup={(id) => setSelectedGroupId(id)}
            />
          ) : currentView === 'all_expenses' ? (
            <AllExpensesView
              expenses={dashboardData?.recentExpenses || []}
              currentUserId={currentUser?.id}
              onOpenAddExpense={handleOpenAddExpense}
              onSelectGroup={(id) => setSelectedGroupId(id)}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              {currentUser ? 'Select a group from the sidebar to view bills' : 'Please sign in or register to get started'}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <BottomNav
        currentView={currentView}
        selectedGroupId={selectedGroupId}
        onSelectView={(v) => {
          setSelectedGroupId(null);
          setCurrentView(v);
        }}
        onOpenGroupsDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddExpense={handleOpenAddExpense}
        onOpenSettleUp={() => handleOpenSettleUp()}
      />

      {/* Mobile Slide-Over Groups & Friends Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        groups={groups}
        friends={dashboardData?.friends || []}
        currentUser={currentUser}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(id) => {
          setSelectedGroupId(id);
        }}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenAddFriend={() => setIsAddMemberOpen(true)}
      />

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        groups={groups}
        defaultGroupId={selectedGroupId}
        currentUserId={currentUser?.id}
        expenseToEdit={editingExpense}
        onDeleteExpense={handleDeleteExpense}
        onExpenseAdded={() => {
          setNotification({
            type: 'success',
            message: editingExpense ? 'Expense updated successfully!' : 'Expense added successfully!',
          });
          refreshAll();
        }}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => {
          setIsSettleUpOpen(false);
          setEditingSettlement(null);
        }}
        users={allUsers}
        groups={groups}
        defaultGroupId={settleUpDefaults.groupId}
        defaultFromUserId={settleUpDefaults.fromUserId}
        defaultToUserId={settleUpDefaults.toUserId}
        defaultAmount={settleUpDefaults.amount}
        currentUserId={currentUser?.id}
        currentGroupDebts={currentGroupData?.debts}
        friends={dashboardData?.friends}
        settlementToEdit={editingSettlement}
        onDeleteSettlement={handleDeleteSettlement}
        onSettlementAdded={() => {
          setNotification({
            type: 'success',
            message: editingSettlement ? 'Payment updated successfully!' : 'Payment recorded successfully!',
          });
          refreshAll();
        }}
      />

      {currentGroupData && (
        <SmartCalculationModal
          isOpen={isSmartCalcOpen}
          onClose={() => setIsSmartCalcOpen(false)}
          groupName={currentGroupData.group.name}
          members={currentGroupData.members}
          simplifiedDebts={currentGroupData.debts.simplified}
          directDebts={currentGroupData.debts.direct}
          onSettleDebt={(fromId, toId, amt) => handleOpenSettleUp(fromId, toId, amt)}
        />
      )}

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        availableUsers={allUsers}
        currentUserId={currentUser?.id}
        onGroupCreated={(newId) => {
          refreshAll();
          setSelectedGroupId(newId);
        }}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        groupId={selectedGroupId || groups[0]?.id || ''}
        groupName={
          currentGroupData?.group?.name || groups.find((g) => g.id === selectedGroupId)?.name || 'Group'
        }
        existingMemberUserIds={currentGroupData?.members?.map((m: any) => m.userId) || []}
        allUsers={allUsers}
        onMemberAdded={refreshAll}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
        onSaved={(u) => {
          setCurrentUser(u);
          refreshAll();
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          // If not logged in, keep open unless user is logged in
          if (currentUser) {
            setIsAuthModalOpen(false);
          }
        }}
        initialEmail={inviteParams.email}
        initialMode={authMode}
        initialResetToken={authResetToken}
        initialGroupName={inviteParams.groupName}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          refreshAll();
        }}
      />
    </div>
  );
}
