import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = 'Something went wrong while loading this workspace view.';
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string };
        if (parsed.error && parsed.error.toLowerCase().includes('permission')) {
          friendlyMessage =
            'Access was denied by marketplace security rules. Please confirm you are signed in with a verified Google account.';
        } else if (parsed.error) {
          friendlyMessage = parsed.error;
        }
      } catch {
        friendlyMessage = this.state.message;
      }

      return (
        <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#e4eaf1] rounded-xl p-8">
            <p className="text-xs font-medium text-[#c33d4b] mb-2">Application Recovery</p>
            <h2 className="text-xl font-bold text-[#102d55] mb-2">Unable to complete operation</h2>
            <p className="text-sm text-[#5a6b82] mb-6 leading-relaxed">{friendlyMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#1769d2] text-white text-sm font-semibold rounded-lg hover:brightness-95 transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
