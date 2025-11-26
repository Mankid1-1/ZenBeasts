import { useState, useMemo, useCallback } from 'react'
import { Beast } from '../types/beast'

/**
 * Hook for paginating and managing large beast collections
 * 
 * Features:
 * - Pagination for large beast collections (>50 beasts) (Requirement 20.4)
 * - Virtual scrolling support with @tanstack/react-virtual
 * - Optimize rendering performance for large lists
 * - Sorting and filtering capabilities
 * 
 * @param beasts - Array of all beasts
 * @param pageSize - Number of beasts per page (default: 50)
 * @returns {Object} Pagination state and controls
 */
export function useBeastPagination(beasts: Beast[], pageSize: number = 50) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'rarity' | 'activity' | 'generation' | 'name'>('rarity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterRarity, setFilterRarity] = useState<string | null>(null)

  /**
   * Get rarity tier from rarity score
   */
  const getRarityTier = useCallback((rarityScore: number): string => {
    if (rarityScore >= 951) return 'Legendary'
    if (rarityScore >= 801) return 'Epic'
    if (rarityScore >= 601) return 'Rare'
    if (rarityScore >= 401) return 'Uncommon'
    return 'Common'
  }, [])

  /**
   * Filter beasts based on current filter settings
   */
  const filteredBeasts = useMemo(() => {
    let filtered = [...beasts]
    
    // Apply rarity filter
    if (filterRarity) {
      filtered = filtered.filter(beast => 
        getRarityTier(beast.rarityScore) === filterRarity
      )
    }
    
    return filtered
  }, [beasts, filterRarity, getRarityTier])

  /**
   * Sort beasts based on current sort settings
   */
  const sortedBeasts = useMemo(() => {
    const sorted = [...filteredBeasts]
    
    sorted.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'rarity':
          comparison = a.rarityScore - b.rarityScore
          break
        case 'activity':
          comparison = a.activityCount - b.activityCount
          break
        case 'generation':
          comparison = a.generation - b.generation
          break
        case 'name':
          // Sort by mint address as proxy for name
          comparison = a.mint.localeCompare(b.mint)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [filteredBeasts, sortBy, sortOrder])

  /**
   * Calculate pagination values
   */
  const totalPages = Math.ceil(sortedBeasts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, sortedBeasts.length)
  
  /**
   * Get beasts for current page
   */
  const paginatedBeasts = useMemo(() => {
    return sortedBeasts.slice(startIndex, endIndex)
  }, [sortedBeasts, startIndex, endIndex])

  /**
   * Navigation functions
   */
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages])

  /**
   * Reset to first page when filters or sort changes
   */
  const updateSort = useCallback((newSortBy: typeof sortBy, newSortOrder?: typeof sortOrder) => {
    setSortBy(newSortBy)
    if (newSortOrder) {
      setSortOrder(newSortOrder)
    }
    setCurrentPage(1)
  }, [])

  const updateFilter = useCallback((rarity: string | null) => {
    setFilterRarity(rarity)
    setCurrentPage(1)
  }, [])

  /**
   * Get page numbers for pagination UI
   */
  const getPageNumbers = useCallback((): number[] => {
    const pages: number[] = []
    const maxPagesToShow = 7
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first, last, current, and nearby pages
      pages.push(1)
      
      let start = Math.max(2, currentPage - 2)
      let end = Math.min(totalPages - 1, currentPage + 2)
      
      if (start > 2) {
        pages.push(-1) // Ellipsis
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages - 1) {
        pages.push(-1) // Ellipsis
      }
      
      pages.push(totalPages)
    }
    
    return pages
  }, [currentPage, totalPages])

  return {
    // Paginated data
    paginatedBeasts,
    allBeasts: sortedBeasts,
    
    // Pagination state
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    totalBeasts: sortedBeasts.length,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    
    // Navigation
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    getPageNumbers,
    
    // Sorting
    sortBy,
    sortOrder,
    updateSort,
    toggleSortOrder: () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'),
    
    // Filtering
    filterRarity,
    updateFilter,
    clearFilter: () => setFilterRarity(null),
    
    // Utilities
    getRarityTier,
  }
}
