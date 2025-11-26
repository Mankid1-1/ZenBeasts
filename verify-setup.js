#!/usr/bin/env node

/**
 * Verification script for ZenBeasts project setup
 * Checks that all required dependencies and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const checks = [];

// Check if files exist
function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  checks.push({
    name: description,
    passed: exists,
    message: exists ? `✓ ${description}` : `✗ ${description} - File not found: ${filePath}`
  });
}

// Check if package.json has dependency
function checkDependency(packageJsonPath, depName, description) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasDep = (pkg.dependencies && pkg.dependencies[depName]) || 
                   (pkg.devDependencies && pkg.devDependencies[depName]);
    checks.push({
      name: description,
      passed: hasDep,
      message: hasDep ? `✓ ${description}` : `✗ ${description} - Not found in ${packageJsonPath}`
    });
  } catch (error) {
    checks.push({
      name: description,
      passed: false,
      message: `✗ ${description} - Error reading ${packageJsonPath}`
    });
  }
}

console.log('🔍 Verifying ZenBeasts Project Setup...\n');

// Configuration files
console.log('📋 Configuration Files:');
checkFileExists('Anchor.toml', 'Anchor.toml exists');
checkFileExists('frontend/tailwind.config.js', 'Tailwind config exists');
checkFileExists('frontend/postcss.config.js', 'PostCSS config exists');
checkFileExists('frontend/jest.config.js', 'Jest config exists');
checkFileExists('frontend/.eslintrc.json', 'ESLint config exists');
checkFileExists('frontend/src/app/globals.css', 'Global CSS exists');
checkFileExists('.env.example', 'Root .env.example exists');
checkFileExists('frontend/.env.template', 'Frontend .env.template exists');

// Root dependencies
console.log('\n📦 Root Dependencies:');
checkDependency('package.json', '@coral-xyz/anchor', 'Anchor framework');
checkDependency('package.json', '@metaplex-foundation/mpl-token-metadata', 'Metaplex metadata');
checkDependency('package.json', '@solana/web3.js', 'Solana web3.js');

// Frontend dependencies
console.log('\n🎨 Frontend Dependencies:');
checkDependency('frontend/package.json', '@tanstack/react-virtual', 'React Virtual (pagination)');
checkDependency('frontend/package.json', '@solana/wallet-adapter-react', 'Wallet adapter');
checkDependency('frontend/package.json', 'tailwindcss', 'Tailwind CSS');
checkDependency('frontend/package.json', 'fast-check', 'Fast-check (PBT)');
checkDependency('frontend/package.json', 'jest', 'Jest testing framework');
checkDependency('frontend/package.json', '@testing-library/react', 'React Testing Library');
checkDependency('frontend/package.json', 'eslint-plugin-jsx-a11y', 'Accessibility linting');

// Rust dependencies
console.log('\n🦀 Rust Dependencies:');
checkFileExists('programs/zenbeasts/Cargo.toml', 'Rust Cargo.toml exists');
try {
  const cargoToml = fs.readFileSync('programs/zenbeasts/Cargo.toml', 'utf8');
  checks.push({
    name: 'Proptest dependency',
    passed: cargoToml.includes('proptest'),
    message: cargoToml.includes('proptest') ? '✓ Proptest dependency' : '✗ Proptest not found in Cargo.toml'
  });
} catch (error) {
  checks.push({
    name: 'Proptest dependency',
    passed: false,
    message: '✗ Error reading Cargo.toml'
  });
}

// TypeScript configuration
console.log('\n⚙️  TypeScript Configuration:');
try {
  const tsconfig = JSON.parse(fs.readFileSync('frontend/tsconfig.json', 'utf8'));
  checks.push({
    name: 'Strict mode enabled',
    passed: tsconfig.compilerOptions.strict === true,
    message: tsconfig.compilerOptions.strict === true ? '✓ Strict mode enabled' : '✗ Strict mode not enabled'
  });
} catch (error) {
  checks.push({
    name: 'Strict mode enabled',
    passed: false,
    message: '✗ Error reading tsconfig.json'
  });
}

// Print results
console.log('\n' + '='.repeat(60));
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
const allPassed = passed === total;

checks.forEach(check => {
  console.log(check.message);
});

console.log('='.repeat(60));
console.log(`\n${allPassed ? '✅' : '⚠️'}  ${passed}/${total} checks passed\n`);

if (allPassed) {
  console.log('🎉 Project setup is complete!');
  console.log('\nNext steps:');
  console.log('1. Run "npm install" in root directory');
  console.log('2. Run "cd frontend && npm install"');
  console.log('3. Run "cd api && npm install"');
  console.log('4. Run "anchor build" to build the Solana program');
  console.log('5. See SETUP.md for detailed instructions');
} else {
  console.log('⚠️  Some checks failed. Please review the setup.');
  process.exit(1);
}
