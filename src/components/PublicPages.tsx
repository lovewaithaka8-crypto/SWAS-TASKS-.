import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatKes } from '../lib/validation';
import {
  TASK_CATEGORIES,
  type AppRoute,
  type MarketplaceTask,
  type PublicRoute,
  type TaskCategory,
  type UserRole,
} from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

const HERO_IMG = '/src/assets/images/hero_marketplace_workspace_1795470718131.jpg';
const CLIENT_IMG = '/src/assets/images/feature_client_brief_1795470718562.jpg';
const WORKER_IMG = '/src/assets/images/feature_worker_delivery_1795470718506.jpg';

const CATEGORY_DESCRIPTIONS: Record<TaskCategory, string> = {
  'Data & Research': 'Lead enrichment, spreadsheet cleanup, market surveys, and catalog verification.',
  'Content & Copywriting': 'Product descriptions, social captions, newsletter drafts, and proofread copy.',
  'Design & Media': 'Social banners, presentation layouts, image cropping, and brand templates.',
  'QA & Testing': 'Mobile and web usability checks, bug reproduction logs, and checkout audits.',
  'Field & Errands': 'Local store audits, shelf photo verification, and regional courier handoffs.',
  'Web & Technical': 'Landing page updates, CMS publishing, DNS checks, and script automation.',
};

interface PublicPagesProps {
  route: PublicRoute;
  tasks: MarketplaceTask[];
  tasksLoading: boolean;
  onNavigate: (route: AppRoute) => void;
  onSelectTask: (task: MarketplaceTask) => void;
}

export function PublicPages({
  route,
  tasks,
  tasksLoading,
  onNavigate,
  onSelectTask,
}: PublicPagesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

  const handleCategoryPick = (cat: TaskCategory) => {
    setSelectedCategory(cat);
    onNavigate('tasks');
  };

  if (route === 'home') {
    return (
      <HomeView
        tasks={tasks}
        tasksLoading={tasksLoading}
        onNavigate={onNavigate}
        onSelectTask={onSelectTask}
        onCategoryPick={handleCategoryPick}
      />
    );
  }
  if (route === 'about') return <AboutView onNavigate={onNavigate} />;
  if (route === 'how') return <HowView onNavigate={onNavigate} />;
  if (route === 'tasks') {
    return (
      <PublicTasksView
        tasks={tasks}
        tasksLoading={tasksLoading}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSelectTask={onSelectTask}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'contact') return <PublicContactView onNavigate={onNavigate} />;
  if (route === 'login' || route === 'signup' || route === 'forgot-password') {
    return <AuthView mode={route} onNavigate={onNavigate} />;
  }
  if (route === 'terms' || route === 'privacy' || route === 'refund') {
    return <PolicyView kind={route} onNavigate={onNavigate} />;
  }

  return null;
}

function HomeView({
  tasks,
  tasksLoading,
  onNavigate,
  onSelectTask,
  onCategoryPick,
}: {
  tasks: MarketplaceTask[];
  tasksLoading: boolean;
  onNavigate: (route: AppRoute) => void;
  onSelectTask: (task: MarketplaceTask) => void;
  onCategoryPick: (cat: TaskCategory) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const openTasks = tasks.filter((t) => t.status === 'open');
  const featured = openTasks.slice(0, 3);

  const primaryAction = () => {
    if (!firebaseUser) return onNavigate('tasks');
    return onNavigate(userPrivate?.role === 'client' ? 'post-task' : 'browse-tasks');
  };

  return (
    <div className="max-w-[1160px] mx-auto px-5 pt-8 space-y-14">
      <section className="swas-hero rounded-[18px] p-7 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-white">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <p className="text-[12px] font-medium text-[#dce7f5] tracking-wide mb-3">
            Two-Sided Task Marketplace · Settled in Kenyan Shillings (KES)
          </p>
          <h1
            className="font-display text-[28px] md:text-[38px] font-bold text-white leading-[1.15] tracking-tight max-w-2xl"
            style={{ textWrap: 'balance' }}
          >
            Hire reliable talent. Bid on real tasks. Deliver in KES.
          </h1>
          <p className="mt-4 text-[14px] text-[#dce7f5] max-w-xl leading-relaxed">
            SWAS TASKS pairs independent workers and project clients in dedicated role-tailored workspaces—from task bidding and assignment tracking to real-time messaging and verified ledger history.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={primaryAction}
              className="px-5 py-3 bg-white text-[#172b46] swas-btn-text rounded-[9px] hover:bg-[#e9f2ff] transition inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              {firebaseUser
                ? userPrivate?.role === 'client'
                  ? 'Post a Client Task'
                  : 'Open Worker Marketplace'
                : 'Browse Open Tasks'}
              <ArrowRight className="w-4 h-4 text-[#1265c8]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(firebaseUser ? 'dashboard' : 'signup')}
              className="px-5 py-3 bg-white/12 border border-white/25 text-white swas-btn-text rounded-[9px] hover:bg-white/20 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              {firebaseUser ? 'Enter Workspace' : 'Create Account'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white/10 border border-white/22 backdrop-blur-md rounded-2xl p-3 flex items-stretch min-h-[250px] lg:min-h-[340px]">
          <ResilientImage
            src={HERO_IMG}
            alt="Professionals collaborating on task deliverables at a bright studio desk"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      </section>


      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="swas-heading-page">Marketplace Categories</h2>
            <p className="mt-1 swas-desc">
              Explore active tasks across core business and technical disciplines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="text-[14px] font-semibold swas-link hover:underline self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            View all open tasks
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TASK_CATEGORIES.map((category, idx) => {
            const count = openTasks.filter((t) => t.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryPick(category)}
                className="text-left swas-card-hover rounded-[13px] p-6 cursor-pointer group"
              >
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-[12px] font-semibold text-[#1265c8] tabular-nums">
                    0{idx + 1}.
                  </span>
                  <span className="swas-meta tabular-nums">
                    {count} {count === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <h3 className="swas-heading-section group-hover:text-[#1265c8] transition-colors">
                  {category}
                </h3>
                <p className="mt-2 swas-body">{CATEGORY_DESCRIPTIONS[category]}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="swas-card rounded-[13px] overflow-hidden flex flex-col">
          <div className="h-52 bg-[#e9f2ff]">
            <ResilientImage
              src={CLIENT_IMG}
              alt="Structured task brief and project schedule on a stone desk"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-7 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#1265c8] mb-1.5">Client Workspace</p>
              <h3 className="swas-heading-section">
                Post briefs, evaluate bids, and manage projects
              </h3>
              <p className="mt-2 swas-body">
                Publish tasks with budgets and skills, review worker proposals, accept the right fit into an active assignment, request revisions, and approve final delivery.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onNavigate(firebaseUser ? 'dashboard' : 'signup')}
                className="px-4 py-2 swas-btn-text text-[#1265c8] hover:text-[#0d4fa5] bg-[#e9f2ff] rounded-[9px] hover:bg-[#dcebff] transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start as a Client
              </button>
            </div>
          </div>
        </div>

        <div className="swas-card rounded-[13px] overflow-hidden flex flex-col">
          <div className="h-52 bg-[#e9f2ff]">
            <ResilientImage
              src={WORKER_IMG}
              alt="Focused specialist completing a digital deliverable on a laptop"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-7 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#1265c8] mb-1.5">Worker Workspace</p>
              <h3 className="swas-heading-section">
                Bid competitively, deliver work, track KES earnings
              </h3>
              <p className="mt-2 swas-body">
                Save promising tasks, submit custom KES proposals with timelines, track accepted assignments, message clients in real time, and monitor verified wallet records.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onNavigate(firebaseUser ? 'dashboard' : 'signup')}
                className="px-4 py-2 swas-btn-text text-[#1265c8] hover:text-[#0d4fa5] bg-[#e9f2ff] rounded-[9px] hover:bg-[#dcebff] transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start as a Worker
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="swas-heading-page">Latest Open Tasks</h2>
            <p className="mt-1 swas-desc">
              Real public tasks published by clients on SWAS TASKS.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="text-[14px] font-semibold swas-link hover:underline self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            Browse full marketplace
          </button>
        </div>

        {tasksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="swas-card rounded-[13px] p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="swas-card rounded-[13px] p-10 text-center">
            <h3 className="swas-heading-section">No open tasks posted yet</h3>
            <p className="mt-2 swas-desc max-w-md mx-auto">
              Register a Client account to publish the first task and begin receiving worker bids.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(firebaseUser ? 'dashboard' : 'signup')}
              className="mt-5 px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] cursor-pointer"
            >
              {firebaseUser ? 'Open Workspace' : 'Register Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featured.map((task) => (
              <div
                key={task.id}
                className="swas-card-hover rounded-[13px] p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="swas-meta mb-2">
                    {task.category} · Due {task.deadline}
                  </p>
                  <h3 className="swas-heading-card text-[#172b46]">{task.title}</h3>
                  <p className="mt-2 swas-body line-clamp-3">{task.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#e1e8f2] flex items-center justify-between gap-3">
                  <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                    {formatKes(task.budgetKes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="px-3.5 py-2 swas-btn-text text-[#1265c8] hover:text-[#0d4fa5] bg-[#e9f2ff] rounded-[9px] hover:bg-[#dcebff] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View & Bid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AboutView({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <div className="max-w-[1160px] mx-auto px-5 pt-10 space-y-10">
      <div className="max-w-2xl">
        <h1 className="swas-heading-main">
          Designed for structured, accountable online work
        </h1>
        <p className="mt-3 swas-body">
          SWAS TASKS separates client project orchestration from worker bidding and delivery so both sides get dedicated tools, verifiable records, and transparent KES terms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="swas-card rounded-[13px] p-6">
          <span className="text-[12px] font-semibold text-[#1265c8]">01.</span>
          <h2 className="mt-2 swas-heading-section">Role-Separated Workspaces</h2>
          <p className="mt-2 swas-body">
            Workers and clients operate in tailored navigation flows backed by Firestore security rule role checks.
          </p>
        </div>
        <div className="swas-card rounded-[13px] p-6">
          <span className="text-[12px] font-semibold text-[#1265c8]">02.</span>
          <h2 className="mt-2 swas-heading-section">Bid-to-Assignment Lifecycle</h2>
          <p className="mt-2 swas-body">
            Accepting a bid atomically binds the agreed KES amount, timeline, and assignment tracking between client and worker.
          </p>
        </div>
        <div className="swas-card rounded-[13px] p-6">
          <span className="text-[12px] font-semibold text-[#1265c8]">03.</span>
          <h2 className="mt-2 swas-heading-section">Honest Financial Records</h2>
          <p className="mt-2 swas-body">
            Approved deliverables record pending KES ledger entries until confirmed by backend payment-provider settlement.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('tasks')}
        className="px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] cursor-pointer"
      >
        Explore Open Tasks
      </button>
    </div>
  );
}

function HowView({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const steps = [
    {
      num: '01',
      title: 'Client Publishes Brief',
      desc: 'Define task scope, required skills, KES budget, deadline, and visibility in the Client Workspace.',
    },
    {
      num: '02',
      title: 'Workers Submit Bids',
      desc: 'Workers review requirements, propose a KES rate and delivery timeline, and submit an original proposal.',
    },
    {
      num: '03',
      title: 'Assignment & Revisions',
      desc: 'Accepted bids become active assignments with deliverable submission, direct messaging, and revision cycles.',
    },
    {
      num: '04',
      title: 'Approval & KES Ledger',
      desc: 'Client approval transitions the assignment to completed and logs the pending KES settlement record.',
    },
  ];

  return (
    <div className="max-w-[1160px] mx-auto px-5 pt-10 space-y-10">
      <div className="max-w-2xl">
        <h1 className="swas-heading-main">How SWAS TASKS Works</h1>
        <p className="mt-3 swas-body">
          A four-stage workflow from task publication to verified completion.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s) => (
          <div key={s.num} className="swas-card rounded-[13px] p-6">
            <span className="swas-stat text-[#2877d5]">{s.num}</span>
            <h2 className="mt-3 swas-heading-section">{s.title}</h2>
            <p className="mt-2 swas-body">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] cursor-pointer"
        >
          Browse Tasks
        </button>
        <button
          type="button"
          onClick={() => onNavigate('signup')}
          className="px-5 py-2.5 bg-white border border-[#dce5f0] text-[#172b46] swas-btn-text rounded-[9px] hover:bg-[#e9f2ff] cursor-pointer"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}

function PublicTasksView({
  tasks,
  tasksLoading,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  onSelectTask,
  onNavigate,
}: {
  tasks: MarketplaceTask[];
  tasksLoading: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: 'newest' | 'highest' | 'lowest';
  setSortBy: (s: 'newest' | 'highest' | 'lowest') => void;
  onSelectTask: (task: MarketplaceTask) => void;
  onNavigate: (route: AppRoute) => void;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = openTasks.filter((t) => {
      const catMatch = selectedCategory === 'All' || t.category === selectedCategory;
      const textMatch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        (t.skills || []).some((s) => s.toLowerCase().includes(q));
      return catMatch && textMatch;
    });

    if (sortBy === 'highest') return [...list].sort((a, b) => b.budgetKes - a.budgetKes);
    if (sortBy === 'lowest') return [...list].sort((a, b) => a.budgetKes - b.budgetKes);
    return list;
  }, [openTasks, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-[1160px] mx-auto px-5 pt-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="swas-heading-main">Browse Open Tasks</h1>
          <p className="mt-1 swas-desc">
            Inspect live client briefs and sign in as a Worker to submit bids.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            firebaseUser
              ? onNavigate(userPrivate?.role === 'client' ? 'post-task' : 'dashboard')
              : onNavigate('signup')
          }
          className="px-4 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
        >
          {firebaseUser ? 'Go to Workspace' : 'Register to Bid or Post'}
        </button>
      </div>

      <div className="swas-card rounded-[13px] p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#75869d] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, skills, or client..."
              className="w-full pl-10 pr-4 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
            />
          </div>
          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
            className="px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="highest">Sort: Highest Budget</option>
            <option value="lowest">Sort: Lowest Budget</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {['All', ...TASK_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 swas-btn-text rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {tasksLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="swas-card rounded-[13px] p-6 h-52 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="swas-card rounded-[13px] p-12 text-center">
          <h2 className="swas-heading-section">No open tasks match your filters</h2>
          <p className="mt-2 swas-desc max-w-md mx-auto">
            {openTasks.length === 0
              ? 'No client tasks have been published yet.'
              : 'Try adjusting your search keywords or selecting All categories.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="swas-card-hover rounded-[13px] p-6 flex flex-col justify-between"
            >
              <div>
                <p className="swas-meta mb-2">
                  {task.category} · Due {task.deadline}
                </p>
                <h3 className="swas-heading-card text-[#172b46]">{task.title}</h3>
                <p className="mt-2 swas-body line-clamp-3">{task.description}</p>
                {task.skills && task.skills.length > 0 && (
                  <p className="mt-3 swas-desc">Skills: {task.skills.join(' · ')}</p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#e1e8f2] flex items-center justify-between gap-3">
                <span className="text-[16px] font-bold text-[#172b46] tabular-nums">
                  {formatKes(task.budgetKes)}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectTask(task)}
                  className="px-3.5 py-2 swas-btn-text swas-btn-primary rounded-[9px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View & Bid
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicContactView({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const { firebaseUser } = useAuth();
  return (
    <div className="max-w-xl mx-auto px-5 pt-10">
      <div className="swas-card rounded-[13px] p-8 space-y-4">
        <h1 className="swas-heading-page">Contact SWAS TASKS Support</h1>
        <p className="swas-body">
          All support inquiries are linked directly to your verified workspace account so our operations team can trace task IDs, bids, and KES ledger references accurately.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(firebaseUser ? 'support' : 'login')}
          className="px-5 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] cursor-pointer"
        >
          {firebaseUser ? 'Open Workspace Support Desk' : 'Sign In to Open Support Ticket'}
        </button>
      </div>
    </div>
  );
}

function AuthView({
  mode,
  onNavigate,
}: {
  mode: 'login' | 'signup' | 'forgot-password';
  onNavigate: (route: AppRoute) => void;
}) {
  const {
    signInWithGoogle,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    signingIn,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (mode === 'forgot-password') {
      const ok = await resetPassword(email);
      if (ok) {
        setNotice(
          'Password reset link sent. Check your inbox (and spam folder) to choose a new password.'
        );
      }
      return;
    }

    if (mode === 'login') {
      const ok = await loginWithEmail(email, password);
      if (ok) onNavigate('dashboard');
      return;
    }

    const ok = await registerWithEmail({
      email,
      password,
      displayName,
      role,
      businessName,
    });
    if (ok) {
      onNavigate('dashboard');
    }
  };

  const handleGoogle = async () => {
    const ok = await signInWithGoogle(
      mode === 'signup' ? { role, displayName: displayName.trim() || undefined, businessName } : undefined
    );
    if (ok) onNavigate('dashboard');
  };

  return (
    <div className="max-w-md mx-auto px-5 pt-10">
      <div className="swas-card rounded-[14px] p-7 md:p-8">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#1265c8] mb-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {mode === 'signup'
              ? 'Create Account'
              : mode === 'forgot-password'
              ? 'Reset Password'
              : 'Workspace Sign In'}
          </span>
        </div>
        <h1 className="swas-heading-page">
          {mode === 'signup'
            ? 'Join SWAS TASKS'
            : mode === 'forgot-password'
            ? 'Recover your password'
            : 'Sign in to SWAS TASKS'}
        </h1>
        <p className="mt-1.5 swas-desc">
          {mode === 'forgot-password'
            ? 'Enter your account email and we will send a Firebase password reset link.'
            : 'Access your role-specific Worker or Client workspace.'}
        </p>

        {authError && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552] leading-relaxed">
            {authError}
          </div>
        )}

        {notice && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <span className="block swas-label mb-1.5">Account Role</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`py-2.5 px-3 text-left rounded-[9px] border transition cursor-pointer ${
                      role === 'worker'
                        ? 'bg-[#e9f2ff] border-[#1265c8] text-[#172b46]'
                        : 'bg-[#f9fbfe] border-[#d7e2ef] text-[#42556f]'
                    }`}
                  >
                    <span className="block text-[13px] font-semibold">I am a Worker</span>
                    <span className="block swas-desc">Bid & deliver tasks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`py-2.5 px-3 text-left rounded-[9px] border transition cursor-pointer ${
                      role === 'client'
                        ? 'bg-[#e9f2ff] border-[#1265c8] text-[#172b46]'
                        : 'bg-[#f9fbfe] border-[#d7e2ef] text-[#42556f]'
                    }`}
                  >
                    <span className="block text-[13px] font-semibold">I am a Client</span>
                    <span className="block swas-desc">Post tasks & hire</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="auth-name" className="block swas-label mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Amina Ochieng"
                  className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                />
              </div>

              {role === 'client' && (
                <div>
                  <label htmlFor="auth-biz" className="block swas-label mb-1.5">
                    Business / Organization Name (Optional)
                  </label>
                  <input
                    id="auth-biz"
                    type="text"
                    maxLength={100}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Savanna Logistics Ltd"
                    className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block swas-label mb-1.5">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
            />
          </div>

          {mode !== 'forgot-password' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-pass" className="block swas-label">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthError();
                      onNavigate('forgot-password');
                    }}
                    className="text-[12px] font-semibold swas-link hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-pass"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn}
            className="w-full py-2.5 px-4 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
          >
            {signingIn
              ? 'Please wait...'
              : mode === 'signup'
              ? 'Create Account'
              : mode === 'forgot-password'
              ? 'Send Reset Link'
              : 'Sign In'}
          </button>
        </form>

        {mode !== 'forgot-password' && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e1e8f2]" />
              <span className="swas-meta">OR</span>
              <div className="flex-1 h-px bg-[#e1e8f2]" />
            </div>

            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 bg-white border border-[#dce5f0] text-[#172b46] swas-btn-text rounded-[9px] hover:bg-[#e9f2ff] disabled:opacity-60 transition cursor-pointer"
            >
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-5 pt-4 border-t border-[#e1e8f2] text-center swas-desc">
          {mode === 'signup' ? (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  onNavigate('login');
                }}
                className="swas-link font-semibold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  onNavigate('signup');
                }}
                className="swas-link font-semibold hover:underline cursor-pointer"
              >
                Register here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyView({
  kind,
  onNavigate,
}: {
  kind: 'terms' | 'privacy' | 'refund';
  onNavigate: (route: AppRoute) => void;
}) {
  const content = {
    terms: {
      title: 'Terms of Service',
      body: [
        'Clients posting tasks on SWAS TASKS must state clear deliverable criteria, realistic deadlines, and accurate budgets in Kenyan Shillings (KES).',
        'Workers must submit genuine, original proposals and deliverables matching agreed assignment specifications.',
        'Accepted bids become binding assignments. Final ledger settlement is subject to client approval and backend payment-provider verification.',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      body: [
        'Private contact numbers, notification preferences, and account settings are isolated inside user-owned Firestore documents.',
        'Public marketplace profiles expose only your display name, role, bio, and optional skills or business name.',
      ],
    },
    refund: {
      title: 'Refund & Settlement Policy',
      body: [
        'Clients review submitted deliverables and may request revisions before approving an assignment.',
        'No payment is marked settled without confirmed backend payment-provider verification.',
      ],
    },
  }[kind];

  return (
    <div className="max-w-3xl mx-auto px-5 pt-10">
      <div className="swas-card rounded-[13px] p-8 space-y-4">
        <h1 className="swas-heading-page">{content.title}</h1>
        {content.body.map((p, idx) => (
          <p key={idx} className="swas-body">
            {p}
          </p>
        ))}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-[14px] font-semibold swas-link hover:underline cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
