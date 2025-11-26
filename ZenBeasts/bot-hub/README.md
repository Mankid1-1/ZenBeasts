# ZenBeasts Bot Hub 🤖

**Version:** 1.0  
**Last Updated:** 2024  
**Purpose:** Automated operations for ZenBeasts project

---

## 🎯 Overview

The ZenBeasts Bot Hub is a comprehensive automation system that handles 60-70% of manual operational tasks including:

- 🐦 **Twitter Management** - Auto-posting, engagement, growth
- 💬 **Discord Automation** - Moderation, rewards, community management
- 🎨 **Content Creation** - Threads, graphics, memes with AI
- 📊 **Analytics & Reporting** - Metrics tracking, dashboards
- 🚀 **Deployment** - CI/CD automation
- 🔍 **Monitoring** - System health, alerts
- 💰 **Rewards Distribution** - Automatic ZEN token payouts
- 📧 **Marketing Campaigns** - Email, social media coordination

---

## 🏗️ Architecture

```
bot-hub/
├── orchestrator.py              # Central bot controller
├── bot_base.py                  # Base class for all bots
├── dashboard.py                 # Web UI for bot management
├── requirements.txt             # Python dependencies
├── docker-compose.yml           # Docker deployment
├── .env.example                 # Environment variables template
│
├── bots/                        # Individual bot implementations
│   ├── __init__.py
│   ├── twitter_bot.py          # Twitter automation
│   ├── discord_bot.py          # Discord management
│   ├── content_bot.py          # AI content generation
│   ├── analytics_bot.py        # Metrics & reporting
│   ├── deployment_bot.py       # CI/CD automation
│   ├── monitoring_bot.py       # System health checks
│   ├── rewards_bot.py          # Token distribution
│   └── marketing_bot.py        # Campaign management
│
├── config/                      # Bot configurations
│   ├── bots.yaml               # Bot settings
│   ├── schedules.yaml          # Cron schedules
│   ├── content_templates.yaml  # Content templates
│   └── alerts.yaml             # Alert rules
│
├── data/                        # Data storage
│   ├── analytics.db            # SQLite database
│   ├── logs/                   # Log files
│   └── cache/                  # Temporary cache
│
├── utils/                       # Shared utilities
│   ├── logger.py               # Logging system
│   ├── db.py                   # Database helpers
│   ├── api_clients.py          # API wrappers
│   └── helpers.py              # Common functions
│
└── scripts/                     # Deployment scripts
    ├── setup.sh                # Initial setup
    ├── start.sh                # Start all bots
    ├── stop.sh                 # Stop all bots
    └── update.sh               # Update bots
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Docker & Docker Compose (optional but recommended)
- Node.js 18+ (for some integrations)
- Redis (for job queue)
- PostgreSQL (optional, for production)

### Installation

```bash
# 1. Navigate to bot-hub directory
cd ZenBeasts/bot-hub

# 2. Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Configure environment variables
cp .env.example .env
nano .env  # Add your API keys

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Initialize database
python orchestrator.py init

# 6. Start the bot hub
python orchestrator.py start

# Or use Docker (recommended)
docker-compose up -d
```

### Configuration

Edit `config/bots.yaml` to enable/disable bots and configure settings:

```yaml
twitter_bot:
  enabled: true
  schedule: "0 9,12,15,18 * * *"  # Post at 9am, 12pm, 3pm, 6pm
  auto_engage: true
  growth_mode: true

discord_bot:
  enabled: true
  auto_mod: true
  welcome_messages: true
  reward_automation: true

content_bot:
  enabled: true
  ai_model: "gpt-4"
  daily_threads: 3
  auto_memes: 5
```

---

## 🤖 Available Bots

### 1. Twitter Bot (`twitter_bot.py`)

**Capabilities:**
- Auto-post scheduled content (threads, images, polls)
- Auto-engage with mentions and replies
- Follow/unfollow automation (growth strategy)
- Sentiment analysis on brand mentions
- Retweet relevant content
- Generate AI-powered threads
- Track analytics (impressions, engagement)

**Configuration:**
```yaml
twitter_bot:
  api_key: "${TWITTER_API_KEY}"
  api_secret: "${TWITTER_API_SECRET}"
  access_token: "${TWITTER_ACCESS_TOKEN}"
  access_secret: "${TWITTER_ACCESS_SECRET}"
  
  schedule:
    - time: "09:00"
      content_type: "educational_thread"
    - time: "12:00"
      content_type: "community_engagement"
    - time: "15:00"
      content_type: "meme"
    - time: "18:00"
      content_type: "update"
  
  auto_engage:
    enabled: true
    reply_to_mentions: true
    like_threshold: 0.7  # Sentiment score
    max_replies_per_hour: 20
  
  growth:
    enabled: true
    target_accounts: ["@SolanaNFT", "@NFTGaming"]
    follow_per_day: 50
    unfollow_after_days: 7
```

**Usage:**
```bash
# Run standalone
python -m bots.twitter_bot

# Via orchestrator
python orchestrator.py run twitter_bot

# Schedule posts
python orchestrator.py schedule twitter_bot --content "GM! 🌅"
```

### 2. Discord Bot (`discord_bot.py`)

**Capabilities:**
- Welcome new members with roles
- Auto-moderation (spam, profanity, scams)
- Giveaway management (random winners)
- Activity tracking and rewards
- Custom commands (!price, !help, !claim)
- Level/XP system
- Ticket system for support
- Voice channel management

**Configuration:**
```yaml
discord_bot:
  token: "${DISCORD_BOT_TOKEN}"
  guild_id: "YOUR_GUILD_ID"
  
  moderation:
    auto_delete_spam: true
    auto_ban_scams: true
    profanity_filter: true
    raid_protection: true
  
  welcome:
    channel_id: "WELCOME_CHANNEL_ID"
    message: "Welcome {user}! 🎉 Check out #getting-started"
    auto_role: "Community"
  
  rewards:
    enabled: true
    message_xp: 10
    voice_xp_per_minute: 5
    level_up_rewards:
      5: "50 ZEN"
      10: "100 ZEN"
      25: "500 ZEN"
  
  commands:
    - name: "price"
      response: "Current ZEN price: {price}"
    - name: "help"
      response: "Available commands: !price, !claim, !stats"
```

**Usage:**
```bash
# Run standalone
python -m bots.discord_bot

# Manage giveaways
python orchestrator.py giveaway --prize "1000 ZEN" --winners 5

# Send announcement
python orchestrator.py announce --channel general --message "New update!"
```

### 3. Content Bot (`content_bot.py`)

**Capabilities:**
- Generate Twitter threads with GPT-4
- Create images with DALL-E
- Design infographics with templates
- Generate memes automatically
- Write blog posts
- Create video scripts
- Translate content (multi-language)

**Configuration:**
```yaml
content_bot:
  openai_api_key: "${OPENAI_API_KEY}"
  
  twitter_threads:
    model: "gpt-4"
    max_tweets: 10
    tone: "educational and friendly"
    topics:
      - "on-chain gaming"
      - "Solana NFTs"
      - "tokenomics"
      - "community building"
  
  image_generation:
    service: "dall-e-3"
    style: "vibrant, fantasy, gaming"
    resolution: "1024x1024"
  
  meme_templates:
    - "drake_meme"
    - "expanding_brain"
    - "distracted_boyfriend"
```

**Usage:**
```bash
# Generate thread
python orchestrator.py generate thread --topic "trait breeding"

# Create meme
python orchestrator.py generate meme --template drake --text1 "Old NFTs" --text2 "ZenBeasts"

# Write blog post
python orchestrator.py generate blog --title "Understanding On-Chain Traits"
```

### 4. Analytics Bot (`analytics_bot.py`)

**Capabilities:**
- Track on-chain metrics (mints, activities, volume)
- Social media analytics (followers, engagement)
- User behavior analysis
- Revenue tracking
- Generate daily/weekly reports
- Alert on anomalies
- Dashboard data export

**Configuration:**
```yaml
analytics_bot:
  solana_rpc: "${SOLANA_RPC_URL}"
  program_id: "${ZENBEASTS_PROGRAM_ID}"
  
  metrics:
    - name: "daily_active_users"
      source: "on-chain"
      alert_threshold: 100
    - name: "twitter_followers"
      source: "twitter_api"
      alert_threshold: 1000
    - name: "marketplace_volume"
      source: "on-chain"
      alert_threshold: 10000
  
  reports:
    daily:
      time: "08:00"
      recipients: ["team@zenbeasts.io"]
      channels: ["#analytics"]
    weekly:
      time: "Monday 09:00"
      recipients: ["investors@zenbeasts.io"]
      format: "pdf"
```

**Usage:**
```bash
# Generate report
python orchestrator.py report --type daily

# Check metrics
python orchestrator.py metrics --period 7d

# Export data
python orchestrator.py export --format csv --metrics all
```

### 5. Deployment Bot (`deployment_bot.py`)

**Capabilities:**
- CI/CD automation (GitHub Actions integration)
- Smart contract deployment
- Frontend deployment (Vercel)
- Database migrations
- Health checks after deployment
- Rollback on failure
- Deployment notifications

**Configuration:**
```yaml
deployment_bot:
  github_token: "${GITHUB_TOKEN}"
  repo: "yourusername/zenbeasts"
  
  environments:
    devnet:
      auto_deploy: true
      on_branch: "develop"
      anchor_cluster: "devnet"
    mainnet:
      auto_deploy: false
      on_branch: "main"
      requires_approval: true
  
  notifications:
    discord_webhook: "${DEPLOYMENT_WEBHOOK}"
    email: ["devs@zenbeasts.io"]
```

**Usage:**
```bash
# Deploy to devnet
python orchestrator.py deploy --env devnet

# Deploy to mainnet (with approval)
python orchestrator.py deploy --env mainnet --approve

# Rollback
python orchestrator.py rollback --to previous
```

### 6. Monitoring Bot (`monitoring_bot.py`)

**Capabilities:**
- System health checks (RPC, database, frontend)
- Smart contract monitoring
- Error tracking and alerting
- Performance monitoring
- Uptime tracking
- Cost monitoring (RPC, hosting)
- Security alerts

**Configuration:**
```yaml
monitoring_bot:
  check_interval: 60  # seconds
  
  endpoints:
    - name: "website"
      url: "https://zenbeasts.io"
      expected_status: 200
    - name: "api"
      url: "https://api.zenbeasts.io/health"
      expected_status: 200
    - name: "rpc"
      url: "${SOLANA_RPC_URL}"
      type: "solana"
  
  alerts:
    - condition: "response_time > 2000"
      severity: "warning"
      notify: ["#dev-ops"]
    - condition: "status_code >= 500"
      severity: "critical"
      notify: ["#dev-ops", "devs@zenbeasts.io"]
```

**Usage:**
```bash
# Check health
python orchestrator.py health

# Test endpoint
python orchestrator.py ping --endpoint website

# View logs
python orchestrator.py logs --follow
```

### 7. Rewards Bot (`rewards_bot.py`)

**Capabilities:**
- Automatic ZEN distribution for activities
- Referral reward payouts
- Giveaway winner selection
- Ambassador payments
- Staking reward calculations
- Airdrop management

**Configuration:**
```yaml
rewards_bot:
  wallet_private_key: "${REWARDS_WALLET_PRIVATE_KEY}"
  zen_mint: "${ZEN_MINT_ADDRESS}"
  
  automatic_rewards:
    - event: "beast_minted"
      amount: 100
      delay: 0
    - event: "referral_signup"
      amount: 50
      delay: 0
    - event: "activity_completed"
      amount: 1
      delay: 0
  
  giveaways:
    verification_required: true
    cooldown_hours: 24
```

**Usage:**
```bash
# Distribute rewards
python orchestrator.py rewards distribute --event referral_signup

# Run giveaway
python orchestrator.py rewards giveaway --amount 1000 --winners 10

# Pay ambassadors
python orchestrator.py rewards ambassadors --month december
```

### 8. Marketing Bot (`marketing_bot.py`)

**Capabilities:**
- Email campaign automation
- Cross-platform posting (Twitter, Discord, Reddit)
- Influencer outreach tracking
- Partnership management
- Campaign performance tracking
- A/B testing

**Configuration:**
```yaml
marketing_bot:
  mailchimp_api_key: "${MAILCHIMP_API_KEY}"
  
  campaigns:
    weekly_newsletter:
      schedule: "Friday 10:00"
      template: "weekly_update"
      segment: "all_subscribers"
  
  cross_post:
    enabled: true
    platforms: ["twitter", "discord", "reddit"]
    customize_per_platform: true
```

---

## 🎛️ Web Dashboard

Access the web dashboard at `http://localhost:5000` after starting the bot hub.

**Features:**
- View bot status (running/stopped/error)
- Start/stop individual bots
- View real-time logs
- Schedule posts manually
- View analytics dashboard
- Manage configurations
- Test bot functions

**Login:**
```
Username: admin
Password: (set in .env as DASHBOARD_PASSWORD)
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# All logs
tail -f data/logs/orchestrator.log

# Specific bot
tail -f data/logs/twitter_bot.log

# Error logs only
tail -f data/logs/errors.log
```

### Metrics Dashboard

Access Grafana at `http://localhost:3000` (if using Docker setup)

**Key Metrics:**
- Bot uptime
- API calls per minute
- Success/error rates
- Response times
- Queue sizes

---

## 🔒 Security Best Practices

1. **API Keys:**
   - Store in `.env` file (never commit)
   - Rotate keys regularly
   - Use read-only keys where possible

2. **Wallet Security:**
   - Use separate wallet for bot operations
   - Limit token amounts
   - Monitor transactions
   - Enable transaction limits

3. **Access Control:**
   - Change default dashboard password
   - Use HTTPS in production
   - Enable 2FA where available
   - Whitelist IP addresses

4. **Monitoring:**
   - Set up alerts for suspicious activity
   - Monitor API usage
   - Track bot behavior
   - Regular security audits

---

## 🚢 Deployment

### Docker Deployment (Recommended)

```bash
# Build and start all bots
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all bots
docker-compose down

# Update bots
docker-compose pull
docker-compose up -d
```

### Production Deployment

```bash
# Use systemd for process management
sudo cp scripts/zenbeasts-bots.service /etc/systemd/system/
sudo systemctl enable zenbeasts-bots
sudo systemctl start zenbeasts-bots

# View status
sudo systemctl status zenbeasts-bots
```

### Environment Variables

```bash
# Required
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret

DISCORD_BOT_TOKEN=your_token
DISCORD_GUILD_ID=your_guild_id

OPENAI_API_KEY=your_key

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ZENBEASTS_PROGRAM_ID=your_program_id

REWARDS_WALLET_PRIVATE_KEY=your_private_key
ZEN_MINT_ADDRESS=your_mint_address

# Optional
DATABASE_URL=postgresql://localhost/zenbeasts
REDIS_URL=redis://localhost:6379
DASHBOARD_PASSWORD=secure_password
SENTRY_DSN=your_sentry_dsn
```

---

## 📈 Performance Optimization

### Redis Queue

For high-volume operations, enable Redis queue:

```yaml
orchestrator:
  queue: "redis"
  redis_url: "redis://localhost:6379"
  workers: 4
```

### Caching

Enable caching for frequently accessed data:

```yaml
cache:
  enabled: true
  backend: "redis"
  ttl: 300  # seconds
```

### Rate Limiting

Respect API rate limits:

```yaml
rate_limits:
  twitter_api: 300  # requests per 15 min
  openai_api: 3500  # requests per min
  discord_api: 50   # requests per second
```

---

## 🐛 Troubleshooting

### Bot Not Starting

```bash
# Check logs
python orchestrator.py logs --bot twitter_bot

# Test configuration
python orchestrator.py test --bot twitter_bot

# Restart bot
python orchestrator.py restart twitter_bot
```

### API Errors

```bash
# Test API connection
python orchestrator.py test-api --service twitter

# Check rate limits
python orchestrator.py rate-limits
```

### Database Issues

```bash
# Reset database
python orchestrator.py reset-db --confirm

# Run migrations
python orchestrator.py migrate
```

---

## 🔄 Updates & Maintenance

### Update Bot Hub

```bash
git pull
pip install -r requirements.txt --upgrade
python orchestrator.py migrate
python orchestrator.py restart all
```

### Backup Data

```bash
# Backup database
python orchestrator.py backup --output backups/

# Restore from backup
python orchestrator.py restore --file backups/2024-01-01.db
```

---

## 📚 Documentation

- **API Reference**: See `docs/API.md`
- **Bot Development**: See `docs/DEVELOPMENT.md`
- **Configuration Guide**: See `docs/CONFIGURATION.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`

---

## 🤝 Contributing

To add a new bot:

1. Create new file in `bots/` directory
2. Inherit from `BotBase` class
3. Implement required methods
4. Add configuration to `config/bots.yaml`
5. Update documentation

See `docs/DEVELOPMENT.md` for detailed guide.

---

## 📝 License

MIT License - See LICENSE file for details

---

## 💬 Support

- Discord: [invite link]
- Email: devops@zenbeasts.io
- GitHub Issues: [link]

---

## 🎯 Automation Coverage

**What Gets Automated:**
- ✅ 90% of Twitter posting
- ✅ 80% of Discord moderation
- ✅ 70% of content creation
- ✅ 100% of analytics reporting
- ✅ 100% of deployment pipeline
- ✅ 90% of system monitoring
- ✅ 100% of reward distribution
- ✅ 60% of marketing campaigns

**Manual Intervention Still Needed:**
- Strategy decisions
- Creative direction
- Community crisis management
- Major announcements
- Partnership negotiations

**Time Saved:** ~25-30 hours per week

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production Ready

**Let the bots do the work!** 🤖✨