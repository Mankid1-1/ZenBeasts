#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const exec = (command, options) => {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    process.exit(1);
  }
};

const main = async () => {
  const platform = process.argv[2] || 'vercel';
  const environment = process.argv[3] || 'production';

  console.log('========================================');
  console.log('ZenBeasts Frontend Deployment');
  console.log('========================================');
  console.log(`Platform: ${platform}`);
  console.log(`Environment: ${environment}`);

  const frontendDir = 'frontend';

  console.log('Installing dependencies...');
  exec('npm install', { cwd: frontendDir });

  console.log('Running linter...');
  exec('npm run lint', { cwd: frontendDir });

  console.log('Running tests...');
  exec('npm run test', { cwd: frontendDir });

  console.log('Building application...');
  exec('npm run build', { cwd: frontendDir });

  switch (platform) {
    case 'vercel':
      console.log('Deploying to Vercel...');
      exec(environment === 'production' ? 'vercel --prod' : 'vercel', { cwd: frontendDir });
      break;
    case 'netlify':
      console.log('Deploying to Netlify...');
      exec(environment === 'production' ? 'netlify deploy --prod --dir=.next' : 'netlify deploy --dir=.next', {
        cwd: frontendDir,
      });
      break;
    default:
      console.error('Error: Invalid platform specified. Use: vercel, netlify');
      process.exit(1);
  }

  console.log('Deployment complete! 🎉');
};

main();
