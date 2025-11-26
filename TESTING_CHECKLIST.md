# ZenBeasts Testing Checklist

**Requirement 21.2: Test program upgrade compatibility**

This checklist ensures comprehensive testing of the ZenBeasts platform before and after deployment.

## Pre-Deployment Testing (Devnet)

### Program Build and Deployment

- [ ] **Build succeeds without errors**
  ```bash
  anchor build
  ```
  - [ ] No compilation errors
  - [ ] No warnings (or documented acceptable warnings)
  - [ ] Build artifacts created in `target/deploy/`

- [ ] **Program deploys successfully to devnet**
  ```bash
  npm run deploy:devnet
  ```
  - [ ] Deployment completes without errors
  - [ ] Program ID matches expected value
  - [ ] Sufficient SOL in deployment wallet

- [ ] **Program verification passes**
  ```bash
  npm run verify:deployment
  ```
  - [ ] Program is deployed
  - [ ] Program is executable
  - [ ] IDL matches deployed program
  - [ ] Upgrade authority is correct

### Program Initialization

- [ ] **Program initializes successfully**
  ```bash
  npm run initialize
  ```
  - [ ] Config PDA created
  - [ ] Treasury account created
  - [ ] All parameters set correctly
  - [ ] Authority set to correct wallet

- [ ] **Config parameters are correct**
  - [ ] Activity cooldown: 3600s (1 hour)
  - [ ] Breeding cooldown: 86400s (24 hours)
  - [ ] Upgrade base cost: reasonable value
  - [ ] Breeding base cost: reasonable value
  - [ ] Reward rate: sustainable value
  - [ ] Burn percentage: 0-100%
  - [ ] Rarity thresholds: [400, 600, 800, 950, 1020]

- [ ] **Cannot initialize twice**
  - [ ] Second initialization attempt fails with appropriate error

### Beast Minting Tests

- [ ] **Can mint a beast**
  ```bash
  npm run mint-sample
  ```
  - [ ] Transaction succeeds
  - [ ] Beast account created
  - [ ] NFT minted
  - [ ] Metaplex metadata created
  - [ ] Traits generated (all 0-255)
  - [ ] Rarity score calculated correctly
  - [ ] Generation = 0
  - [ ] Owner set correctly

- [ ] **Trait generation is random**
  - [ ] Mint multiple beasts
  - [ ] Verify traits differ between beasts
  - [ ] Verify rarity scores vary

- [ ] **Rarity score calculation is correct**
  - [ ] Rarity = sum of traits[0..3]
  - [ ] Test with known trait values
  - [ ] Verify calculation matches expected

### Activity System Tests

- [ ] **Can perform activity**
  ```bash
  npm run test:activity
  ```
  - [ ] Transaction succeeds
  - [ ] last_activity timestamp updated
  - [ ] activity_count incremented
  - [ ] ActivityPerformed event emitted

- [ ] **Cooldown is enforced**
  - [ ] Immediate second activity fails
  - [ ] Error message indicates cooldown
  - [ ] Activity succeeds after cooldown expires

- [ ] **Rewards accumulate correctly**
  - [ ] Wait some time after activity
  - [ ] pending_rewards increases
  - [ ] Calculation: (time_elapsed * reward_rate)

### Reward Claiming Tests

- [ ] **Can claim rewards**
  - [ ] Transaction succeeds
  - [ ] ZEN tokens transferred to user
  - [ ] pending_rewards reset to zero
  - [ ] RewardsClaimed event emitted

- [ ] **Cannot claim zero rewards**
  - [ ] Claim immediately after previous claim fails
  - [ ] Error message indicates no rewards

- [ ] **Reward calculation is accurate**
  - [ ] Claimed amount matches expected
  - [ ] Treasury balance decreases correctly

### Trait Upgrade Tests

- [ ] **Can upgrade trait**
  ```bash
  npm run test:upgrade
  ```
  - [ ] Transaction succeeds
  - [ ] Trait value increments by 1
  - [ ] Rarity score recalculated
  - [ ] ZEN tokens deducted
  - [ ] TraitUpgraded event emitted

- [ ] **Upgrade cost scales correctly**
  - [ ] Cost = base_cost * (1 + trait_value / scaling_factor)
  - [ ] Test at different trait values
  - [ ] Verify calculation matches expected

- [ ] **Cannot upgrade beyond 255**
  - [ ] Set trait to 255
  - [ ] Upgrade attempt fails
  - [ ] Error indicates trait at maximum

- [ ] **Insufficient balance rejected**
  - [ ] Attempt upgrade without enough ZEN
  - [ ] Transaction fails
  - [ ] Error indicates insufficient funds

### Breeding Tests

- [ ] **Can breed beasts**
  ```bash
  npm run test:breed
  ```
  - [ ] Transaction succeeds
  - [ ] Offspring created
  - [ ] Offspring traits within expected range
  - [ ] Generation = max(parent_gens) + 1
  - [ ] Parent breeding timestamps updated
  - [ ] Parent breeding counts incremented
  - [ ] BeastBred event emitted

- [ ] **Trait inheritance is correct**
  - [ ] Offspring traits ≈ average of parents ± 20
  - [ ] All offspring traits in [0, 255]
  - [ ] Test with various parent combinations

- [ ] **Breeding cooldown enforced**
  - [ ] Immediate second breeding fails
  - [ ] Error indicates breeding cooldown

- [ ] **Breeding count limit enforced**
  - [ ] Breed beast to max count
  - [ ] Next breeding attempt fails
  - [ ] Error indicates max breeding reached

- [ ] **Generation-based cost scaling**
  - [ ] Cost increases with generation
  - [ ] Formula: base_cost * generation_multiplier^max_gen
  - [ ] Verify calculation matches expected

### Treasury and Token Economics Tests

- [ ] **Token burning works**
  - [ ] Perform upgrade or breeding
  - [ ] Verify burn_percentage of tokens burned
  - [ ] Total supply decreases

- [ ] **Treasury receives tokens**
  - [ ] Treasury balance increases after upgrades
  - [ ] Treasury balance increases after breeding
  - [ ] Amount = cost - burn_amount

- [ ] **Treasury can fund rewards**
  - [ ] Treasury has sufficient balance
  - [ ] Reward claims succeed
  - [ ] Treasury balance decreases

### Security Tests

- [ ] **PDA validation works**
  - [ ] Cannot use invalid PDA
  - [ ] Cannot use PDA with wrong seeds
  - [ ] Cannot use PDA with wrong bump

- [ ] **Ownership validation works**
  - [ ] Cannot operate on beast you don't own
  - [ ] Error indicates unauthorized

- [ ] **Signer validation works**
  - [ ] Cannot execute without signing
  - [ ] Error indicates missing signature

- [ ] **Arithmetic safety works**
  - [ ] Overflow attempts fail gracefully
  - [ ] Underflow attempts fail gracefully
  - [ ] No wrapping behavior

### Error Handling Tests

- [ ] **Error messages are clear**
  - [ ] Insufficient funds error shows amounts
  - [ ] Cooldown error shows remaining time
  - [ ] Authorization errors are specific
  - [ ] Validation errors describe issue

- [ ] **Frontend translates errors**
  - [ ] All error codes have translations
  - [ ] Translations are user-friendly
  - [ ] Actionable guidance provided

## Frontend Testing

### Wallet Integration

- [ ] **Can connect wallet**
  - [ ] Phantom wallet connects
  - [ ] Solflare wallet connects
  - [ ] Other supported wallets connect
  - [ ] Wallet address displayed correctly

- [ ] **Can disconnect wallet**
  - [ ] Disconnect succeeds
  - [ ] UI clears user data
  - [ ] No errors after disconnect

- [ ] **Mobile wallet support**
  - [ ] Deep linking works on mobile
  - [ ] Mobile wallets connect
  - [ ] Touch interactions work

### Beast Display

- [ ] **Beasts load correctly**
  - [ ] All owned beasts displayed
  - [ ] Traits shown correctly
  - [ ] Rarity score displayed
  - [ ] Generation shown

- [ ] **Cooldown timer works**
  - [ ] Timer counts down
  - [ ] Shows "Ready" when cooldown expires
  - [ ] Updates in real-time

- [ ] **Rewards display updates**
  - [ ] Pending rewards shown
  - [ ] Updates as time passes
  - [ ] Accurate calculation

### UI Components

- [ ] **MintForm works**
  - [ ] Can input metadata
  - [ ] Mint button functional
  - [ ] Loading state shows
  - [ ] Success/error feedback

- [ ] **ActivityPanel works**
  - [ ] Activity types selectable
  - [ ] Cooldown status shown
  - [ ] Activity button functional
  - [ ] Expected rewards displayed

- [ ] **UpgradePanel works**
  - [ ] Trait selection works
  - [ ] Cost displayed correctly
  - [ ] Progress bar accurate
  - [ ] Upgrade button functional
  - [ ] Achievement indicators show

- [ ] **BreedingPanel works**
  - [ ] Parent selection works
  - [ ] Cooldown status shown
  - [ ] Breeding count displayed
  - [ ] Cost calculation correct
  - [ ] Breed button functional

- [ ] **ClaimPanel works**
  - [ ] Rewards displayed
  - [ ] Claim button functional
  - [ ] Transaction progress shown
  - [ ] Balance updates after claim

### Performance

- [ ] **Loading states work**
  - [ ] Skeleton loaders show
  - [ ] Smooth transitions
  - [ ] No layout shifts

- [ ] **Real-time updates work**
  - [ ] WebSocket subscriptions active
  - [ ] UI updates within 2 seconds
  - [ ] No polling delays

- [ ] **Pagination works**
  - [ ] Large collections paginated
  - [ ] Virtual scrolling smooth
  - [ ] Performance acceptable

### Mobile Responsiveness

- [ ] **Mobile layout works**
  - [ ] Single column on mobile
  - [ ] Touch-friendly buttons
  - [ ] Readable text sizes
  - [ ] No horizontal scrolling

- [ ] **Accessibility works**
  - [ ] Keyboard navigation functional
  - [ ] Screen reader support
  - [ ] ARIA labels present
  - [ ] Focus indicators visible

## Integration Testing

### End-to-End Flows

- [ ] **Complete mint → activity → claim flow**
  1. Mint a beast
  2. Perform activity
  3. Wait for cooldown
  4. Claim rewards
  5. Verify all steps succeed

- [ ] **Complete upgrade flow**
  1. Mint a beast
  2. Earn some ZEN tokens
  3. Upgrade a trait
  4. Verify rarity increases
  5. Verify cost deducted

- [ ] **Complete breeding flow**
  1. Mint two beasts
  2. Earn breeding cost
  3. Breed beasts
  4. Verify offspring created
  5. Verify parents updated

### Multi-User Testing

- [ ] **Multiple users can interact**
  - [ ] User A mints beast
  - [ ] User B mints beast
  - [ ] Both can perform activities
  - [ ] No interference between users

- [ ] **Beast transfer works**
  - [ ] Transfer beast to another wallet
  - [ ] New owner can claim rewards
  - [ ] New owner can perform activities
  - [ ] State preserved during transfer

## Program Upgrade Testing

**Requirement 21.2: Test program upgrade compatibility**

### Before Upgrade

- [ ] **Document current state**
  - [ ] Record all beast accounts
  - [ ] Record config state
  - [ ] Record treasury balance
  - [ ] Export all data

- [ ] **Create backup**
  - [ ] Backup program account
  - [ ] Backup config PDA
  - [ ] Backup treasury account
  - [ ] Store backups securely

### Upgrade Process

- [ ] **Build new version**
  - [ ] New version builds successfully
  - [ ] IDL changes documented
  - [ ] Migration plan prepared

- [ ] **Deploy upgrade**
  - [ ] Upgrade deploys successfully
  - [ ] Program ID unchanged
  - [ ] Upgrade authority verified

### After Upgrade

- [ ] **Verify backward compatibility**
  - [ ] Existing beasts still accessible
  - [ ] Old accounts still readable
  - [ ] No data corruption

- [ ] **Test all functions**
  - [ ] Minting still works
  - [ ] Activities still work
  - [ ] Upgrades still work
  - [ ] Breeding still works
  - [ ] Claims still work

- [ ] **Verify new features**
  - [ ] New instructions work
  - [ ] New fields accessible
  - [ ] New events emitted

## Mainnet Pre-Launch Checklist

### Security Audit

- [ ] **Code review completed**
  - [ ] All code reviewed by team
  - [ ] Security best practices followed
  - [ ] No known vulnerabilities

- [ ] **External audit** (recommended)
  - [ ] Professional audit completed
  - [ ] All findings addressed
  - [ ] Audit report published

### Economic Validation

- [ ] **Token economics verified**
  - [ ] Reward rates sustainable
  - [ ] Burn percentage appropriate
  - [ ] Treasury adequately funded
  - [ ] Cost structures balanced

- [ ] **Simulation testing**
  - [ ] Simulate 1000+ users
  - [ ] Verify treasury doesn't deplete
  - [ ] Verify no economic exploits

### Infrastructure

- [ ] **Monitoring setup**
  - [ ] Program health monitoring
  - [ ] Treasury balance alerts
  - [ ] RPC endpoint monitoring
  - [ ] Error tracking configured

- [ ] **Backup procedures tested**
  - [ ] Automated backups working
  - [ ] Recovery procedures tested
  - [ ] Disaster recovery plan ready

### Documentation

- [ ] **User documentation complete**
  - [ ] How to play guide
  - [ ] Wallet setup guide
  - [ ] FAQ prepared
  - [ ] Troubleshooting guide

- [ ] **Technical documentation complete**
  - [ ] API documentation
  - [ ] Program architecture documented
  - [ ] Deployment guide complete
  - [ ] Recovery procedures documented

### Final Checks

- [ ] **All tests passing**
  - [ ] Unit tests: 100% pass
  - [ ] Integration tests: 100% pass
  - [ ] Property tests: 100% pass
  - [ ] Manual tests: All pass

- [ ] **Team sign-off**
  - [ ] Development team approves
  - [ ] Security team approves
  - [ ] Product team approves
  - [ ] Leadership approves

- [ ] **Launch plan ready**
  - [ ] Deployment schedule set
  - [ ] Communication plan ready
  - [ ] Support team briefed
  - [ ] Rollback plan prepared

## Post-Launch Monitoring

### First 24 Hours

- [ ] **Monitor continuously**
  - [ ] Watch for errors
  - [ ] Monitor transaction volume
  - [ ] Check treasury balance
  - [ ] Verify RPC health

- [ ] **User feedback**
  - [ ] Monitor support channels
  - [ ] Track user issues
  - [ ] Respond to questions
  - [ ] Document common problems

### First Week

- [ ] **Performance review**
  - [ ] Analyze transaction patterns
  - [ ] Review error rates
  - [ ] Check economic metrics
  - [ ] Assess user engagement

- [ ] **Optimization**
  - [ ] Identify bottlenecks
  - [ ] Optimize if needed
  - [ ] Update documentation
  - [ ] Plan improvements

---

**Note**: This checklist should be completed before each deployment. For mainnet, all items must be checked. For devnet, focus on functional testing items.

**Last Updated**: 2024-01-XX  
**Version**: 1.0
