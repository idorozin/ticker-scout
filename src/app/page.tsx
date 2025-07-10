'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import Filters from '../components/Filters';
import ResultsTable from '../components/ResultsTable';
import EmptyState from '../components/EmptyState';
import Welcome from '../components/Welcome';

// Utility function to format market capitalization numbers
function formatMarketCap(marketCap: number): string {
  if (!marketCap) return 'N/A';
  
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(1)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(1)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(1)}M`;
  } else {
    return `$${marketCap.toLocaleString()}`;
  }
}

export default function StockScreener() {
  // State variables for search, filters, results, and UI
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    sector: '',
    minMarketCap: '',
    maxMarketCap: '',
    limit: 50
  });
  const [error, setError] = useState('');
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);

  // Fetch available sectors from the API when the component mounts
  useEffect(() => {
    const loadSectors = async () => {
      try {
        const response = await fetch('/api/sectors');
        const data = await response.json();
        if (data.success) {
          setAvailableSectors(data.data);
        }
      } catch (err) {
        console.error('Failed to load sectors:', err);
      }
    };
    loadSectors();
  }, []);

  // Predefined market cap ranges for the filter dropdown
  const marketCapRanges = [
    { label: 'All', min: '', max: '' },
    { label: 'Mega Cap (>$200B)', min: '200000000000', max: '' },
    { label: 'Large Cap ($10B-$200B)', min: '10000000000', max: '200000000000' },
    { label: 'Mid Cap ($2B-$10B)', min: '2000000000', max: '10000000000' },
    { label: 'Small Cap (<$2B)', min: '', max: '2000000000' }
  ];

  // Function to handle the search request
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Construct the search URL with query parameters
      const url = new URL('/api/search', window.location.origin);
      url.searchParams.set('q', searchQuery.trim());
      if (filters.sector) url.searchParams.set('sector', filters.sector);
      if (filters.minMarketCap) url.searchParams.set('minMarketCap', filters.minMarketCap);
      if (filters.maxMarketCap) url.searchParams.set('maxMarketCap', filters.maxMarketCap);
      if (filters.limit) url.searchParams.set('limit', filters.limit.toString());
      
      // Fetch data from the API
      const response = await fetch(url);
      const data = await response.json();
      
      // Update results or error state based on the API response
      if (data.success) {
        setResults(data.data.companies || []);
      } else {
        setError(data.message || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError('An error occurred while searching');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SearchBar 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            handleSearch={handleSearch} 
            isLoading={isLoading} 
          />
          <Filters 
            filters={filters} 
            setFilters={setFilters} 
            availableSectors={availableSectors} 
            marketCapRanges={marketCapRanges} 
          />
        </div>

        {/* Display error message if there is an error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Display results, empty state, or welcome message */}
        {results.length > 0 ? (
          <ResultsTable results={results} formatMarketCap={formatMarketCap} />
        ) : !isLoading && !error && searchQuery ? (
          <EmptyState />
        ) : !searchQuery ? (
          <Welcome />
        ) : null}
      </main>
    </div>
  );
}