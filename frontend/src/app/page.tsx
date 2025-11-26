'use client';
import { useState } from 'react';
import { WalletButton } from '../components/wallet/WalletButton';
import MintForm from '../components/beast/MintForm';
import ActivityPanel from '../components/beast/ActivityPanel';
import UpgradePanel from '../components/beast/UpgradePanel';
import ClaimPanel from '../components/beast/ClaimPanel';
import BreedingPanel from '../components/beast/BreedingPanel';
import BeastCard from '../components/beast/BeastCard';
import { useBeast } from '../hooks/useBeast';

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 24,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(6,95,70,0.7))',
  boxShadow: '0 18px 45px rgba(15,23,42,0.8)',
  border: '1px solid rgba(148, 163, 184, 0.35)'
};

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(15, 23, 42, 0.8)',
  fontSize: 12,
  letterSpacing: 0.04,
  textTransform: 'uppercase',
  color: '#a5b4fc'
};

export default function Page() {
  const [mint, setMint] = useState<string | null>(null);
  const zenMint = process.env.NEXT_PUBLIC_ZEN_MINT || '';
  const { beast, refetch } = useBeast(mint);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 20px 48px',
        maxWidth: 1120,
        margin: '0 auto',
        gap: 32
      }}
    >
      {/* Hero / Title */}
      <section style={{ display: 'grid', gap: 20 }}>
        <span style={pillStyle}>
          <span style={{ fontSize: 16 }}>🧬</span>
          ZenBeasts: On-Chain Lifeforms
        </span>
        <div style={{ display: 'grid', gap: 12 }}>
          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: -0.04,
              fontWeight: 700,
              color: '#e0f2fe'
            }}
          >
            ZenBeasts: The Future of On-Chain Gaming
          </h1>
          <p style={{ maxWidth: 640, color: '#cbd5f5', fontSize: 15 }}>
            Mint a serene yet powerful on-chain creature, evolve its immutable traits, and
            earn <strong>$ZEN</strong> through mindful activities like Meditation, Yoga, and Brawls.
            All core game state lives directly on Solana PDAs.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#9ca3af' }}>
          <span>⚡ True on-chain NFTs (10 traits & rarity stored in PDAs)</span>
          <span>🔥 Deflationary $ZEN via trait upgrades</span>
          <span>🧘 Fair, cooldown-gated gameplay loop</span>
        </div>
      </section>

      {/* Infographic-style value props */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20
        }}
      >
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>True On-Chain NFTs 🔗</h2>
          <p style={{ fontSize: 14, color: '#cbd5f5' }}>
            Each ZenBeast is backed by a program-owned <strong>BeastAccount PDA</strong> that stores
            all <strong>10 traits</strong>, a computed <strong>rarity score</strong>, owner, activity
            history, and pending rewards. No mutable off-chain JSON metadata.
          </p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Sustainable $ZEN Economy 💠</h2>
          <p style={{ fontSize: 14, color: '#cbd5f5' }}>
            Trait upgrades consume <strong>$ZEN</strong>, automatically burning a configured
            percentage on-chain and routing the rest to a treasury vault. External revenue can
            refill rewards, targeting <strong>Monthly Burn &gt; Monthly Emissions</strong>.
          </p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Engaging Gameplay Loop 🧘🤸🥊</h2>
          <p style={{ fontSize: 14, color: '#cbd5f5' }}>
            Perform Meditation, Yoga, or Brawls to increment your Beast&apos;s on-chain activity count
            and accrue rewards. Cooldowns enforced in the program ensure fair play and prevent
            spam.
          </p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Immutable Architecture & Security 🛡️</h2>
          <p style={{ fontSize: 14, color: '#cbd5f5' }}>
            A central <strong>ProgramConfig PDA</strong> links the $ZEN mint and treasury with
            cooldowns and burn parameters, while <strong>custom errors</strong> and PDA seeds guard
            ownership, cooldowns, and token flows.
          </p>
        </div>
      </section>

      {/* Interactive demo section */}
      <section style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20 }}>Try the ZenBeasts Prototype</h2>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Connect wallet and mint on devnet.</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 20,
            alignItems: 'flex-start'
          }}
        >
          {/* Left: wallet + mint + beast overview */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Connect &amp; Mint</div>
                <div style={{ fontSize: 18 }}>Your ZenBeast</div>
              </div>
              <WalletButton />
            </div>
            <MintForm onMinted={setMint} />
            {beast && (
              <div style={{ marginTop: 20 }}>
                <BeastCard beast={beast} />
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>Gameplay Actions</h3>
              {mint ? (
                <>
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                    Meditation 🧘 · Yoga 🤸 · Brawl 🥊 — each activity updates your Beast&apos;s on-chain
                    state and earns rewards.
                  </p>
                  <ActivityPanel mint={mint} />
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Mint a Beast to unlock actions.</p>
              )}
            </div>

            {zenMint && (
              <div style={cardStyle}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>$ZEN Upgrades &amp; Breeding</h3>
                {mint ? (
                  <>
                    <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                      Spend $ZEN to evolve traits or fuse two parents into a new ZenBeast. A large
                      share is burned; the rest feeds the treasury.
                    </p>
                    <UpgradePanel mint={mint} zenMint={zenMint} />
                    <div style={{ marginTop: 12, borderTop: '1px solid rgba(148,163,184,0.4)', paddingTop: 8 }}>
                      <BreedingPanel primaryMint={mint} zenMint={zenMint} />
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>Mint a Beast to unlock upgrades and breeding.</p>
                )}
              </div>
            )}

            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>Claim Rewards</h3>
              {mint ? (
                <>
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                    Claim on-chain rewards accrued from your activity loop. Pending rewards reset to
                    zero after a successful claim.
                  </p>
                  <ClaimPanel mint={mint} onClaimed={refetch} />
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Mint a Beast to start earning.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
        <div>ZenBeasts: Value-driven, community-first, built for the long haul.</div>
        <div style={{ marginTop: 4 }}>Join the movement and help shape the future of on-chain gaming.</div>
      </section>
    </main>
  );
}
