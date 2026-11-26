import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatKes, normalizeUsername, validatePhoneNumber, validateUsername } from '../lib/validation';
import { checkUsernameAvailability } from '../lib/operationalService';
import {
  TASK_CATEGORIES,
  type AppRoute,
  type MarketplaceTask,
  type PolicyAcceptanceRecord,
  type PolicyCategory,
  type PolicyDocument,
  type PolicyRevision,
  type PublicRoute,
  type TaskCategory,
  type UserRole,
} from '../types/marketplace';
import { resolvePolicyBySlug, SIGNUP_REQUIRED_POLICY_SLUGS } from '../lib/policies';
import { PolicyCentreView, PolicyReaderModal } from './PolicyCentrePages';
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
  policyCategories: PolicyCategory[];
  policies: PolicyDocument[];
  policyRevisions: PolicyRevision[];
  userAcceptances: PolicyAcceptanceRecord[];
  activePolicySlug: string | null;
  onOpenPolicy: (slug?: string | null) => void;
  onNavigate: (route: AppRoute) => void;
  onSelectTask: (task: MarketplaceTask) => void;
}

export function PublicPages({
  route,
  tasks,
  tasksLoading,
  policyCategories,
  policies,
  policyRevisions,
  userAcceptances,
  activePolicySlug,
  onOpenPolicy,
  onNavigate,
  onSelectTask,
}: PublicPagesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [preferredSignupRole, setPreferredSignupRole] = useState<UserRole>('client');

  const handleCategoryPick = (cat: TaskCategory) => {
    setSelectedCategory(cat);
    onNavigate('tasks');
  };

  const handleStartWithRole = (role: UserRole) => {
    setPreferredSignupRole(role);
    onNavigate('signup');
  };

  if (route === 'home') {
    return (
      <HomeView
        tasks={tasks}
        tasksLoading={tasksLoading}
        onNavigate={onNavigate}
        onStartWithRole={handleStartWithRole}
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
    return (
      <AuthView
        mode={route}
        initialRole={preferredSignupRole}
        policies={policies}
        onOpenPolicy={onOpenPolicy}
        onNavigate={onNavigate}
      />
    );
  }
  if (route === 'policies' || route === 'terms' || route === 'privacy' || route === 'refund') {
    const resolvedSlug =
      route === 'terms'
        ? 'terms-and-conditions'
        : route === 'privacy'
        ? 'privacy'
        : route === 'refund'
        ? 'refund'
        : activePolicySlug;
    return (
      <PolicyCentreView
        categories={policyCategories}
        policies={policies}
        revisions={policyRevisions}
        userAcceptances={userAcceptances}
        activeSlug={resolvedSlug}
        onOpenPolicy={(slug) => onOpenPolicy(slug)}
        onBackToLibrary={() => onOpenPolicy(null)}
        onGoSignIn={() => onNavigate('login')}
      />
    );
  }

  return null;
}

function HomeView({
  tasks,
  tasksLoading,
  onNavigate,
  onStartWithRole,
  onSelectTask,
  onCategoryPick,
}: {
  tasks: MarketplaceTask[];
  tasksLoading: boolean;
  onNavigate: (route: AppRoute) => void;
  onStartWithRole: (role: UserRole) => void;
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
                onClick={() => (firebaseUser ? onNavigate('dashboard') : onStartWithRole('client'))}
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
                onClick={() => (firebaseUser ? onNavigate('dashboard') : onStartWithRole('worker'))}
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
        <div className="p-4 rounded-[10px] bg-[#f7faff] border border-[#dce5f0] space-y-1">
          <span className="block swas-desc">Official SWAS TASKS Email</span>
          <a
            href="mailto:swastaskorg@gmail.com"
            className="text-[15px] font-bold text-[#1265c8] hover:underline"
          >
            swastaskorg@gmail.com
          </a>
          <p className="swas-meta">Sender Display Name: SWAS TASKS · Reply-To: swastaskorg@gmail.com</p>
        </div>
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

function GoogleLogo() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function AuthView({
  mode,
  initialRole,
  policies,
  onOpenPolicy,
  onNavigate,
}: {
  mode: 'login' | 'signup' | 'forgot-password';
  initialRole: UserRole;
  policies: PolicyDocument[];
  onOpenPolicy: (slug?: string | null) => void;
  onNavigate: (route: AppRoute) => void;
}) {
  const {
    signInWithGoogle,
    completePendingGoogleLink,
    clearPendingGoogleLink,
    pendingGoogleLink,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    signingIn,
    authError,
    emailAuthUnavailable,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('KE');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [linkPassword, setLinkPassword] = useState('');
  const [acceptCorePolicies, setAcceptCorePolicies] = useState(false);
  const [acceptFinancialPolicies, setAcceptFinancialPolicies] = useState(false);
  const [modalPolicy, setModalPolicy] = useState<PolicyDocument | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleUsernameBlur = async () => {
    const clean = normalizeUsername(username);
    if (!clean || validateUsername(clean)) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const available = await checkUsernameAvailability(clean);
    setUsernameAvailable(available);
    setCheckingUsername(false);
  };

  const signupPolicies = useMemo(
    () =>
      SIGNUP_REQUIRED_POLICY_SLUGS.map((slug) => resolvePolicyBySlug(policies, slug)).filter(
        (p): p is PolicyDocument => Boolean(p)
      ),
    [policies]
  );

  const openModalBySlug = (slug: string) => {
    const docItem = resolvePolicyBySlug(policies, slug);
    if (docItem) setModalPolicy(docItem);
  };

  const buildAcceptedPayload = () =>
    signupPolicies.map((policy) => ({
      policy,
      context: 'registration_signup',
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setLocalError(null);
    clearAuthError();

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
      const ok = await loginWithEmail(email, password, rememberMe);
      if (ok) onNavigate('dashboard');
      return;
    }

    if (!acceptCorePolicies || !acceptFinancialPolicies) {
      setLocalError(
        'Please read and actively accept both the SWAS TASKS Legal & Conduct Policies and the Earnings & Withdrawals Policies before creating an account.'
      );
      return;
    }

    const unameErr = validateUsername(username);
    if (unameErr) {
      setLocalError(unameErr);
      return;
    }
    const cleanUname = normalizeUsername(username);
    const isAvail = await checkUsernameAvailability(cleanUname);
    setUsernameAvailable(isAvail);
    if (!isAvail) {
      setLocalError(`Username "@${cleanUname}" is already registered. Choose another unique username.`);
      return;
    }

    const phoneErr = validatePhoneNumber(phone);
    if (phoneErr) {
      setLocalError(phoneErr);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please confirm your password.');
      return;
    }

    const ok = await registerWithEmail({
      email,
      password,
      displayName,
      username: cleanUname,
      phone: phone.trim(),
      country,
      role,
      businessName,
      acceptedPolicies: buildAcceptedPayload(),
    });
    if (ok) {
      onNavigate('dashboard');
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setNotice(null);
    if (mode === 'signup') {
      if (!acceptCorePolicies || !acceptFinancialPolicies) {
        setLocalError(
          'Please read and check both policy acceptance boxes before continuing with Google Sign-Up.'
        );
        return;
      }
      const unameErr = validateUsername(username);
      if (unameErr) {
        setLocalError(unameErr);
        return;
      }
      const cleanUname = normalizeUsername(username);
      const isAvail = await checkUsernameAvailability(cleanUname);
      setUsernameAvailable(isAvail);
      if (!isAvail) {
        setLocalError(`Username "@${cleanUname}" is already taken. Choose another unique username.`);
        return;
      }
      const phoneErr = validatePhoneNumber(phone);
      if (phoneErr) {
        setLocalError(phoneErr);
        return;
      }
    }
    const ok = await signInWithGoogle(
      mode === 'signup'
        ? {
            role,
            displayName: displayName.trim() || undefined,
            username: normalizeUsername(username),
            phone: phone.trim(),
            country,
            businessName: role === 'client' ? businessName.trim() || undefined : undefined,
            acceptedPolicies: buildAcceptedPayload(),
          }
        : undefined,
      rememberMe
    );
    if (ok) onNavigate('dashboard');
  };

  const handleCompleteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const ok = await completePendingGoogleLink(linkPassword);
    if (ok) {
      setLinkPassword('');
      onNavigate('dashboard');
    }
  };

  const displayError = localError || authError;

  return (
    <div className="max-w-md mx-auto px-5 pt-10">
      <div className="swas-card rounded-[14px] p-7 md:p-8">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#1265c8] mb-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {mode === 'signup'
              ? 'SWAS TASKS Registration'
              : mode === 'forgot-password'
              ? 'Reset Password'
              : 'Workspace Sign In'}
          </span>
        </div>
        <h1 className="swas-heading-page">
          {mode === 'signup'
            ? 'Create Your SWAS TASKS Account'
            : mode === 'forgot-password'
            ? 'Recover your password'
            : 'Sign in to SWAS TASKS'}
        </h1>
        <p className="mt-1.5 swas-desc">
          {mode === 'forgot-password'
            ? 'Enter your account email and we will send a password reset link.'
            : mode === 'signup'
            ? 'Set up your SWAS TASKS client or worker workspace account.'
            : 'Access your SWAS TASKS client or worker dashboard securely.'}
        </p>

        {displayError && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552] leading-relaxed">
            {displayError}
          </div>
        )}

        {notice && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {pendingGoogleLink ? (
          <form onSubmit={handleCompleteLink} className="mt-5 space-y-4">
            <div className="p-3.5 rounded-[10px] bg-[#e9f2ff] border border-[#b7cff0] text-[13px] text-[#172b46] leading-relaxed">
              Confirm your existing SWAS TASKS password for{' '}
              <strong className="font-semibold">{pendingGoogleLink.email}</strong> to link Google Sign-In to your account without creating a duplicate profile.
            </div>
            <div>
              <label htmlFor="link-pass" className="block swas-label mb-1.5">
                Existing SWAS TASKS Password
              </label>
              <input
                id="link-pass"
                type="password"
                required
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Enter your existing password"
                className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
              />
            </div>
            <div className="flex gap-2.5">
              <button
                type="submit"
                disabled={signingIn}
                className="flex-1 py-2.5 px-4 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-60 cursor-pointer"
              >
                {signingIn ? 'Linking...' : 'Verify & Link Google'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPendingGoogleLink();
                  clearAuthError();
                  setLinkPassword('');
                }}
                className="px-4 py-2.5 bg-white border border-[#dce5f0] text-[#42556f] swas-btn-text rounded-[9px] hover:bg-[#f3f6fa] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {mode !== 'forgot-password' && (
              <div className="mt-4 p-3 rounded-[9px] bg-[#f7faff] border border-[#dce5f0] text-[12px] text-[#42556f] leading-relaxed">
                {emailAuthUnavailable
                  ? 'Email and password authentication is temporarily unavailable while our team completes setup. Please use Continue with Google below.'
                  : 'Email & password sign-in is currently being finalized by our development team. If unavailable, use Continue with Google below for instant access.'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <span className="block swas-label mb-1.5">Account Type</span>
                    <div className="grid grid-cols-2 gap-2.5">
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

                  <div>
                    <label htmlFor="auth-username" className="block swas-label mb-1.5">
                      Unique Username
                    </label>
                    <input
                      id="auth-username"
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                        setUsernameAvailable(null);
                      }}
                      onBlur={() => void handleUsernameBlur()}
                      placeholder="e.g., amina_o"
                      className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                    />
                    <p className="mt-1 text-[11px] text-[#5b6d85]">
                      {checkingUsername
                        ? 'Checking username availability...'
                        : usernameAvailable === true
                        ? `Username @${normalizeUsername(username)} is available.`
                        : usernameAvailable === false
                        ? `Username @${normalizeUsername(username)} is already taken.`
                        : '3–30 lowercase letters, numbers, or underscores.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-phone" className="block swas-label mb-1.5">
                        Phone Number
                      </label>
                      <input
                        id="auth-phone"
                        type="tel"
                        required
                        minLength={7}
                        maxLength={24}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 712 345 678"
                        className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-country" className="block swas-label mb-1.5">
                        Country
                      </label>
                      <select
                        id="auth-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                      >
                        <option value="KE">Kenya (KE)</option>
                        <option value="UG">Uganda (UG)</option>
                        <option value="TZ">Tanzania (TZ)</option>
                        <option value="RW">Rwanda (RW)</option>
                        <option value="NG">Nigeria (NG)</option>
                        <option value="GH">Ghana (GH)</option>
                        <option value="ZA">South Africa (ZA)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="US">United States (US)</option>
                        <option value="OTHER">Other International</option>
                      </select>
                    </div>
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
                  <label htmlFor="auth-pass" className="block swas-label mb-1.5">
                    Password
                  </label>
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

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-pass" className="block swas-label mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm-pass"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-3.5 py-2.5 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] focus:outline-none focus:border-[#1265c8]"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#42556f] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#d7e2ef] text-[#1265c8] focus:ring-[#1265c8]"
                    />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthError();
                      setLocalError(null);
                      onNavigate('forgot-password');
                    }}
                    className="text-[12px] font-semibold swas-link hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <div className="p-3.5 rounded-[10px] bg-[#f7faff] border border-[#d7e2ef] space-y-2.5 text-[12px] text-[#2a3f5d]">
                  <p className="font-semibold text-[#102b50]">
                    Required Legal & Governance Acceptance
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer leading-relaxed">
                    <input
                      type="checkbox"
                      checked={acceptCorePolicies}
                      onChange={(e) => setAcceptCorePolicies(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                    />
                    <span>
                      I have read and actively accept the{' '}
                      <button
                        type="button"
                        onClick={() => openModalBySlug('terms-and-conditions')}
                        className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        Terms & Conditions
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        onClick={() => openModalBySlug('privacy')}
                        className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      , and{' '}
                      <button
                        type="button"
                        onClick={() => openModalBySlug('user-conduct')}
                        className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        User Conduct Policy
                      </button>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer leading-relaxed">
                    <input
                      type="checkbox"
                      checked={acceptFinancialPolicies}
                      onChange={(e) => setAcceptFinancialPolicies(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                    />
                    <span>
                      I have read and agree to the{' '}
                      <button
                        type="button"
                        onClick={() => openModalBySlug('earnings')}
                        className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        Earnings Policy
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => openModalBySlug('withdrawals')}
                        className="font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        Withdrawal Governance Rules
                      </button>
                      .
                    </span>
                  </label>
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
                  <span className="text-[11px] font-semibold tracking-wider text-[#75869d]">OR</span>
                  <div className="flex-1 h-px bg-[#e1e8f2]" />
                </div>

                <button
                  type="button"
                  disabled={signingIn}
                  onClick={handleGoogle}
                  className="w-full py-2.5 px-4 bg-white border border-[#dce5f0] text-[#172b46] swas-btn-text rounded-[9px] shadow-[0_1px_3px_rgba(16,43,80,0.06)] hover:bg-[#f8fbff] hover:border-[#b7cff0] disabled:opacity-60 transition inline-flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <GoogleLogo />
                  <span>{signingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>

                <p className="mt-3 text-center swas-desc leading-relaxed">
                  {mode === 'signup'
                    ? 'Having trouble creating an account with your email and password? Continue with Google for an easier sign-up experience.'
                    : 'You can also securely access your SWAS TASKS account using your Google account.'}
                </p>
              </>
            )}
          </>
        )}

        {mode === 'login' && (
          <div className="mt-4 pt-3 border-t border-[#eef2f7] text-center text-[12px] text-[#5b6d85] space-x-2">
            <span>Review rules:</span>
            <button
              type="button"
              onClick={() => onOpenPolicy(null)}
              className="text-[#1265c8] font-medium hover:underline cursor-pointer"
            >
              Policy Centre
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onOpenPolicy('account-security')}
              className="text-[#1265c8] font-medium hover:underline cursor-pointer"
            >
              Account Security
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onOpenPolicy('privacy')}
              className="text-[#1265c8] font-medium hover:underline cursor-pointer"
            >
              Privacy
            </button>
          </div>
        )}

        <PolicyReaderModal
          policy={modalPolicy}
          onClose={() => setModalPolicy(null)}
        />

        <div className="mt-5 pt-4 border-t border-[#e1e8f2] text-center swas-desc">
          {mode === 'signup' ? (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  clearPendingGoogleLink();
                  setLocalError(null);
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
                  clearPendingGoogleLink();
                  setLocalError(null);
                  onNavigate('signup');
                }}
                className="swas-link font-semibold hover:underline cursor-pointer"
              >
                Create Your Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
