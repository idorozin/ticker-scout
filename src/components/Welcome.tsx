import { TrendingUp, Filter, BarChart3 } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="text-center py-16">
      <TrendingUp className="mx-auto h-16 w-16 text-blue-600" />
      <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        Welcome to Stock Screener
      </h2>
      <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
        Search through 503 S&P 500 companies using natural language descriptions.
        Find companies by sector, market cap, or business characteristics.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Smart Filtering</h3>
          <p className="text-slate-600 dark:text-slate-400">
            Filter by business sector, market capitalization, or company size
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Rich Data</h3>
          <p className="text-slate-600 dark:text-slate-400">
            Access detailed company information including industry and market cap
          </p>
        </div>
      </div>
    </div>
  );
}
