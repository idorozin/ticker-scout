import { Search } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="text-center py-12">
      <Search className="mx-auto h-12 w-12 text-slate-400" />
      <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No results found</h3>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Try adjusting your search terms or filters
      </p>
    </div>
  );
}
