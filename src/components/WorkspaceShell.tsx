import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Bell,
  Bookmark,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FolderKanban,
  Gavel,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Receipt,
  Search,
  Settings,
  Shield,
  User,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  AppNotification,
  Conversation,
  LedgerTransaction,
  MarketplaceTask,
  SavedTaskItem,
  SupportTicket,
  TaskAssignment,
  TaskBid,
  WalletAccount,
  WithdrawalRequest,
  WorkspaceRoute,
} from '../types/marketplace';
import { ClientPages } from './ClientPages';
import { SharedWorkspacePages } from './SharedWorkspacePages';
import { WorkerPages } from './WorkerPages';

interface NavEntry {
  route: WorkspaceRoute;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface NavGroup {
  heading: string;
  items: NavEntry[];
}

interface WorkspaceShellProps {
  route: WorkspaceRoute;
  publicTasks: MarketplaceTask[];
  workerBids: TaskBid[];
  workerAssignments: TaskAssignment[];
  savedTasks: SavedTaskItem[];
  clientTasks: MarketplaceTask[];
  clientBids: TaskBid[];
  clientAssignments: TaskAssignment[];
  wallet: WalletAccount | null;
  transactions: LedgerTransaction[];
  withdrawals: WithdrawalRequest[];
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  notifications: AppNotification[];
  supportTickets: SupportTicket[];
  onNavigate: (route: WorkspaceRoute) => void;
  onSelectTask: (task: MarketplaceTask) => void;
  onOpenChat: (conversationId: string) => void;
  onNavigatePublicHome: () => void;
  onSignOut: () => void;
}

const ROUTE_META: Record<WorkspaceRoute, { title: string; section: string }> = {
  dashboard: { title: 'Dashboard', section: 'Dashboard' },
  'browse-tasks': { title: 'Browse Tasks', section: 'Workspace' },
  'my-bids': { title: 'My Bids', section: 'Workspace' },
  'my-assignments': { title: 'My Assignments', section: 'Workspace' },
  'completed-work': { title: 'Completed Work', section: 'Workspace' },
  'saved-tasks': { title: 'Saved Tasks', section: 'Workspace' },
  'post-task': { title: 'Post a Task', section: 'Workspace' },
  'manage-tasks': { title: 'Manage Tasks', section: 'Workspace' },
  'received-bids': { title: 'Received Bids', section: 'Workspace' },
  'active-projects': { title: 'Active Projects', section: 'Workspace' },
  'completed-projects': { title: 'Completed Projects', section: 'Workspace' },
  wallet: { title: 'My Wallet', section: 'Finance' },
  transactions: { title: 'Transactions', section: 'Finance' },
  withdrawals: { title: 'Withdrawal Requests', section: 'Finance' },
  'payment-history': { title: 'Payment History', section: 'Finance' },
  messages: { title: 'Messages', section: 'Communication' },
  notifications: { title: 'Notifications', section: 'Communication' },
  support: { title: 'Help & Support', section: 'Communication' },
  profile: { title: 'My Profile', section: 'Account' },
  settings: { title: 'Account Settings', section: 'Account' },
  security: { title: 'Security Settings', section: 'Account' },
};

export function WorkspaceShell({
  route,
  publicTasks,
  workerBids,
  workerAssignments,
  savedTasks,
  clientTasks,
  clientBids,
  clientAssignments,
  wallet,
  transactions,
  withdrawals,
  conversations,
  activeConversationId,
  onSelectConversation,
  notifications,
  supportTickets,
  onNavigate,
  onSelectTask,
  onOpenChat,
  onNavigatePublicHome,
  onSignOut,
}: WorkspaceShellProps) {
  const { firebaseUser, userPrivate } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const role = userPrivate?.role || 'worker';
  const isWorker = role === 'worker';

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const unreadMsgCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return conversations.filter((c) => c.unreadBy.includes(firebaseUser.uid)).length;
  }, [conversations, firebaseUser]);

  const navGroups: NavGroup[] = useMemo(() => {
    const workspaceItems: NavEntry[] = isWorker
      ? [
          { route: 'browse-tasks', label: 'Browse Tasks', icon: Briefcase },
          { route: 'my-bids', label: 'My Bids', icon: Gavel },
          { route: 'my-assignments', label: 'My Assignments', icon: ClipboardCheck },
          { route: 'completed-work', label: 'Completed Work', icon: CheckCircle2 },
          { route: 'saved-tasks', label: 'Saved Tasks', icon: Bookmark },
        ]
      : [
          { route: 'post-task', label: 'Post a Task', icon: PlusCircle },
          { route: 'manage-tasks', label: 'Manage Tasks', icon: ListChecks },
          { route: 'received-bids', label: 'Received Bids', icon: Gavel },
          { route: 'active-projects', label: 'Active Projects', icon: FolderKanban },
          { route: 'completed-projects', label: 'Completed Projects', icon: FileCheck2 },
        ];

    return [
      {
        heading: 'DASHBOARD',
        items: [{ route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        heading: 'WORKSPACE',
        items: workspaceItems,
      },
      {
        heading: 'FINANCE',
        items: [
          { route: 'wallet', label: 'My Wallet', icon: Wallet },
          { route: 'transactions', label: 'Transactions', icon: Receipt },
          { route: 'withdrawals', label: 'Withdrawal Requests', icon: ArrowDownToLine },
          { route: 'payment-history', label: 'Payment History', icon: CreditCard },
        ],
      },
      {
        heading: 'COMMUNICATION',
        items: [
          {
            route: 'messages',
            label: 'Messages',
            icon: MessageSquare,
            badgeCount: unreadMsgCount,
          },
          {
            route: 'notifications',
            label: 'Notifications',
            icon: Bell,
            badgeCount: unreadNotifCount,
          },
          { route: 'support', label: 'Help & Support', icon: HelpCircle },
        ],
      },
      {
        heading: 'ACCOUNT',
        items: [
          { route: 'profile', label: 'My Profile', icon: User },
          { route: 'settings', label: 'Account Settings', icon: Settings },
          { route: 'security', label: 'Security Settings', icon: Shield },
        ],
      },
    ];
  }, [isWorker, unreadMsgCount, unreadNotifCount]);

  const mobileTabs: NavEntry[] = useMemo(
    () =>
      isWorker
        ? [
            { route: 'dashboard', label: 'Home', icon: Home },
            { route: 'browse-tasks', label: 'Tasks', icon: Briefcase },
            { route: 'my-assignments', label: 'My Work', icon: ClipboardCheck },
            { route: 'wallet', label: 'Wallet', icon: Wallet },
            { route: 'profile', label: 'Profile', icon: User },
          ]
        : [
            { route: 'dashboard', label: 'Home', icon: Home },
            { route: 'post-task', label: 'Post Task', icon: PlusCircle },
            { route: 'active-projects', label: 'Projects', icon: FolderKanban },
            { route: 'received-bids', label: 'Bids', icon: Gavel },
            { route: 'profile', label: 'Profile', icon: User },
          ],
    [isWorker]
  );

  const meta = ROUTE_META[route] || ROUTE_META.dashboard;
  const userInitial = (userPrivate?.displayName || 'S').charAt(0).toUpperCase();

  const handleNavClick = (target: WorkspaceRoute) => {
    setMobileDrawerOpen(false);
    setProfileMenuOpen(false);
    onNavigate(target);
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    if (isWorker && route !== 'browse-tasks') {
      onNavigate('browse-tasks');
    } else if (!isWorker && route !== 'manage-tasks' && route !== 'received-bids') {
      onNavigate('manage-tasks');
    }
  };

  const isSharedRoute =
    route === 'wallet' ||
    route === 'transactions' ||
    route === 'withdrawals' ||
    route === 'payment-history' ||
    route === 'messages' ||
    route === 'notifications' ||
    route === 'support' ||
    route === 'profile' ||
    route === 'settings' ||
    route === 'security';

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex">
      {/* Desktop Fixed Vertical Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 swas-sidebar text-[#dce7f5] transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
        aria-label="Workspace Navigation"
      >
        <div
          className={`h-[68px] flex items-center border-b border-white/10 shrink-0 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          <button
            type="button"
            onClick={onNavigatePublicHome}
            title="SWAS TASKS Home"
            className="font-display text-[18px] font-bold tracking-tight text-white whitespace-nowrap cursor-pointer"
          >
            {collapsed ? 'ST' : 'SWAS TASKS'}
          </button>
          {!collapsed && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#a9bcd3]">
              {role}
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto swas-sidebar-scroll py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.heading}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8faac9] uppercase">
                  {group.heading}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      title={collapsed ? item.label : undefined}
                      onClick={() => handleNavClick(item.route)}
                      className={`group relative w-full flex items-center rounded-[10px] text-[13px] lg:text-[14px] font-medium transition-colors cursor-pointer ${
                        collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                      } ${
                        active
                          ? 'bg-[#1265c8] text-white shadow-[0_4px_14px_rgba(18,101,200,0.35)]'
                          : 'text-[#dce7f5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-[19px] h-[19px] shrink-0 ${
                            active ? 'text-white' : 'text-[#d5e4f5] group-hover:text-white'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </span>

                      {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-[11px] font-medium rounded-md tabular-nums ${
                            active ? 'bg-white/20 text-white' : 'bg-white/12 text-[#dce7f5]'
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      ) : null}

                      {collapsed && (
                        <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-[#102b50] border border-white/15 text-[12px] font-medium text-white whitespace-nowrap shadow-lg z-50">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              title={collapsed ? 'Sign Out' : undefined}
              onClick={onSignOut}
              className={`group relative w-full flex items-center rounded-[10px] text-[13px] lg:text-[14px] font-medium text-[#dce7f5] hover:bg-[#d34552]/20 hover:text-white transition-colors cursor-pointer ${
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              }`}
            >
              <LogOut className="w-[19px] h-[19px] text-[#d5e4f5] group-hover:text-white shrink-0" />
              {!collapsed && <span>Sign Out</span>}
              {collapsed && (
                <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-[#102b50] border border-white/15 text-[12px] font-medium text-white whitespace-nowrap shadow-lg z-50">
                  Sign Out
                </span>
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding-left] duration-200 ease-out ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 h-[68px] bg-white border-b border-[#dce5f0] px-4 md:px-6 flex items-center justify-between gap-4 shadow-[0_2px_12px_rgba(16,43,80,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-[18px] h-[18px]" />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open workspace menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-[#dce5f0] text-[#172b46] bg-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 swas-meta">
                <span>SWAS TASKS</span>
                <span>/</span>
                <span>{meta.section}</span>
                <span>/</span>
                <span className="text-[#1265c8] font-medium">{meta.title}</span>
              </div>
              <h1 className="swas-heading-page truncate">{meta.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
            <form onSubmit={handleHeaderSearchSubmit} className="hidden md:block relative w-56 lg:w-64">
              <Search className="w-4 h-4 text-[#75869d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={isWorker ? 'Search tasks...' : 'Search tasks or bids...'}
                className="w-full pl-9 pr-3 py-1.5 swas-input bg-[#f3f6fa] border border-[#dce5f0] rounded-[9px] focus:outline-none focus:bg-white focus:border-[#1265c8]"
              />
            </form>

            <button
              type="button"
              onClick={() => handleNavClick('notifications')}
              aria-label="Notifications"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d34552] text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('messages')}
              aria-label="Messages"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
              {unreadMsgCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1265c8] text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadMsgCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-[10px] border border-[#dce5f0] hover:bg-[#f3f6fa] cursor-pointer"
              >
                {userPrivate?.photoUrl ? (
                  <img
                    src={userPrivate.photoUrl}
                    alt={userPrivate.displayName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-[#102b50] text-white text-[12px] font-semibold flex items-center justify-center">
                    {userInitial}
                  </span>
                )}
                <span className="hidden sm:inline text-[13px] font-medium text-[#172b46] max-w-[110px] truncate">
                  {userPrivate?.displayName || 'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#75869d]" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#dce5f0] rounded-[12px] shadow-[0_14px_32px_rgba(16,43,80,0.14)] py-1.5 z-40">
                  <div className="px-3.5 py-2 border-b border-[#e1e8f2]">
                    <p className="text-[13px] font-semibold text-[#172b46] truncate">
                      {userPrivate?.displayName}
                    </p>
                    <p className="swas-meta capitalize">{role} Account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavClick('profile')}
                    className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('settings')}
                    className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
                  >
                    Account Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('security')}
                    className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
                  >
                    Security Settings
                  </button>
                  <div className="my-1 border-t border-[#e1e8f2]" />
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-[#d34552] hover:bg-[#fff0f0] cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Viewport with safe bottom clearance for mobile floating dock */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-28 lg:pb-10 max-w-[1400px] w-full mx-auto">
          {isSharedRoute ? (
            <SharedWorkspacePages
              route={route}
              wallet={wallet}
              transactions={transactions}
              withdrawals={withdrawals}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={onSelectConversation}
              notifications={notifications}
              supportTickets={supportTickets}
              onNavigate={onNavigate}
              onSignOut={onSignOut}
            />
          ) : isWorker ? (
            <WorkerPages
              route={route}
              headerSearch={headerSearch}
              publicTasks={publicTasks}
              workerBids={workerBids}
              workerAssignments={workerAssignments}
              savedTasks={savedTasks}
              wallet={wallet}
              transactions={transactions}
              onSelectTask={onSelectTask}
              onNavigate={onNavigate}
              onOpenChat={onOpenChat}
            />
          ) : (
            <ClientPages
              route={route}
              headerSearch={headerSearch}
              clientTasks={clientTasks}
              clientBids={clientBids}
              clientAssignments={clientAssignments}
              transactions={transactions}
              onNavigate={onNavigate}
              onOpenChat={onOpenChat}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="lg:hidden fixed bottom-3 inset-x-3 z-30 bg-white/95 backdrop-blur-md border border-[#dce5f0] rounded-[18px] shadow-[0_12px_30px_rgba(16,43,80,0.16)] px-2 py-1.5 grid grid-cols-5 gap-1"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = route === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => handleNavClick(tab.route)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-[12px] transition-colors cursor-pointer ${
                active ? 'bg-[#1265c8] text-white' : 'text-[#42556f]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="mt-0.5 text-[11px] font-medium truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Full Slide-Over Menu Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0b203d]/60"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] swas-sidebar text-[#dce7f5] h-full flex flex-col z-10 shadow-2xl">
            <div className="h-[68px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={onNavigatePublicHome}
                className="font-display text-[18px] font-bold tracking-tight text-white cursor-pointer"
              >
                SWAS TASKS
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close workspace menu"
                className="p-1.5 rounded-lg text-[#d5e4f5] hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto swas-sidebar-scroll py-4 px-3 space-y-5">
              {navGroups.map((group) => (
                <div key={group.heading}>
                  <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8faac9] uppercase">
                    {group.heading}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = route === item.route;
                      return (
                        <button
                          key={item.route}
                          type="button"
                          onClick={() => handleNavClick(item.route)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-[13px] font-medium cursor-pointer ${
                            active
                              ? 'bg-[#1265c8] text-white'
                              : 'text-[#dce7f5] hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              className={`w-[18px] h-[18px] ${
                                active ? 'text-white' : 'text-[#d5e4f5]'
                              }`}
                            />
                            <span>{item.label}</span>
                          </span>
                          {item.badgeCount && item.badgeCount > 0 ? (
                            <span className="px-1.5 py-0.5 text-[11px] font-medium bg-white/15 text-white rounded-md tabular-nums">
                              {item.badgeCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-[#dce7f5] hover:bg-[#d34552]/20 hover:text-white cursor-pointer"
                >
                  <LogOut className="w-[18px] h-[18px] text-[#d5e4f5]" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
