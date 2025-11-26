# ZenBeasts Setup Guide

## Prerequisites

- Node.js 18+ and npm/yarn
- Rust 1.70+ and Cargo
- Solana CLI 1.17+
- Anchor CLI 0.29.0

## Installation

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install API Dependencies

```bash
cd api
npm install
cd ..
```

### 4. Build Rust Program

```bash
anchor build
```

## Configuration

### 1. Environment Variables

Copy the environment templates:

```bash
cp .env.example .env
cp frontend/.env.template frontend/.env.local
cp api/.env.template api/.env
```

Update the following variables:
- `NEXT_PUBLIC_PROGRAM_ID`: Your deployed program ID
- `NEXT_PUBLIC_ZEN_MINT`: Your ZEN token mint address
- `NEXT_PUBLIC_RPC_URL`: Primary Solana RPC endpoint
- `NEXT_PUBLIC_RPC_URL_BACKUP`: Backup RPC endpoint for redundancy

### 2. Solana Wallet

Ensure you have a Solana wallet configured:

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### 3. Airdrop SOL (Devnet)

```bash
solana airdrop 2 --url devnet
```

## Development

### Run Tests

```bash
# Anchor integration tests
anchor test

# Frontend tests
cd frontend
npm test

# Frontend tests with coverage
npm test -- --coverage
```

### Start Development Servers

```bash
# Frontend (Next.js)
cd frontend
npm run dev

# API (Express)
cd api
npm run dev
```

## Testing Frameworks

### Rust (Anchor Program)
- **Unit Tests**: Built-in Rust testing with `cargo test`
- **Property-Based Tests**: `proptest` for randomized testing
- **Integration Tests**: Anchor test framework with local validator

### TypeScript/Frontend
- **Unit Tests**: Jest with React Testing Library
- **Property-Based Tests**: `fast-check` for randomized testing
- **Component Tests**: Testing Library for React components

## Mobile Support

The frontend is configured with:
- Responsive breakpoints (xs: 475px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Touch-friendly tap targets (minimum 44x44px)
- Mobile wallet deep linking support
- Optimized CSS for mobile devices

## Accessibility

The project includes:
- ESLint plugin for accessibility checks (`eslint-plugin-jsx-a11y`)
- ARIA labels and roles
- Keyboard navigation support
- Screen reader utilities

## Build for Production

```bash
# Build Rust program
anchor build

# Build frontend
cd frontend
npm run build

# Build API
cd api
# API uses ES modules, no build step needed
```

## Deployment

See the deployment documentation in the tasks for detailed deployment instructions.

## Troubleshooting

### Common Issues

1. **Anchor build fails**: Ensure Rust and Anchor CLI are up to date
2. **Frontend build fails**: Check Node.js version (18+ required)
3. **Wallet connection issues**: Verify RPC endpoints are accessible
4. **Test failures**: Ensure local validator is running for integration tests

### RPC Endpoint Redundancy

The project is configured with multiple RPC endpoints for reliability:
- Primary: `https://api.devnet.solana.com`
- Backup: `https://rpc.ankr.com/solana_devnet`

If one endpoint fails, the application will automatically retry with the backup.
