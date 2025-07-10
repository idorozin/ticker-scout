import { TrendingUp, BarChart3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Stock Screener
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI-Powered S&P 500 Company Search
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <BarChart3 className="h-4 w-4" />
            <span>503 Companies</span>
          </div>
        </div>
      </div>
    </header>
  );
}
