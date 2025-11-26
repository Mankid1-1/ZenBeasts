'use client';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBeasts } from '../../hooks/useBeasts';
import { useBeastPagination } from '../../hooks/useBeastPagination';
import { BeastCard } from './BeastCard';
import { LoadingSkeleton } from '../LoadingSkeleton';

/**
 * BeastCollection component with virtual scrolling and pagination
 * 
 * Features:
 * - Display all beasts owned by connected wallet (Requirement 6.4)
 * - Virtual scrolling for large collections (>50 beasts) (Requirement 20.4)
 * - Pagination controls for navigation
 * - Sorting and filtering capabilities
 * - Loading states with skeleton display (Requirement 20.1)
 * - Mobile-responsive layout (Requirement 21.1)
 * 
 * @param props.useVirtualScroll - Enable virtual scrolling (default: true for >50 beasts)
 * @param props.pageSize - Number of beasts per page (default: 50)
 */
interface BeastCollectionProps {
  useVirtualScroll?: boolean;
  pageSize?: number;
}

export default function BeastCollection({ 
  useVirtualScroll = true, 
  pageSize = 50 
}: BeastCollectionProps) {
  const { beasts, loading, error, refetch } = useBeasts();
  const parentRef = useRef<HTMLDivElement>(null);
  
  const {
    paginatedBeasts,
    currentPage,
    totalPages,
    totalBeasts,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    getPageNumbers,
    sortBy,
    sortOrder,
    updateSort,
    toggleSortOrder,
    filterRarity,
    updateFilter,
    clearFilter,
    getRarityTier,
  } = useBeastPagination(beasts, pageSize);

  // Determine if we should use virtual scrolling
  const shouldUseVirtualScroll = useVirtualScroll && totalBeasts > 50;

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: paginatedBeasts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated height of BeastCard
    overscan: 5, // Render 5 extra items above and below viewport
    enabled: shouldUseVirtualScroll,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Loading state
  if (loading && beasts.length === 0) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 border border-red-500/50 p-6 text-center">
        <p className="text-red-400 mb-4">Failed to load beasts: {error.message}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (beasts.length === 0) {
    return (
      <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-12 text-center">
        <p className="text-slate-400 text-lg mb-2">No beasts found</p>
        <p className="text-slate-500 text-sm">
          Connect your wallet and mint your first ZenBeast to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            Your Beasts ({totalBeasts})
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {shouldUseVirtualScroll && 'Using virtual scrolling for optimal performance'}
          </p>
        </div>

        {/* Sort and filter controls */}
        <div className="flex flex-wrap gap-3">
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => updateSort(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="rarity">Sort by Rarity</option>
            <option value="activity">Sort by Activity</option>
            <option value="generation">Sort by Generation</option>
            <option value="name">Sort by Name</option>
          </select>

          {/* Sort order toggle */}
          <button
            onClick={toggleSortOrder}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* Rarity filter */}
          <select
            value={filterRarity || ''}
            onChange={(e) => updateFilter(e.target.value || null)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>

          {filterRarity && (
            <button
              onClick={clearFilter}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Beast grid with virtual scrolling */}
      {shouldUseVirtualScroll ? (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: '800px' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem: { index: number; size: number; start: number; key: string }) => {
              const beast = paginatedBeasts[virtualItem.index];
              return (
                <div
                  key={beast.mint}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="p-2">
                    <BeastCard beast={beast} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedBeasts.map((beast) => (
            <BeastCard key={beast.mint} beast={beast} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            {/* First page */}
            <button
              onClick={goToFirstPage}
              disabled={!hasPreviousPage}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="First page"
            >
              ««
            </button>

            {/* Previous page */}
            <button
              onClick={previousPage}
              disabled={!hasPreviousPage}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              «
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((pageNum, idx) => {
              if (pageNum === -1) {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pageNum === currentPage
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === currentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next page */}
            <button
              onClick={nextPage}
              disabled={!hasNextPage}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              »
            </button>

            {/* Last page */}
            <button
              onClick={goToLastPage}
              disabled={!hasNextPage}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Last page"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
