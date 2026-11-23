import type { PublicRoute } from '../types/marketplace';

interface FooterProps {
  onNavigate: (route: PublicRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 swas-footer text-[#dce7f5]">
      <div className="max-w-[1160px] mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-display text-[20px] font-bold tracking-tight text-white cursor-pointer"
          >
            SWAS TASKS
          </button>
          <p className="mt-3 text-[12px] font-normal text-[#a9bcd3] leading-relaxed max-w-xs">
            A two-sided task marketplace connecting clients who need work done with workers ready to deliver.
          </p>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8faac9] mb-3">
            Explore
          </h3>
          <div className="flex flex-col items-start gap-2 text-[14px] font-medium text-[#dce7f5]">
            <button type="button" onClick={() => onNavigate('about')} className="hover:text-white transition-colors cursor-pointer">
              About Us
            </button>
            <button type="button" onClick={() => onNavigate('how')} className="hover:text-white transition-colors cursor-pointer">
              How It Works
            </button>
            <button type="button" onClick={() => onNavigate('tasks')} className="hover:text-white transition-colors cursor-pointer">
              Browse Tasks
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8faac9] mb-3">
            Policies
          </h3>
          <div className="flex flex-col items-start gap-2 text-[14px] font-medium text-[#dce7f5]">
            <button type="button" onClick={() => onNavigate('terms')} className="hover:text-white transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button type="button" onClick={() => onNavigate('refund')} className="hover:text-white transition-colors cursor-pointer">
              Refund Policy
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8faac9] mb-3">
            Account
          </h3>
          <div className="flex flex-col items-start gap-2 text-[14px] font-medium text-[#dce7f5]">
            <button type="button" onClick={() => onNavigate('login')} className="hover:text-white transition-colors cursor-pointer">
              Sign In
            </button>
            <button type="button" onClick={() => onNavigate('signup')} className="hover:text-white transition-colors cursor-pointer">
              Create Account
            </button>
            <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1160px] mx-auto px-5 py-5 border-t border-white/15 text-[11px] text-[#a9bcd3]">
        © {year} SWAS TASKS. All marketplace records secured via verified accounts.
      </div>
    </footer>
  );
}
