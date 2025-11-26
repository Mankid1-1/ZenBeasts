# ZenBeasts Monitoring and Analytics Setup

This guide covers setting up comprehensive monitoring, analytics, and alerting for the ZenBeasts platform.

## Table of Contents

1. [Overview](#overview)
2. [Event Indexing](#event-indexing)
3. [Treasury Monitoring](#treasury-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Alerting Configuration](#alerting-configuration)
6. [Analytics Dashboard](#analytics-dashboard)

---

## Overview

### Monitoring Architecture

```
┌─────────────────┐
│  Solana Chain   │
│   (ZenBeasts)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼─────┐    ┌─────▼──────┐
    │  Helius  │    │ RPC Logs   │
    │ Webhooks │    │ Subscriber │
    └────┬─────┘    └─────┬──────┘
         │                │
         └────────┬───────┘
                  │
         ┌────────▼────────┐
         │  Event Parser   │
         │   & Processor   │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │   (Time Series) │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   Prometheus    │
         │   (Metrics)     │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │    Grafana      │
         │   (Dashboard)   │
         └─────────────────┘
```

### Key Components

1. **Event Indexing**: Capture all program events
2. **Metrics Collection**: Track treasury, users, transactions
3. **Alerting**: Notify on critical issues
4. **Visualization**: Grafana dashboards
5. **Logging**: Centralized log aggregation

---

## Event Indexing

### Using Helius Webhooks

Helius provides reliable webhook delivery for Solana events.

#### 1. Create Helius Account

1. Sign up at [helius.dev](https://helius.dev)
2. Create API key
3. Note your webhook URL endpoint

#### 2. Configure Webhook

```typescript
// scripts/setup-helius-webhook.ts
import axios from 'axios';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function createWebhook() {
  const response = await axios.post(
    `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
    {
      webhookURL: WEBHOOK_URL,
      transactionTypes: ["Any"],
      accountAddresses: [PROGRAM_ID],
      webhookType: "enhanced",
      txnStatus: "all",
    }
  );
  
  console.log("Webhook created:", response.data);
  return response.data;
}

createWebhook();
```

#### 3. Webhook Handler

```typescript
// api/webhook-handler.ts
import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';

const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/webhook/helius', async (req, res) => {
  const events = req.body;
  
  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }
  
  res.status(200).send('OK');
});

async function processEvent(event: any) {
  const { type, signature, timestamp, events: programEvents } = event;
  
  // Parse program events
  for (const programEvent of programEvents || []) {
    const eventType = programEvent.name;
    const eventData = programEvent.data;
    
    switch (eventType) {
      case 'BeastMinted':
        await handleBeastMinted(eventData, timestamp);
        break;
      case 'ActivityPerformed':
        await handleActivityPerformed(eventData, timestamp);
        break;
      case 'RewardsClaimed':
        await handleRewardsClaimed(eventData, timestamp);
        break;
      case 'TraitUpgraded':
        await handleTraitUpgraded(eventData, timestamp);
        break;
      case 'BeastBred':
        await handleBeastBred(eventData, timestamp);
        break;
    }
  }
}

async function handleBeastMinted(data: any, timestamp: number) {
  // Store in database
  await db.beastMints.create({
    mint: data.mint,
    owner: data.owner,
    traits: data.traits,
    rarityScore: data.rarity_score,
    generation: data.generation,
    timestamp: new Date(timestamp * 1000),
  });
  
  // Update metrics
  metrics.beastsMinted.inc();
  metrics.rarityScoreHistogram.observe(data.rarity_score);
}

async function handleActivityPerformed(data: any, timestamp: number) {
  await db.activities.create({
    beast: data.beast,
    owner: data.owner,
    timestamp: new Date(timestamp * 1000),
  });
  
  metrics.activitiesPerformed.inc();
}

async function handleRewardsClaimed(data: any, timestamp: number) {
  await db.rewardClaims.create({
    beast: data.beast,
    owner: data.owner,
    amount: data.amount,
    timestamp: new Date(timestamp * 1000),
  });
  
  metrics.rewardsClaimed.inc();
  metrics.rewardsClaimedAmount.observe(data.amount / 1e9); // Convert to ZEN
}

app.listen(3001, () => {
  console.log('Webhook handler listening on port 3001');
});
```

### Using RPC Log Subscription

Alternative to webhooks for self-hosted monitoring:

```typescript
// scripts/log-subscriber.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

// Subscribe to program logs
connection.onLogs(
  programId,
  async (logs, context) => {
    console.log('Program logs:', logs);
    
    // Parse logs for events
    const events = parseLogsForEvents(logs.logs);
    
    for (const event of events) {
      await processEvent(event);
    }
  },
  'confirmed'
);

function parseLogsForEvents(logs: string[]): any[] {
  const events = [];
  
  for (const log of logs) {
    // Look for event emission patterns
    if (log.includes('Program data:')) {
      // Parse base64 encoded event data
      const eventData = parseEventData(log);
      if (eventData) {
        events.push(eventData);
      }
    }
  }
  
  return events;
}

console.log('Log subscriber started');
```

### Database Schema

```sql
-- PostgreSQL schema for event storage

CREATE TABLE beast_mints (
  id SERIAL PRIMARY KEY,
  mint VARCHAR(44) NOT NULL UNIQUE,
  owner VARCHAR(44) NOT NULL,
  traits INTEGER[] NOT NULL,
  rarity_score INTEGER NOT NULL,
  generation INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_beast_mints_owner ON beast_mints(owner);
CREATE INDEX idx_beast_mints_timestamp ON beast_mints(timestamp);
CREATE INDEX idx_beast_mints_rarity ON beast_mints(rarity_score);

CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  beast VARCHAR(44) NOT NULL,
  owner VARCHAR(44) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_beast ON activities(beast);
CREATE INDEX idx_activities_owner ON activities(owner);
CREATE INDEX idx_activities_timestamp ON activities(timestamp);

CREATE TABLE reward_claims (
  id SERIAL PRIMARY KEY,
  beast VARCHAR(44) NOT NULL,
  owner VARCHAR(44) NOT NULL,
  amount BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reward_claims_owner ON reward_claims(owner);
CREATE INDEX idx_reward_claims_timestamp ON reward_claims(timestamp);

CREATE TABLE trait_upgrades (
  id SERIAL PRIMARY KEY,
  beast VARCHAR(44) NOT NULL,
  trait_index INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  cost BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trait_upgrades_beast ON trait_upgrades(beast);
CREATE INDEX idx_trait_upgrades_timestamp ON trait_upgrades(timestamp);

CREATE TABLE beast_breeds (
  id SERIAL PRIMARY KEY,
  parent1 VARCHAR(44) NOT NULL,
  parent2 VARCHAR(44) NOT NULL,
  offspring VARCHAR(44) NOT NULL,
  generation INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_beast_breeds_parents ON beast_breeds(parent1, parent2);
CREATE INDEX idx_beast_breeds_offspring ON beast_breeds(offspring);
CREATE INDEX idx_beast_breeds_timestamp ON beast_breeds(timestamp);
```

---

## Treasury Monitoring

### Treasury Balance Tracking

```typescript
// scripts/treasury-monitor.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const treasuryAddress = new PublicKey(process.env.TREASURY_ADDRESS!);

async function monitorTreasury() {
  setInterval(async () => {
    try {
      const accountInfo = await getAccount(connection, treasuryAddress);
      const balance = Number(accountInfo.amount) / 1e9; // Convert to ZEN
      
      console.log(`Treasury Balance: ${balance} ZEN`);
      
      // Store in time-series database
      await db.treasuryBalances.create({
        balance,
        timestamp: new Date(),
      });
      
      // Update Prometheus metric
      metrics.treasuryBalance.set(balance);
      
      // Check thresholds
      if (balance < 100) {
        await sendAlert('CRITICAL', `Treasury balance critically low: ${balance} ZEN`);
      } else if (balance < 500) {
        await sendAlert('WARNING', `Treasury balance low: ${balance} ZEN`);
      }
    } catch (error) {
      console.error('Error monitoring treasury:', error);
      await sendAlert('ERROR', `Treasury monitoring failed: ${error.message}`);
    }
  }, 60000); // Check every minute
}

monitorTreasury();
```

### Treasury Flow Analysis

```typescript
// Calculate net treasury flow
async function analyzeTreasuryFlow(timeRange: string) {
  const startTime = getStartTime(timeRange); // '24h', '7d', '30d'
  
  // Inflow: upgrades + breeding
  const upgrades = await db.traitUpgrades.sum('cost', {
    where: { timestamp: { gte: startTime } }
  });
  
  const breeding = await db.beastBreeds.count({
    where: { timestamp: { gte: startTime } }
  }) * BREEDING_BASE_COST; // Simplified
  
  const inflow = upgrades + breeding;
  
  // Outflow: reward claims
  const outflow = await db.rewardClaims.sum('amount', {
    where: { timestamp: { gte: startTime } }
  });
  
  const netFlow = inflow - outflow;
  const burnAmount = inflow * (BURN_PERCENTAGE / 100);
  
  return {
    inflow: inflow / 1e9,
    outflow: outflow / 1e9,
    netFlow: netFlow / 1e9,
    burnAmount: burnAmount / 1e9,
    inflowRate: (inflow / getSeconds(timeRange)) / 1e9, // ZEN per second
    outflowRate: (outflow / getSeconds(timeRange)) / 1e9,
  };
}
```

---

## Performance Monitoring

### Prometheus Metrics

```typescript
// metrics/prometheus.ts
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export const register = new Registry();

// Transaction metrics
export const transactionsTotal = new Counter({
  name: 'zenbeasts_transactions_total',
  help: 'Total number of transactions',
  labelNames: ['type', 'status'],
  registers: [register],
});

export const transactionDuration = new Histogram({
  name: 'zenbeasts_transaction_duration_seconds',
  help: 'Transaction duration in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Beast metrics
export const beastsMinted = new Counter({
  name: 'zenbeasts_beasts_minted_total',
  help: 'Total number of beasts minted',
  registers: [register],
});

export const rarityScoreHistogram = new Histogram({
  name: 'zenbeasts_rarity_score',
  help: 'Distribution of beast rarity scores',
  buckets: [0, 200, 400, 600, 800, 1000, 1020],
  registers: [register],
});

// Activity metrics
export const activitiesPerformed = new Counter({
  name: 'zenbeasts_activities_performed_total',
  help: 'Total number of activities performed',
  registers: [register],
});

export const rewardsClaimed = new Counter({
  name: 'zenbeasts_rewards_claimed_total',
  help: 'Total number of reward claims',
  registers: [register],
});

export const rewardsClaimedAmount = new Histogram({
  name: 'zenbeasts_rewards_claimed_amount_zen',
  help: 'Amount of ZEN claimed in rewards',
  buckets: [0.001, 0.01, 0.1, 1, 10, 100],
  registers: [register],
});

// Treasury metrics
export const treasuryBalance = new Gauge({
  name: 'zenbeasts_treasury_balance_zen',
  help: 'Current treasury balance in ZEN',
  registers: [register],
});

// User metrics
export const activeUsers = new Gauge({
  name: 'zenbeasts_active_users',
  help: 'Number of active users',
  labelNames: ['period'],
  registers: [register],
});

// Expose metrics endpoint
import express from 'express';
const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(9090, () => {
  console.log('Metrics server listening on port 9090');
});
```

### RPC Endpoint Health

```typescript
// scripts/rpc-health-monitor.ts
import { Connection } from '@solana/web3.js';

const endpoints = [
  process.env.SOLANA_RPC_URL,
  process.env.SOLANA_RPC_URL_BACKUP,
  'https://api.mainnet-beta.solana.com',
];

async function monitorRPCHealth() {
  setInterval(async () => {
    for (const endpoint of endpoints) {
      const start = Date.now();
      
      try {
        const connection = new Connection(endpoint!);
        const slot = await connection.getSlot();
        const duration = Date.now() - start;
        
        console.log(`${endpoint}: Slot ${slot}, ${duration}ms`);
        
        metrics.rpcResponseTime.observe(
          { endpoint },
          duration / 1000
        );
        
        metrics.rpcHealthy.set({ endpoint }, 1);
      } catch (error) {
        console.error(`${endpoint}: ERROR`, error.message);
        
        metrics.rpcHealthy.set({ endpoint }, 0);
        
        await sendAlert('WARNING', `RPC endpoint unhealthy: ${endpoint}`);
      }
    }
  }, 30000); // Check every 30 seconds
}

monitorRPCHealth();
```

---

## Alerting Configuration

### Alert Rules

```yaml
# alerting/rules.yml
groups:
  - name: zenbeasts_critical
    interval: 1m
    rules:
      - alert: TreasuryCriticallyLow
        expr: zenbeasts_treasury_balance_zen < 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Treasury balance critically low"
          description: "Treasury balance is {{ $value }} ZEN, below critical threshold of 100 ZEN"
      
      - alert: TransactionFailureRateHigh
        expr: rate(zenbeasts_transactions_total{status="failed"}[5m]) / rate(zenbeasts_transactions_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High transaction failure rate"
          description: "Transaction failure rate is {{ $value | humanizePercentage }}"
      
      - alert: RPCEndpointDown
        expr: zenbeasts_rpc_healthy == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "RPC endpoint is down"
          description: "RPC endpoint {{ $labels.endpoint }} is unhealthy"

  - name: zenbeasts_warning
    interval: 5m
    rules:
      - alert: TreasuryLow
        expr: zenbeasts_treasury_balance_zen < 500
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Treasury balance low"
          description: "Treasury balance is {{ $value }} ZEN, below warning threshold of 500 ZEN"
      
      - alert: TransactionFailureRateElevated
        expr: rate(zenbeasts_transactions_total{status="failed"}[5m]) / rate(zenbeasts_transactions_total[5m]) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Elevated transaction failure rate"
          description: "Transaction failure rate is {{ $value | humanizePercentage }}"
      
      - alert: LowUserActivity
        expr: rate(zenbeasts_activities_performed_total[1h]) < 10
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low user activity"
          description: "Activity rate is {{ $value }} per hour"
```

### Alert Notification Channels

```typescript
// alerting/notifier.ts
import axios from 'axios';

export async function sendAlert(severity: string, message: string) {
  console.log(`[${severity}] ${message}`);
  
  // Discord webhook
  if (process.env.DISCORD_WEBHOOK_URL) {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `**[${severity}]** ${message}`,
      username: 'ZenBeasts Monitor',
    });
  }
  
  // Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `[${severity}] ${message}`,
    });
  }
  
  // Email (using SendGrid, Mailgun, etc.)
  if (severity === 'CRITICAL' && process.env.ALERT_EMAIL) {
    await sendEmail({
      to: process.env.ALERT_EMAIL,
      subject: `[CRITICAL] ZenBeasts Alert`,
      body: message,
    });
  }
  
  // PagerDuty for critical alerts
  if (severity === 'CRITICAL' && process.env.PAGERDUTY_KEY) {
    await axios.post('https://events.pagerduty.com/v2/enqueue', {
      routing_key: process.env.PAGERDUTY_KEY,
      event_action: 'trigger',
      payload: {
        summary: message,
        severity: 'critical',
        source: 'zenbeasts-monitor',
      },
    });
  }
}
```

---

## Analytics Dashboard

### Grafana Setup

#### 1. Install Grafana

```bash
# Docker
docker run -d -p 3000:3000 --name=grafana grafana/grafana

# Or use Grafana Cloud (recommended)
# Sign up at grafana.com
```

#### 2. Add Prometheus Data Source

1. Open Grafana (http://localhost:3000)
2. Go to Configuration → Data Sources
3. Add Prometheus
4. URL: http://localhost:9090
5. Save & Test

#### 3. Import Dashboard

```json
// dashboards/zenbeasts-overview.json
{
  "dashboard": {
    "title": "ZenBeasts Overview",
    "panels": [
      {
        "title": "Treasury Balance",
        "targets": [{
          "expr": "zenbeasts_treasury_balance_zen"
        }],
        "type": "graph"
      },
      {
        "title": "Daily Active Users",
        "targets": [{
          "expr": "count(count by (owner) (increase(zenbeasts_activities_performed_total[24h])))"
        }],
        "type": "stat"
      },
      {
        "title": "Beasts Minted (24h)",
        "targets": [{
          "expr": "increase(zenbeasts_beasts_minted_total[24h])"
        }],
        "type": "stat"
      },
      {
        "title": "Transaction Success Rate",
        "targets": [{
          "expr": "rate(zenbeasts_transactions_total{status=\"success\"}[5m]) / rate(zenbeasts_transactions_total[5m])"
        }],
        "type": "gauge"
      },
      {
        "title": "Rarity Distribution",
        "targets": [{
          "expr": "zenbeasts_rarity_score"
        }],
        "type": "histogram"
      }
    ]
  }
}
```

### Key Dashboard Panels

1. **Treasury Overview**
   - Current balance
   - 24h inflow/outflow
   - Net flow trend
   - Burn amount

2. **User Metrics**
   - Daily active users
   - New users (24h)
   - Activities per user
   - Retention rate

3. **Beast Statistics**
   - Total beasts minted
   - Rarity distribution
   - Generation distribution
   - Average rarity score

4. **Economic Metrics**
   - ZEN minted (rewards)
   - ZEN burned
   - Net supply change
   - Upgrade/breeding costs paid

5. **Performance**
   - Transaction success rate
   - Average transaction time
   - RPC endpoint health
   - Error rate by type

### Example Queries

```promql
# Daily active users
count(count by (owner) (increase(zenbeasts_activities_performed_total[24h])))

# Average rarity score
avg(zenbeasts_rarity_score)

# Treasury net flow (24h)
increase(zenbeasts_treasury_inflow_zen[24h]) - increase(zenbeasts_treasury_outflow_zen[24h])

# Transaction success rate
rate(zenbeasts_transactions_total{status="success"}[5m]) / rate(zenbeasts_transactions_total[5m])

# Beasts minted per hour
rate(zenbeasts_beasts_minted_total[1h]) * 3600
```

---

## Deployment Checklist

- [ ] Set up Helius webhook or RPC log subscriber
- [ ] Deploy webhook handler service
- [ ] Set up PostgreSQL database with schema
- [ ] Deploy Prometheus metrics server
- [ ] Configure Prometheus scraping
- [ ] Set up Grafana instance
- [ ] Import Grafana dashboards
- [ ] Configure alert rules
- [ ] Set up notification channels (Discord, Slack, email)
- [ ] Test alerting with mock events
- [ ] Deploy treasury monitor
- [ ] Deploy RPC health monitor
- [ ] Document runbooks for common alerts
- [ ] Set up log aggregation (optional)
- [ ] Configure backup and retention policies

---

## Maintenance

### Daily
- Check dashboard for anomalies
- Review critical alerts
- Verify treasury balance

### Weekly
- Review user growth trends
- Analyze economic metrics
- Check for performance degradation

### Monthly
- Review and update alert thresholds
- Optimize database queries
- Archive old data
- Update dashboards

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check Helius webhook status
2. Verify webhook URL is accessible
3. Check firewall rules
4. Review webhook handler logs

### Metrics Not Updating

1. Check Prometheus scraping
2. Verify metrics endpoint is accessible
3. Review metrics server logs
4. Check network connectivity

### Alerts Not Firing

1. Verify alert rules syntax
2. Check Prometheus evaluation
3. Test notification channels
4. Review alert manager logs

---

**Last Updated**: 2024
**Version**: 0.1.0