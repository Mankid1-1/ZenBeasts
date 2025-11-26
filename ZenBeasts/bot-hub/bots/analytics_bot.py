#!/usr/bin/env python3
"""
Analytics Bot - Automated analytics and reporting for ZenBeasts
Features: Metrics tracking, report generation, data visualization, trend analysis
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

sys.path.append("..")
from bot_base import BotBase


class AnalyticsBot(BotBase):
    """Automated analytics and reporting bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Bot settings
        self.report_schedule = self.get_config("report_schedule", "0 8 * * *")
        self.metrics_to_track = [
            "user_engagement",
            "nft_mints",
            "activities_completed",
            "token_burns",
            "community_growth",
        ]

        # Metrics storage
        self.metrics_history = {}
        self.last_report = None

        self.logger.info("AnalyticsBot initialized")

    def start(self):
        """Start the analytics bot"""
        self.running = True
        self.stats["start_time"] = time.time()
        self.logger.info("AnalyticsBot started")

        # Run the main loop
        self.run()

    def stop(self):
        """Stop the analytics bot"""
        self.running = False
        self.logger.info("AnalyticsBot stopped")

    def run(self):
        """Main bot loop"""
        last_daily_report = None
        last_hourly_check = None

        while self.running:
            try:
                now = datetime.now()

                # Hourly metrics collection
                if not last_hourly_check or (now - last_hourly_check).seconds >= 3600:
                    self._collect_metrics()
                    last_hourly_check = now

                # Daily report at 8 AM
                if now.hour == 8 and (
                    not last_daily_report or last_daily_report.date() < now.date()
                ):
                    self.generate_report("daily")
                    last_daily_report = now

                # Wait 5 minutes before next check
                time.sleep(300)

            except Exception as e:
                self.logger.error(f"Error in AnalyticsBot loop: {e}")
                self.healthy = False
                time.sleep(300)

    def _collect_metrics(self):
        """Collect current metrics"""
        try:
            timestamp = datetime.now().isoformat()

            # Simulate collecting metrics (replace with actual data sources)
            metrics = {
                "timestamp": timestamp,
                "user_engagement": self._get_engagement_metrics(),
                "nft_mints": self._get_mint_metrics(),
                "activities": self._get_activity_metrics(),
                "community": self._get_community_metrics(),
                "economy": self._get_economy_metrics(),
            }

            # Store in history
            for key, value in metrics.items():
                if key not in self.metrics_history:
                    self.metrics_history[key] = []
                self.metrics_history[key].append(value)

            # Keep only last 7 days of data
            self._cleanup_old_metrics(days=7)

            self.logger.debug("Metrics collected successfully")

        except Exception as e:
            self.logger.error(f"Error collecting metrics: {e}")

    def _get_engagement_metrics(self) -> Dict:
        """Get user engagement metrics"""
        return {
            "dau": 0,  # Daily Active Users
            "wau": 0,  # Weekly Active Users
            "mau": 0,  # Monthly Active Users
            "session_duration_avg": 0.0,
            "actions_per_user": 0.0,
        }

    def _get_mint_metrics(self) -> Dict:
        """Get NFT minting metrics"""
        return {
            "total_mints": 0,
            "mints_today": 0,
            "unique_minters": 0,
            "mint_rate_per_hour": 0.0,
            "total_supply": 0,
        }

    def _get_activity_metrics(self) -> Dict:
        """Get activity system metrics"""
        return {
            "activities_today": 0,
            "unique_participants": 0,
            "rewards_distributed": 0.0,
            "most_popular_activity": "",
        }

    def _get_community_metrics(self) -> Dict:
        """Get community growth metrics"""
        return {
            "discord_members": 0,
            "discord_active": 0,
            "twitter_followers": 0,
            "twitter_engagement_rate": 0.0,
            "new_members_today": 0,
        }

    def _get_economy_metrics(self) -> Dict:
        """Get token economy metrics"""
        return {
            "token_price": 0.0,
            "market_cap": 0.0,
            "trading_volume_24h": 0.0,
            "holders": 0,
            "burns_today": 0.0,
        }

    def _cleanup_old_metrics(self, days: int = 7):
        """Remove metrics older than specified days"""
        cutoff = datetime.now() - timedelta(days=days)

        for key in self.metrics_history:
            if isinstance(self.metrics_history[key], list):
                self.metrics_history[key] = [
                    m
                    for m in self.metrics_history[key]
                    if isinstance(m, dict)
                    and datetime.fromisoformat(m.get("timestamp", "2000-01-01"))
                    > cutoff
                ]

    def generate_report(self, report_type: str = "daily") -> Dict:
        """
        Generate analytics report

        Args:
            report_type: Type of report (daily, weekly, monthly)

        Returns:
            Report data dictionary
        """
        self.logger.info(f"Generating {report_type} report...")

        try:
            if report_type == "daily":
                report = self._generate_daily_report()
            elif report_type == "weekly":
                report = self._generate_weekly_report()
            elif report_type == "monthly":
                report = self._generate_monthly_report()
            else:
                report = self._generate_custom_report()

            # Store report
            self.last_report = report
            self._save_report(report)

            # Send report to Discord/Slack
            self._send_report_notification(report)

            self.logger.info(f"{report_type.title()} report generated successfully")
            return report

        except Exception as e:
            self.logger.error(f"Error generating report: {e}")
            return {}

    def _generate_daily_report(self) -> Dict:
        """Generate daily analytics report"""
        now = datetime.now()
        yesterday = now - timedelta(days=1)

        report = {
            "type": "daily",
            "date": now.date().isoformat(),
            "generated_at": now.isoformat(),
            "summary": {},
            "metrics": {},
            "trends": {},
            "highlights": [],
        }

        # Calculate daily metrics
        report["metrics"] = {
            "user_engagement": {
                "dau": 0,
                "avg_session_duration": "0m",
                "actions_per_user": 0.0,
            },
            "nfts": {
                "minted_today": 0,
                "unique_minters": 0,
                "total_supply": 0,
            },
            "activities": {
                "completed": 0,
                "participants": 0,
                "rewards_distributed": 0.0,
            },
            "community": {
                "new_members": 0,
                "discord_active": 0,
                "twitter_engagement": "0%",
            },
        }

        # Calculate trends (compared to yesterday)
        report["trends"] = {
            "user_growth": "+0%",
            "engagement_change": "+0%",
            "mint_velocity": "+0%",
        }

        # Highlights
        report["highlights"] = [
            "📊 Daily active users stable",
            "🎨 NFT minting steady",
            "⚡ Activity system performing well",
            "🌱 Community growing organically",
        ]

        return report

    def _generate_weekly_report(self) -> Dict:
        """Generate weekly analytics report"""
        now = datetime.now()
        week_start = now - timedelta(days=7)

        report = {
            "type": "weekly",
            "week_ending": now.date().isoformat(),
            "generated_at": now.isoformat(),
            "summary": {
                "total_users": 0,
                "new_users": 0,
                "retention_rate": "0%",
                "churn_rate": "0%",
            },
            "top_performers": {
                "most_active_users": [],
                "top_beasts": [],
                "popular_activities": [],
            },
            "goals": {
                "user_acquisition": {"target": 100, "achieved": 0, "progress": "0%"},
                "nft_mints": {"target": 500, "achieved": 0, "progress": "0%"},
                "community_engagement": {
                    "target": 1000,
                    "achieved": 0,
                    "progress": "0%",
                },
            },
        }

        return report

    def _generate_monthly_report(self) -> Dict:
        """Generate monthly analytics report"""
        now = datetime.now()
        month_start = now.replace(day=1)

        report = {
            "type": "monthly",
            "month": now.strftime("%B %Y"),
            "generated_at": now.isoformat(),
            "overview": {
                "total_users": 0,
                "growth_rate": "0%",
                "revenue": 0.0,
                "costs": 0.0,
                "net": 0.0,
            },
            "milestones": [],
            "challenges": [],
            "recommendations": [],
        }

        return report

    def _generate_custom_report(self) -> Dict:
        """Generate custom report"""
        return {
            "type": "custom",
            "generated_at": datetime.now().isoformat(),
            "data": {},
        }

    def _save_report(self, report: Dict):
        """Save report to file"""
        try:
            reports_dir = "data/reports"
            os.makedirs(reports_dir, exist_ok=True)

            filename = (
                f"{report['type']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            filepath = os.path.join(reports_dir, filename)

            with open(filepath, "w") as f:
                json.dump(report, f, indent=2)

            self.logger.info(f"Report saved: {filepath}")

        except Exception as e:
            self.logger.error(f"Error saving report: {e}")

    def _send_report_notification(self, report: Dict):
        """Send report notification to Discord/Slack"""
        try:
            webhook_url = os.getenv("WEBHOOK_URL")
            if not webhook_url:
                return

            # Format report summary
            summary = self._format_report_summary(report)

            # Send to webhook (Discord format)
            import requests

            payload = {
                "content": f"📊 **{report['type'].title()} Analytics Report**",
                "embeds": [
                    {
                        "title": f"{report['type'].title()} Report",
                        "description": summary,
                        "color": 3447003,  # Blue
                        "timestamp": report["generated_at"],
                    }
                ],
            }

            response = requests.post(webhook_url, json=payload)

            if response.status_code == 204:
                self.logger.info("Report notification sent")
            else:
                self.logger.warning(
                    f"Failed to send notification: {response.status_code}"
                )

        except Exception as e:
            self.logger.error(f"Error sending report notification: {e}")

    def _format_report_summary(self, report: Dict) -> str:
        """Format report for notification"""
        if report["type"] == "daily":
            return f"""
**Daily Summary**
• DAU: {report["metrics"]["user_engagement"]["dau"]}
• NFTs Minted: {report["metrics"]["nfts"]["minted_today"]}
• Activities: {report["metrics"]["activities"]["completed"]}
• New Members: {report["metrics"]["community"]["new_members"]}

**Highlights**
{chr(10).join(report["highlights"])}
"""
        elif report["type"] == "weekly":
            return f"""
**Weekly Summary**
• Total Users: {report["summary"]["total_users"]}
• New Users: {report["summary"]["new_users"]}
• Retention: {report["summary"]["retention_rate"]}
"""
        else:
            return "Report generated successfully"

    def get_metric_history(self, metric_name: str, hours: int = 24) -> List[Dict]:
        """Get historical data for a metric"""
        cutoff = datetime.now() - timedelta(hours=hours)

        if metric_name not in self.metrics_history:
            return []

        return [
            m
            for m in self.metrics_history[metric_name]
            if isinstance(m, dict)
            and datetime.fromisoformat(m.get("timestamp", "2000-01-01")) > cutoff
        ]

    def calculate_growth_rate(self, metric: str, period: str = "daily") -> float:
        """Calculate growth rate for a metric"""
        try:
            history = self.get_metric_history(metric, hours=48)

            if len(history) < 2:
                return 0.0

            current = history[-1].get("value", 0)
            previous = history[0].get("value", 1)

            if previous == 0:
                return 0.0

            growth = ((current - previous) / previous) * 100
            return round(growth, 2)

        except Exception as e:
            self.logger.error(f"Error calculating growth rate: {e}")
            return 0.0

    def get_dashboard_data(self) -> Dict:
        """Get data for analytics dashboard"""
        return {
            "current_metrics": self._collect_metrics(),
            "last_report": self.last_report,
            "trends": {
                "user_growth": self.calculate_growth_rate("users"),
                "mint_growth": self.calculate_growth_rate("mints"),
                "activity_growth": self.calculate_growth_rate("activities"),
            },
            "health": {
                "healthy": self.healthy,
                "last_update": datetime.now().isoformat(),
            },
        }


if __name__ == "__main__":
    # Test the bot
    from dotenv import load_dotenv

    load_dotenv()

    config = {
        "report_schedule": "0 8 * * *",
    }

    bot = AnalyticsBot(config)
    print(f"AnalyticsBot initialized: {bot.name}")

    # Generate test report
    report = bot.generate_report("daily")
    print(f"\nGenerated report: {report['type']}")
    print(f"Highlights: {len(report.get('highlights', []))}")
