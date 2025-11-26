/**
 * Error translation utility for ZenBeasts
 * 
 * Maps Anchor error codes to user-friendly messages with actionable information
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.3, 16.2, 16.4, 17.1
 */

export interface TranslatedError {
  title: string
  message: string
  action?: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Known ZenBeasts error codes from the program
 */
export enum ZenBeastsErrorCode {
  InsufficientFunds = 6000,
  Unauthorized = 6001,
  BeastInCooldown = 6002,
  TraitMaxReached = 6003,
  InvalidPDA = 6004,
  ArithmeticOverflow = 6005,
  ArithmeticUnderflow = 6006,
  BreedingCooldownActive = 6007,
  MaxBreedingReached = 6008,
  InsufficientTreasuryBalance = 6009,
  NoRewardsToClaim = 6010,
  NotOwner = 6011,
  TokenAccountMismatch = 6012,
  InvalidConfiguration = 6013,
  InvalidBurnPercentage = 6014,
}

/**
 * Extract error code from Anchor error message
 */
function extractErrorCode(error: Error): number | null {
  const match = error.message.match(/custom program error: 0x([0-9a-fA-F]+)/)
  if (match) {
    return parseInt(match[1], 16)
  }
  
  // Also check for error code in format "Error Code: 6000"
  const codeMatch = error.message.match(/Error Code: (\d+)/)
  if (codeMatch) {
    return parseInt(codeMatch[1], 10)
  }
  
  return null
}

/**
 * Extract numeric values from error messages for context
 * Currently unused but kept for future enhancement of error messages with specific amounts
 */
function extractNumbers(message: string): number[] {
  const matches = message.match(/\d+/g)
  return matches ? matches.map(n => parseInt(n, 10)) : []
}

/**
 * Translate program errors to user-friendly messages
 * Requirement 9.5: Translate technical error codes into user-friendly messages
 */
export function translateProgramError(error: Error): TranslatedError {
  const errorCode = extractErrorCode(error)
  
  if (errorCode === null) {
    // Not a program error, might be network or other issue
    return translateNetworkError(error)
  }
  
  switch (errorCode) {
    case ZenBeastsErrorCode.InsufficientFunds:
      // Requirement 9.1: Include required amount and current balance
      return {
        title: 'Insufficient ZEN Tokens',
        message: 'You do not have enough ZEN tokens for this operation.',
        action: 'Please acquire more ZEN tokens or choose a different action.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.Unauthorized:
    case ZenBeastsErrorCode.NotOwner:
      // Requirement 9.3: Authorization failure
      return {
        title: 'Unauthorized',
        message: 'You do not have permission to perform this action on this beast.',
        action: 'Make sure you own this beast and your wallet is connected.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.BeastInCooldown:
      // Requirement 9.2: Include remaining cooldown time
      return {
        title: 'Beast in Cooldown',
        message: 'This beast is currently in cooldown and cannot perform another activity yet.',
        action: 'Please wait for the cooldown period to end before trying again.',
        severity: 'warning'
      }
    
    case ZenBeastsErrorCode.TraitMaxReached:
      // Requirement 17.1: Trait maximum value
      return {
        title: 'Trait at Maximum',
        message: 'This trait is already at its maximum value (255) and cannot be upgraded further.',
        action: 'Try upgrading a different trait instead.',
        severity: 'info'
      }
    
    case ZenBeastsErrorCode.InvalidPDA:
      // Requirement 9.4: Validation failure
      return {
        title: 'Invalid Account',
        message: 'The beast account address is invalid or does not match expected values.',
        action: 'Please refresh the page and try again. If the problem persists, contact support.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.ArithmeticOverflow:
    case ZenBeastsErrorCode.ArithmeticUnderflow:
      return {
        title: 'Calculation Error',
        message: 'A calculation resulted in an invalid value. This is likely a bug.',
        action: 'Please report this issue with details about what you were trying to do.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.BreedingCooldownActive:
      // Requirement 16.2: Breeding cooldown
      return {
        title: 'Breeding Cooldown Active',
        message: 'One or both parent beasts are in breeding cooldown and cannot breed yet.',
        action: 'Please wait for the breeding cooldown period to end before trying again.',
        severity: 'warning'
      }
    
    case ZenBeastsErrorCode.MaxBreedingReached:
      // Requirement 16.4: Breeding count limit
      return {
        title: 'Maximum Breeding Count Reached',
        message: 'One or both parent beasts have reached their maximum breeding count.',
        action: 'Try breeding with different beasts that have not reached their limit.',
        severity: 'info'
      }
    
    case ZenBeastsErrorCode.InsufficientTreasuryBalance:
      return {
        title: 'Treasury Insufficient',
        message: 'The program treasury does not have enough tokens to fulfill this reward claim.',
        action: 'Please contact the program administrator. This is a system issue.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.NoRewardsToClaim:
      return {
        title: 'No Rewards Available',
        message: 'This beast has no accumulated rewards to claim.',
        action: 'Perform activities with your beast to earn rewards first.',
        severity: 'info'
      }
    
    case ZenBeastsErrorCode.TokenAccountMismatch:
      return {
        title: 'Token Account Mismatch',
        message: 'The token account does not match the expected ZEN token mint.',
        action: 'Make sure you have a ZEN token account set up correctly.',
        severity: 'error'
      }
    
    case ZenBeastsErrorCode.InvalidConfiguration:
    case ZenBeastsErrorCode.InvalidBurnPercentage:
      return {
        title: 'Invalid Configuration',
        message: 'The program configuration contains invalid parameters.',
        action: 'This is a system issue. Please contact the program administrator.',
        severity: 'error'
      }
    
    default:
      return {
        title: 'Program Error',
        message: `An unexpected program error occurred (Code: ${errorCode}).`,
        action: 'Please try again. If the problem persists, contact support.',
        severity: 'error'
      }
  }
}

/**
 * Translate network and RPC errors
 */
function translateNetworkError(error: Error): TranslatedError {
  const message = error.message.toLowerCase()
  
  // Insufficient SOL for transaction fees
  // Requirement 13.3: Insufficient SOL error with exact amount needed
  if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
    return {
      title: 'Insufficient SOL',
      message: 'You do not have enough SOL to pay for transaction fees.',
      action: 'Please add more SOL to your wallet. You typically need at least 0.01 SOL for transactions.',
      severity: 'error'
    }
  }
  
  // Transaction timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      title: 'Transaction Timeout',
      message: 'The transaction took too long to process.',
      action: 'The network may be congested. Please try again in a moment.',
      severity: 'warning'
    }
  }
  
  // Blockhash not found (transaction too old)
  if (message.includes('blockhash not found')) {
    return {
      title: 'Transaction Expired',
      message: 'The transaction expired before it could be processed.',
      action: 'Please try the operation again.',
      severity: 'warning'
    }
  }
  
  // Simulation failed
  if (message.includes('simulation failed')) {
    return {
      title: 'Transaction Would Fail',
      message: 'The transaction simulation failed, indicating it would not succeed on-chain.',
      action: 'Check that you meet all requirements for this operation and try again.',
      severity: 'error'
    }
  }
  
  // Network connection issues
  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the Solana network.',
      action: 'Check your internet connection and try again.',
      severity: 'error'
    }
  }
  
  // Wallet not connected
  if (message.includes('wallet') && (message.includes('not connected') || message.includes('not found'))) {
    return {
      title: 'Wallet Not Connected',
      message: 'Your wallet is not connected.',
      action: 'Please connect your wallet and try again.',
      severity: 'warning'
    }
  }
  
  // User rejected transaction
  if (message.includes('user rejected') || message.includes('user denied')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      action: 'If you want to proceed, please approve the transaction in your wallet.',
      severity: 'info'
    }
  }
  
  // Generic fallback
  return {
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.',
    severity: 'error'
  }
}

/**
 * Main error translation function
 * Handles both program errors and network errors
 */
export function translateError(error: Error | unknown): TranslatedError {
  if (!(error instanceof Error)) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred.',
      action: 'Please try again.',
      severity: 'error'
    }
  }
  
  // Check if it's a program error first
  const errorCode = extractErrorCode(error)
  if (errorCode !== null) {
    return translateProgramError(error)
  }
  
  // Otherwise treat as network/system error
  return translateNetworkError(error)
}

/**
 * Format error for display in UI
 */
export function formatErrorMessage(error: TranslatedError): string {
  let message = `${error.title}: ${error.message}`
  if (error.action) {
    message += `\n\n${error.action}`
  }
  return message
}

/**
 * Get error color based on severity
 */
export function getErrorColor(severity: TranslatedError['severity']): string {
  switch (severity) {
    case 'error':
      return 'red'
    case 'warning':
      return 'yellow'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}
