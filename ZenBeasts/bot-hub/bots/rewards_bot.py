#!/usr/bin/env python3
"""
Rewards Bot - Automated reward distribution for ZenBeasts
Features: Token distribution, XP rewards, leaderboard tracking, automated payouts
"""

import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

sys.path.append("..")
from bot_base import BotBase


class RewardsBot(BotBase):
    """Automated rewards distribution and tracking bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Rewards settings
        self.distribution_schedule = self.get_config(
            "distribution_schedule", "0 0 * * 0"
        )  # Weekly on Sunday

        # Reward tiers and amounts
        self.reward_tiers = {
            "daily_active": 10,  # ZEN tokens
            "weekly_active": 50,
            "monthly_active": 200,
            "top_contributor": 500,
            "milestone_achievement": 100,
            "referral": 25,
            "first_mint": 50,
            "activity_completion": 15,
        }

        # Tracking
        self.pending_rewards = []
        self.distributed_rewards = []
        self.reward_history = {}
        self.leaderboard = {}

        # Distribution limits
        self.daily_distribution_limit = self.get_config(
            "daily_distribution_limit", 10000
        )  # Max 10k ZEN per day
        self.min_payout_threshold = self.get_config(
            "min_payout_threshold", 10
        )  # Min 10 ZEN to distribute

        self.logger.info("RewardsBot initialized")

    def start(self):
        """Start the rewards bot"""
        self.running = True
        self.stats["start_time"] = time.time()
        self.logger.info("RewardsBot started")

        # Run the main loop
        self.run()

    def stop(self):
        """Stop the rewards bot"""
        self.running = False
        self.logger.info("RewardsBot stopped")

    def run(self):
        """Main bot loop"""
        last_daily_check = None
        last_weekly_distribution = None

        while self.running:
            try:
                now = datetime.now()

                # Daily rewards check (midnight)
                if now.hour == 0 and (
                    not last_daily_check or last_daily_check.date() < now.date()
                ):
                    self._process_daily_rewards()
                    last_daily_check = now

                # Weekly distribution (Sunday)
                if (
                    now.weekday() == 6
                    and now.hour == 0
                    and (
                        not last_weekly_distribution
                        or (now - last_weekly_distribution).days >= 7
                    )
                ):
                    self._process_weekly_distribution()
                    last_weekly_distribution = now

                # Check pending rewards every hour
                self._check_pending_rewards()

                # Update leaderboard every 6 hours
                if now.hour % 6 == 0:
                    self._update_leaderboard()

                # Wait 5 minutes before next check
                time.sleep(300)

            except Exception as e:
                self.logger.error(f"Error in RewardsBot loop: {e}")
                self.healthy = False
                time.sleep(300)

    def add_reward(
        self,
        user_id: str,
        amount: float,
        reason: str,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Add a reward to the pending queue

        Args:
            user_id: User identifier
            amount: Reward amount in ZEN tokens
            reason: Reason for reward
            metadata: Additional metadata

        Returns:
            Reward record dictionary
        """
        reward = {
            "id": f"reward-{int(time.time())}-{user_id}",
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "metadata": metadata or {},
        }

        self.pending_rewards.append(reward)
        self.logger.info(f"Added reward: {amount} ZEN for {user_id} (reason: {reason})")

        return reward

    def distribute_reward(self, reward: Dict) -> bool:
        """
        Distribute a specific reward

        Args:
            reward: Reward dictionary

        Returns:
            True if successful, False otherwise
        """
        try:
            user_id = reward["user_id"]
            amount = reward["amount"]

            self.logger.info(f"Distributing {amount} ZEN to {user_id}")

            # Check if amount meets threshold
            if amount < self.min_payout_threshold:
                self.logger.warning(
                    f"Amount {amount} below threshold {self.min_payout_threshold}"
                )
                return False

            # Check daily distribution limit
            today_total = self._get_today_distribution_total()
            if today_total + amount > self.daily_distribution_limit:
                self.logger.warning(
                    f"Daily distribution limit reached: {today_total}/{self.daily_distribution_limit}"
                )
                return False

            # Here you would integrate with Solana to actually send tokens
            # For now, we'll simulate the distribution
            success = self._execute_token_transfer(user_id, amount)

            if success:
                reward["status"] = "distributed"
                reward["distributed_at"] = datetime.now().isoformat()
                self.distributed_rewards.append(reward)

                # Update user history
                if user_id not in self.reward_history:
                    self.reward_history[user_id] = []
                self.reward_history[user_id].append(reward)

                # Remove from pending
                self.pending_rewards.remove(reward)

                self.logger.info(f"Successfully distributed {amount} ZEN to {user_id}")
                return True
            else:
                reward["status"] = "failed"
                self.logger.error(f"Failed to distribute reward to {user_id}")
                return False

        except Exception as e:
            self.logger.error(f"Error distributing reward: {e}")
            reward["status"] = "error"
            reward["error"] = str(e)
            return False

    def _execute_token_transfer(self, user_id: str, amount: float) -> bool:
        """
        Execute the actual token transfer on Solana

        Args:
            user_id: Recipient user ID
            amount: Amount to transfer

        Returns:
            True if successful
        """
        # This would integrate with Solana Web3.py
        # For now, simulate success
        self.logger.info(f"[SIMULATED] Transferred {amount} ZEN to {user_id}")
        time.sleep(0.1)  # Simulate transaction time
        return True

    def _check_pending_rewards(self):
        """Check and process pending rewards"""
        if not self.pending_rewards:
            return

        self.logger.info(f"Processing {len(self.pending_rewards)} pending rewards")

        # Process rewards in batches
        batch_size = 10
        processed = 0

        for reward in self.pending_rewards[:batch_size]:
            if self.distribute_reward(reward):
                processed += 1

        if processed > 0:
            self.logger.info(f"Processed {processed} rewards")

    def _process_daily_rewards(self):
        """Process daily reward eligibility"""
        self.logger.info("Processing daily rewards...")

        # This would query your database for eligible users
        # For now, we'll simulate finding eligible users
        eligible_users = self._get_daily_active_users()

        for user_id in eligible_users:
            self.add_reward(
                user_id=user_id,
                amount=self.reward_tiers["daily_active"],
                reason="Daily active user reward",
                metadata={"date": datetime.now().date().isoformat()},
            )

        self.logger.info(f"Added daily rewards for {len(eligible_users)} users")

    def _process_weekly_distribution(self):
        """Process weekly reward distribution"""
        self.logger.info("Processing weekly distribution...")

        # Get top contributors
        top_users = self._get_top_contributors()

        for i, (user_id, contribution_score) in enumerate(top_users[:10]):
            # Top 10 get bonus rewards
            bonus = self.reward_tiers["top_contributor"] * (1 - i * 0.1)

            self.add_reward(
                user_id=user_id,
                amount=bonus,
                reason=f"Top contributor #{i + 1}",
                metadata={
                    "rank": i + 1,
                    "contribution_score": contribution_score,
                    "week": datetime.now().isocalendar()[1],
                },
            )

        self.logger.info(f"Added weekly rewards for {len(top_users)} top contributors")

    def _get_daily_active_users(self) -> List[str]:
        """Get users active in the last 24 hours"""
        # This would query your database
        # For now, return empty list
        return []

    def _get_top_contributors(self) -> List[Tuple[str, float]]:
        """Get top contributors with their scores"""
        # This would calculate contribution scores from database
        # For now, return empty list
        return []

    def _get_today_distribution_total(self) -> float:
        """Calculate total distributed today"""
        today = datetime.now().date()
        total = 0.0

        for reward in self.distributed_rewards:
            if "distributed_at" in reward:
                dist_date = datetime.fromisoformat(reward["distributed_at"]).date()
                if dist_date == today:
                    total += reward["amount"]

        return total

    def _update_leaderboard(self):
        """Update the rewards leaderboard"""
        self.logger.info("Updating leaderboard...")

        # Calculate leaderboard from reward history
        user_totals = {}

        for user_id, rewards in self.reward_history.items():
            total = sum(r["amount"] for r in rewards if r["status"] == "distributed")
            user_totals[user_id] = total

        # Sort by total rewards
        self.leaderboard = dict(
            sorted(user_totals.items(), key=lambda x: x[1], reverse=True)
        )

        self.logger.info(f"Leaderboard updated: {len(self.leaderboard)} users")

    def get_user_rewards(self, user_id: str) -> Dict:
        """
        Get reward information for a specific user

        Args:
            user_id: User identifier

        Returns:
            User reward information
        """
        history = self.reward_history.get(user_id, [])
        pending = [r for r in self.pending_rewards if r["user_id"] == user_id]

        total_earned = sum(r["amount"] for r in history if r["status"] == "distributed")
        total_pending = sum(r["amount"] for r in pending)

        # Get user rank
        rank = None
        if user_id in self.leaderboard:
            rank = list(self.leaderboard.keys()).index(user_id) + 1

        return {
            "user_id": user_id,
            "total_earned": total_earned,
            "total_pending": total_pending,
            "reward_count": len(history),
            "rank": rank,
            "recent_rewards": history[-5:],  # Last 5 rewards
        }

    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """
        Get the top users by rewards

        Args:
            limit: Number of users to return

        Returns:
            List of top users with their rewards
        """
        top_users = []

        for i, (user_id, total) in enumerate(list(self.leaderboard.items())[:limit]):
            top_users.append(
                {
                    "rank": i + 1,
                    "user_id": user_id,
                    "total_rewards": total,
                }
            )

        return top_users

    def get_statistics(self) -> Dict:
        """Get rewards statistics"""
        total_distributed = sum(
            r["amount"]
            for r in self.distributed_rewards
            if r["status"] == "distributed"
        )
        total_pending = sum(r["amount"] for r in self.pending_rewards)

        return {
            "total_distributed": total_distributed,
            "total_pending": total_pending,
            "pending_count": len(self.pending_rewards),
            "distributed_count": len(self.distributed_rewards),
            "unique_recipients": len(self.reward_history),
            "today_distribution": self._get_today_distribution_total(),
            "daily_limit": self.daily_distribution_limit,
            "leaderboard_size": len(self.leaderboard),
        }

    def process_milestone(self, user_id: str, milestone: str):
        """
        Award reward for achieving a milestone

        Args:
            user_id: User identifier
            milestone: Milestone name
        """
        self.add_reward(
            user_id=user_id,
            amount=self.reward_tiers["milestone_achievement"],
            reason=f"Milestone achieved: {milestone}",
            metadata={"milestone": milestone},
        )

    def process_referral(self, referrer_id: str, referred_id: str):
        """
        Award reward for successful referral

        Args:
            referrer_id: User who made the referral
            referred_id: User who was referred
        """
        self.add_reward(
            user_id=referrer_id,
            amount=self.reward_tiers["referral"],
            reason="Successful referral",
            metadata={"referred_user": referred_id},
        )

    def process_activity_reward(self, user_id: str, activity_type: str):
        """
        Award reward for completing an activity

        Args:
            user_id: User identifier
            activity_type: Type of activity completed
        """
        self.add_reward(
            user_id=user_id,
            amount=self.reward_tiers["activity_completion"],
            reason=f"Activity completed: {activity_type}",
            metadata={"activity_type": activity_type},
        )

    def export_report(self, period: str = "week") -> Dict:
        """
        Export rewards report for a time period

        Args:
            period: Time period (day, week, month)

        Returns:
            Report dictionary
        """
        now = datetime.now()

        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(weeks=1)

        # Filter rewards in period
        period_rewards = [
            r
            for r in self.distributed_rewards
            if "distributed_at" in r
            and datetime.fromisoformat(r["distributed_at"]) > start_date
        ]

        total_amount = sum(r["amount"] for r in period_rewards)
        unique_users = len(set(r["user_id"] for r in period_rewards))

        # Group by reason
        by_reason = {}
        for r in period_rewards:
            reason = r["reason"]
            if reason not in by_reason:
                by_reason[reason] = {"count": 0, "total": 0}
            by_reason[reason]["count"] += 1
            by_reason[reason]["total"] += r["amount"]

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": now.isoformat(),
            "total_distributed": total_amount,
            "reward_count": len(period_rewards),
            "unique_recipients": unique_users,
            "by_reason": by_reason,
            "average_reward": total_amount / len(period_rewards)
            if period_rewards
            else 0,
        }


if __name__ == "__main__":
    # Test the bot
    from dotenv import load_dotenv

    load_dotenv()

    config = {
        "distribution_schedule": "0 0 * * 0",
        "daily_distribution_limit": 10000,
    }

    bot = RewardsBot(config)
    print(f"RewardsBot initialized: {bot.name}")
    print(f"Reward tiers: {bot.reward_tiers}")

    # Add test reward
    bot.add_reward("user123", 50, "Test reward")
    print(f"\nPending rewards: {len(bot.pending_rewards)}")

    # Get statistics
    stats = bot.get_statistics()
    print(f"\nStatistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
