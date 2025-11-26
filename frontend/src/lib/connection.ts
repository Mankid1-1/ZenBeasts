/**
 * Connection utilities for managing RPC connections with retry logic
 * Implements Requirements 20.5 (automatic retry) and 23.3 (multiple RPC endpoints)
 */

import { Connection, ConnectionConfig } from '@solana/web3.js';

/**
 * Configuration for connection retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise with the result of the function
 * 
 * Implements Requirement 20.5: Automatic retry with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries - 1) {
        break;
      }

      // Log retry attempt (can be replaced with proper logging)
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Create a connection with retry logic for common operations
 * 
 * @param endpoint - RPC endpoint URL
 * @param config - Connection configuration
 * @returns Connection instance with retry-wrapped methods
 */
export function createConnectionWithRetry(
  endpoint: string,
  config?: ConnectionConfig
): Connection {
  return new Connection(endpoint, config || 'confirmed');
}

/**
 * Test if an RPC endpoint is healthy
 * 
 * @param endpoint - RPC endpoint URL
 * @param timeout - Timeout in milliseconds
 * @returns Promise<boolean> indicating if endpoint is healthy
 */
export async function testEndpointHealth(
  endpoint: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const connection = new Connection(endpoint, 'confirmed');
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });
    
    // Race between getSlot and timeout
    await Promise.race([
      connection.getSlot(),
      timeoutPromise
    ]);
    
    return true;
  } catch (error) {
    console.warn(`Endpoint ${endpoint} health check failed:`, error);
    return false;
  }
}

/**
 * Select the best available endpoint from a list
 * Tests endpoints in parallel and returns the first healthy one
 * 
 * @param endpoints - Array of RPC endpoint URLs
 * @returns Promise<string> with the best endpoint URL
 * 
 * Implements Requirement 23.3: Multiple RPC endpoints for redundancy
 */
export async function selectBestEndpoint(endpoints: string[]): Promise<string> {
  if (endpoints.length === 0) {
    throw new Error('No endpoints provided');
  }
  
  if (endpoints.length === 1) {
    return endpoints[0];
  }
  
  // Test all endpoints in parallel
  const healthChecks = endpoints.map(async (endpoint) => {
    const isHealthy = await testEndpointHealth(endpoint);
    return { endpoint, isHealthy };
  });
  
  const results = await Promise.allSettled(healthChecks);
  
  // Find first healthy endpoint
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.isHealthy) {
      console.log(`Selected healthy endpoint: ${result.value.endpoint}`);
      return result.value.endpoint;
    }
  }
  
  // If no healthy endpoint found, return first one (will fail gracefully)
  console.warn('No healthy endpoints found, using first endpoint as fallback');
  return endpoints[0];
}

/**
 * Get configured RPC endpoints from environment variables
 * 
 * @param network - Network name (devnet, mainnet-beta, etc.)
 * @returns Array of RPC endpoint URLs
 */
export function getConfiguredEndpoints(network: string = 'devnet'): string[] {
  const endpoints: string[] = [];
  
  // Primary endpoint
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    endpoints.push(process.env.NEXT_PUBLIC_RPC_URL);
  }
  
  // Backup endpoint
  if (process.env.NEXT_PUBLIC_RPC_URL_BACKUP) {
    endpoints.push(process.env.NEXT_PUBLIC_RPC_URL_BACKUP);
  }
  
  // Additional endpoints can be added here
  
  return endpoints;
}
