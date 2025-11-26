# ZenBeasts Quick Start Guide

Get up and running with ZenBeasts in minutes!

## 🚀 One-Command Installation

### Windows (PowerShell - Run as Administrator)

```powershell
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Run automated installer
.\install.ps1
```

### Linux/macOS (Bash)

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Make installer executable and run
chmod +x install.sh
./install.sh
```

### Docker (Cross-Platform)

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Start with Docker Compose
docker-compose up -d

# Access services:
# - Frontend: http://localhost:3000
# - Bot Hub Dashboard: http://localhost:5000
# - Grafana: http://localhost:3001
```

---

## 📦 What Gets Installed

The automated installer sets up:

- ✅ **Git** - Version control
- ✅ **Node.js & npm** - Frontend development
- ✅ **Python 3.10+** - Bot Hub automation
- ✅ **Rust & Cargo** - Solana program compilation
- ✅ **Solana CLI** - Blockchain interaction
- ✅ **Anchor Framework** - Smart contract development
- ✅ **Docker** (optional) - Containerized deployment

---

## ⚙️ Configuration

After installation, configure your API keys:

```powershell
# Windows
.\setup\config-wizard.ps1

# Linux/macOS
./setup/config-wizard.sh
```

The wizard will guide you through setting up:
- 🔑 Discord bot token
- 🐦 Twitter API keys
- 🤖 OpenAI API key (optional)
- ⛓️ Solana network configuration
- 🗄️ Database settings

---

## 🏗️ Building Smart Contracts

```bash
# Navigate to programs directory
cd programs

# Build all programs
anchor build

# Run tests
anchor test

# Deploy to devnet
solana config set --url devnet
anchor deploy
```

**Note:** Save the program IDs after deployment and update them in your `.env` files!

---

## 🤖 Starting Bot Hub

```bash
# Navigate to bot-hub
cd bot-hub

# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1

# Linux/macOS:
source venv/bin/activate

# Start orchestrator
python orchestrator.py
```

Bot Hub includes:
- 💬 Discord community management
- 🐦 Twitter automation
- 📊 Analytics tracking
- 🎨 Content generation
- 🔍 System monitoring
- 🎁 Reward distribution

---

## 🌐 Launching Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already done)
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

Access at: **http://localhost:3000**

---

## 🔍 Verification

Check that everything is installed correctly:

```powershell
# Windows
.\setup\verify-setup.ps1

# Linux/macOS
./setup/verify-setup.sh
```

This will test:
- ✅ All tools are installed
- ✅ Correct versions
- ✅ Configuration files exist
- ✅ Network connectivity
- ✅ Service health

---

## 📚 Project Structure

```
ZenBeasts/
├── programs/              # Solana smart contracts (Rust/Anchor)
│   ├── nft-factory/      # NFT minting and management
│   ├── activities/       # Beast activities and gameplay
│   └── economy/          # ZEN token and economics
├── bot-hub/              # Automation orchestrator (Python)
│   ├── bots/            # Individual bot implementations
│   ├── config/          # Configuration files
│   └── dashboard/       # Web dashboard
├── frontend/             # Next.js web application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── app/         # Next.js pages
│   │   └── lib/         # Utilities and integrations
│   └── public/          # Static assets
├── setup/                # Installation scripts
└── docs/                 # Documentation
```

---

## 🎯 Common Tasks

### Request Devnet SOL Airdrop

```bash
solana config set --url devnet
solana airdrop 2
solana balance
```

### Start Local Validator

```bash
solana-test-validator
```

### View Logs

```bash
# Bot Hub logs
tail -f bot-hub/logs/orchestrator.log

# Docker logs
docker-compose logs -f

# Specific service
docker-compose logs -f bot-hub
```

### Restart Services

```bash
# Docker
docker-compose restart bot-hub
docker-compose restart frontend

# Manual
# Stop running processes (Ctrl+C) and restart
```

---

## 🐛 Troubleshooting

### "Command not found" after installation

**Solution:** Restart your terminal or reload PATH:

```powershell
# Windows PowerShell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Linux/macOS Bash
source ~/.bashrc  # or ~/.zshrc
```

### Anchor build fails

**Solution:** Update Anchor to latest version:

```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force
anchor --version
```

### Docker containers won't start

**Solution:** Ensure Docker is running and reset:

```bash
docker-compose down -v
docker-compose up -d --force-recreate
```

### Port already in use

**Solution:** Stop the service using the port:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

### Bot Hub won't start

**Solution:** Check your `.env` file and API keys:

```bash
cd bot-hub
cat .env  # Verify configuration

# Test Discord token
python -c "import discord; print('discord.py installed')"
```

---

## 🔑 Getting API Keys

### Discord Bot Token
1. Visit https://discord.com/developers/applications
2. Create a New Application
3. Go to "Bot" section
4. Click "Add Bot"
5. Copy the token
6. Enable required intents (Presence, Server Members, Message Content)

### Twitter API Keys
1. Visit https://developer.twitter.com/
2. Apply for Developer Account
3. Create a Project and App
4. Generate API keys and tokens
5. Enable OAuth 1.0a permissions

### OpenAI API Key (Optional)
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new secret key
5. Copy and save securely

### Helius API Key (Recommended)
1. Visit https://helius.xyz/
2. Sign up for free account
3. Create a new API key
4. Use for enhanced RPC and DAS API access

---

## 🎮 Next Steps

1. **Explore the Architecture**
   - Read `ARCHITECTURE.md` for system design
   - Review `TOKENOMICS.md` for economics

2. **Customize Your Build**
   - Modify smart contracts in `programs/`
   - Customize frontend in `frontend/src/`
   - Add new bots in `bot-hub/bots/`

3. **Deploy to Production**
   - Switch to mainnet-beta
   - Deploy with proper security
   - Set up monitoring and alerts

4. **Join the Community**
   - Discord: [Your Discord Server]
   - Twitter: [@YourProject]
   - GitHub: [Your Repository]

---

## 📖 Additional Resources

- [Full Installation Guide](./INSTALLATION_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Tokenomics](./TOKENOMICS.md)
- [Development Guide](./DEVELOPMENT.md)
- [Bot Hub Documentation](./bot-hub/README.md)
- [API Reference](./API_REFERENCE.md)

---

## 💡 Tips

- **Use devnet** for development to avoid real SOL costs
- **Enable 2FA** on all service accounts
- **Never commit** `.env` files or private keys
- **Keep dependencies updated** regularly
- **Monitor logs** for errors and issues
- **Backup your data** before major changes
- **Test thoroughly** before mainnet deployment

---

## ⚡ Performance Tips

### Speed up builds
```bash
# Use Anchor's cargo cache
export CARGO_HOME=~/.cargo

# Parallel builds
cargo build --jobs $(nproc)
```

### Optimize frontend
```bash
cd frontend
npm run build
npm run analyze  # Check bundle size
```

### Cache optimization
```bash
# Clear Next.js cache
rm -rf frontend/.next

# Clear Anchor cache
anchor clean
```

---

## 🆘 Getting Help

1. **Check the logs** - Most issues are logged
2. **Run verification** - `./setup/verify-setup.ps1`
3. **Search documentation** - Check relevant docs
4. **GitHub Issues** - Report bugs or ask questions
5. **Community Discord** - Get help from others

---

## ✅ Success Checklist

Before launching to production:

- [ ] All tests passing
- [ ] Smart contracts audited
- [ ] API keys secured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Documentation updated
- [ ] Community tools ready
- [ ] Marketing materials prepared
- [ ] Legal compliance checked
- [ ] Disaster recovery plan in place

---

**You're all set! Welcome to ZenBeasts! 🎉**

Need help? Check the full [Installation Guide](./INSTALLATION_GUIDE.md) or join our community!