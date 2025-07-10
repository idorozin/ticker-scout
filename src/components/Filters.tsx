import { Filter } from 'lucide-react';

interface FiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  availableSectors: string[];
  marketCapRanges: any[];
}

export default function Filters({ filters, setFilters, availableSectors, marketCapRanges }: FiltersProps) {
  return (
    <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sector Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Sector
          </label>
          <select
            value={filters.sector}
            onChange={(e) => setFilters((prev: any) => ({ ...prev, sector: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Sectors</option>
            {availableSectors.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        {/* Market Cap Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Market Cap
          </label>
          <select
            onChange={(e) => {
              const selected = marketCapRanges.find(range => range.label === e.target.value);
              setFilters((prev: any) => ({
                ...prev,
                minMarketCap: selected?.min || '',
                maxMarketCap: selected?.max || ''
              }));
            }}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {marketCapRanges.map(range => (
              <option key={range.label} value={range.label}>{range.label}</option>
            ))}
          </select>
        </div>

        {/* Results Limit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Results Limit
          </label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((prev: any) => ({ ...prev, limit: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 Results</option>
            <option value={25}>25 Results</option>
            <option value={50}>50 Results</option>
            <option value={100}>100 Results</option>
          </select>
        </div>
      </div>
    </div>
  );
}
