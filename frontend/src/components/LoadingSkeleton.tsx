/**
 * Loading skeleton components for displaying loading states
 * Requirement 20.1: Display loading skeleton while fetching on-chain data
 */

interface LoadingSkeletonProps {
  className?: string;
}

/**
 * Generic loading skeleton for text content
 */
export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

/**
 * Loading skeleton for beast card display
 */
export function BeastCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4 bg-white shadow-sm">
      {/* Beast image placeholder */}
      <LoadingSkeleton className="w-full h-48" />
      
      {/* Beast name */}
      <LoadingSkeleton className="h-6 w-3/4" />
      
      {/* Rarity score */}
      <LoadingSkeleton className="h-4 w-1/2" />
      
      {/* Traits */}
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-full" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <LoadingSkeleton className="h-10 flex-1" />
        <LoadingSkeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for beast collection grid
 */
export function BeastCollectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <BeastCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for wallet info display
 */
export function WalletInfoSkeleton() {
  return (
    <div className="space-y-2">
      <LoadingSkeleton className="h-4 w-32" />
      <LoadingSkeleton className="h-6 w-48" />
    </div>
  );
}

/**
 * Loading skeleton for activity panel
 */
export function ActivityPanelSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-10 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
      <LoadingSkeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Loading skeleton for upgrade panel
 */
export function UpgradePanelSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-10 w-full" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <LoadingSkeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Full page loading indicator
 */
export function PageLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-gray-600">Loading ZenBeasts...</p>
      </div>
    </div>
  );
}
