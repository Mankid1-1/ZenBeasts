#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const programName = 'zenbeasts';

const exec = (command) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    process.exit(1);
  }
};

const main = async () => {
  const cluster = process.argv[2] || 'devnet';

  console.log('========================================');
  console.log('ZenBeasts Build and Deploy Script');
  console.log('========================================');
  console.log(`Target Cluster: ${cluster}`);

  console.log('Configuring Solana cluster...');
  switch (cluster) {
    case 'mainnet':
      exec('solana config set --url https://api.mainnet-beta.solana.com');
      break;
    case 'devnet':
      exec('solana config set --url https://api.devnet.solana.com');
      break;
    case 'localnet':
      exec('solana config set --url http://localhost:8899');
      break;
    default:
      console.error('Error: Invalid cluster specified. Use: devnet, mainnet, or localnet');
      process.exit(1);
  }

  console.log('Current Solana configuration:');
  exec('solana config get');

  if (cluster === 'mainnet') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) =>
      rl.question('Are you absolutely sure you want to continue? (type \'YES\' to confirm) ', resolve)
    );

    rl.close();

    if (answer !== 'YES') {
      console.log('Deployment cancelled.');
      process.exit(0);
    }
  }

  console.log('Cleaning previous builds...');
  exec('anchor clean');

  console.log('Building program with optimizations...');
  exec(cluster === 'mainnet' ? 'anchor build --verifiable' : 'anchor build');

  const libRsPath = path.join('programs', programName, 'src', 'lib.rs');
  const libRsContent = fs.readFileSync(libRsPath, 'utf-8');
  const programIdMatch = libRsContent.match(/declare_id!\("([^"]+)"\)/);
  const programId = programIdMatch ? programIdMatch[1] : null;

  if (!programId) {
    console.error('Could not find program ID in lib.rs');
    process.exit(1);
  }

  console.log(`Program ID: ${programId}`);

  console.log('Deploying program...');
  exec(`anchor deploy --provider.cluster ${cluster}`);

  console.log('Verifying deployment...');
  exec(`solana program show ${programId}`);

  console.log('Deployment complete! 🎉');
};

main();
