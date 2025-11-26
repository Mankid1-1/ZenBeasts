/**
 * Error recovery logic with retry for ZenBeasts
 * 
 * Features:
 * - Clear loading states on error (Requirement 9.1, 9.2, 9.3, 9.4, 9.5)
 * - Rollback optimistic UI updates
 * - Allow retry after error resolution
 * - Automatic retry with exponential backoff for network errors (Requirement 20.5)
 */

import { translateError, TranslatedError } from './errorTranslation'
import { withRetry } from '../connection'

/**
 * Error recovery state
 */
export interface ErrorRecoveryState {
  error: TranslatedError | null
  canRetry: boolean
  retryCount: number
  lastAttempt: number
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  
  // Network errors are retryable
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('blockhash not found')
  ) {
    return true
  }
  
  // RPC errors are retryable
  if (
    message.includes('429') || // Rate limit
    message.includes('503') || // Service unavailable
    message.includes('502')    // Bad gateway
  ) {
    return true
  }
  
  // Program errors are generally not retryable
  if (message.includes('custom program error')) {
    return false
  }
  
  // User cancellation is not retryable
  if (message.includes('user rejected') || message.includes('user denied')) {
    return false
  }
  
  // Default to not retryable for safety
  return false
}

/**
 * Create error recovery state from an error
 */
export function createErrorRecoveryState(error: Error | unknown): ErrorRecoveryState {
  const errorObj = error instanceof Error ? error : new Error('Unknown error')
  const translated = translateError(errorObj)
  
  return {
    error: translated,
    canRetry: isRetryableError(errorObj),
    retryCount: 0,
    lastAttempt: Date.now()
  }
}

/**
 * Execute an operation with error recovery
 * 
 * @param operation - Async function to execute
 * @param onError - Callback when error occurs
 * @param onSuccess - Callback when operation succeeds
 * @param onRetry - Optional callback before retry
 * @returns Promise with the result or null on failure
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  onError: (state: ErrorRecoveryState) => void,
  onSuccess: (result: T) => void,
  onRetry?: (attempt: number) => void
): Promise<T | null> {
  try {
    const result = await withRetry(operation, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    })
    
    onSuccess(result)
    return result
  } catch (error) {
    const recoveryState = createErrorRecoveryState(error)
    onError(recoveryState)
    return null
  }
}

/**
 * Retry an operation with updated state
 * 
 * @param operation - Async function to execute
 * @param currentState - Current error recovery state
 * @param onError - Callback when error occurs
 * @param onSuccess - Callback when operation succeeds
 * @returns Promise with the result or null on failure
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  currentState: ErrorRecoveryState,
  onError: (state: ErrorRecoveryState) => void,
  onSuccess: (result: T) => void
): Promise<T | null> {
  if (!currentState.canRetry) {
    return null
  }
  
  const newRetryCount = currentState.retryCount + 1
  
  try {
    const result = await operation()
    onSuccess(result)
    return result
  } catch (error) {
    const recoveryState = createErrorRecoveryState(error)
    recoveryState.retryCount = newRetryCount
    recoveryState.lastAttempt = Date.now()
    onError(recoveryState)
    return null
  }
}

/**
 * Hook-friendly error recovery manager
 */
export class ErrorRecoveryManager {
  private state: ErrorRecoveryState | null = null
  private onStateChange: (state: ErrorRecoveryState | null) => void
  
  constructor(onStateChange: (state: ErrorRecoveryState | null) => void) {
    this.onStateChange = onStateChange
  }
  
  /**
   * Execute an operation with automatic error recovery
   */
  async execute<T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void
  ): Promise<T | null> {
    try {
      const result = await withRetry(operation)
      
      // Clear error state on success
      this.clearError()
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (error) {
      this.handleError(error)
      return null
    }
  }
  
  /**
   * Retry the last failed operation
   */
  async retry<T>(operation: () => Promise<T>): Promise<T | null> {
    if (!this.state || !this.state.canRetry) {
      return null
    }
    
    const newRetryCount = this.state.retryCount + 1
    
    try {
      const result = await operation()
      this.clearError()
      return result
    } catch (error) {
      this.handleError(error, newRetryCount)
      return null
    }
  }
  
  /**
   * Handle an error and update state
   */
  private handleError(error: unknown, retryCount: number = 0): void {
    const errorObj = error instanceof Error ? error : new Error('Unknown error')
    const translated = translateError(errorObj)
    
    this.state = {
      error: translated,
      canRetry: isRetryableError(errorObj),
      retryCount,
      lastAttempt: Date.now()
    }
    
    this.onStateChange(this.state)
  }
  
  /**
   * Clear error state
   */
  clearError(): void {
    this.state = null
    this.onStateChange(null)
  }
  
  /**
   * Get current error state
   */
  getState(): ErrorRecoveryState | null {
    return this.state
  }
}

/**
 * Optimistic update manager for UI state
 */
export class OptimisticUpdateManager<T> {
  private originalState: T | null = null
  private updateCallback: (state: T) => void
  
  constructor(updateCallback: (state: T) => void) {
    this.updateCallback = updateCallback
  }
  
  /**
   * Apply an optimistic update
   */
  apply(currentState: T, optimisticState: T): void {
    this.originalState = currentState
    this.updateCallback(optimisticState)
  }
  
  /**
   * Rollback to original state on error
   */
  rollback(): void {
    if (this.originalState !== null) {
      this.updateCallback(this.originalState)
      this.originalState = null
    }
  }
  
  /**
   * Confirm the optimistic update (clear original state)
   */
  confirm(): void {
    this.originalState = null
  }
}

/**
 * Create a retry handler for React components
 */
export function createRetryHandler<T>(
  operation: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError: (error: TranslatedError | null) => void,
  onSuccess?: (result: T) => void
) {
  return async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await withRetry(operation)
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (error) {
      const translated = translateError(error)
      setError(translated)
      return null
    } finally {
      setLoading(false)
    }
  }
}
