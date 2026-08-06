import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { translate } from '../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class component rendered outside I18nProvider (wraps Suspense boundaries
 * that may fail before the provider tree mounts), so it uses the
 * context-free `translate()` helper rather than the `useTranslation()` hook.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-panel p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 flex flex-col items-center justify-center text-center space-y-4 my-6">
          <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-base font-bold">{translate('zh-TW', 'error.boundary.title')}</h3>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {this.state.error?.message || translate('zh-TW', 'error.boundary.msg')}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {translate('zh-TW', 'error.boundary.reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
