// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Solana wallet adapter
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
