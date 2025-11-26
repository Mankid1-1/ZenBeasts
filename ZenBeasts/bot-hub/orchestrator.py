#!/usr/bin/env python3
"""
ZenBeasts Bot Hub Orchestrator
Central controller for managing all automation bots
"""

import os
import sys
import time
import yaml
import json
import logging
import argparse
import schedule
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor
import signal

# Add bots directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'bots'))

from utils.logger import setup_logger
from utils.db import Database
from bot_base import BotBase


class BotOrchestrator:
    """Central orchestrator for managing all bots"""

    def __init__(self, config_path: str = "config/bots.yaml"):
        self.config_path = config_path
        self.config = self.load_config()
        self.logger = setup_logger("orchestrator")
        self.db = Database()
        self.bots: Dict[str, BotBase] = {}
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.running = False

        # Setup signal handlers
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

        self.logger.info("Bot Orchestrator initialized")

    def load_config(self) -> dict:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"Config file not found: {self.config_path}")
            return self._create_default_config()

    def _create_default_config(self) -> dict:
        """Create default configuration"""
        default_config = {
            'orchestrator': {
                'log_level': 'INFO',
                'max_workers': 10,
                'health_check_interval': 60,
            },
            'twitter_bot': {
                'enabled': False,
                'schedule': '0 9,12,15,18 * * *',
            },
            'discord_bot': {
                'enabled': False,
            },
            'content_bot': {
                'enabled': False,
                'daily_threads': 3,
            },
            'analytics_bot': {
                'enabled': False,
                'report_schedule': '0 8 * * *',
            },
            'deployment_bot': {
                'enabled': False,
            },
            'monitoring_bot': {
                'enabled': True,
                'check_interval': 60,
            },
            'rewards_bot': {
                'enabled': False,
            },
            'marketing_bot': {
                'enabled': False,
            },
        }

        # Save default config
        os.makedirs('config', exist_ok=True)
        with open(self.config_path, 'w') as f:
            yaml.dump(default_config, f, default_flow_style=False)

        return default_config

    def register_bot(self, bot_name: str, bot_instance: BotBase):
        """Register a bot with the orchestrator"""
        self.bots[bot_name] = bot_instance
        self.logger.info(f"Registered bot: {bot_name}")

    def load_bots(self):
        """Dynamically load all enabled bots"""
        bot_modules = {
            'twitter_bot': 'twitter_bot.TwitterBot',
            'discord_bot': 'discord_bot.DiscordBot',
            'content_bot': 'content_bot.ContentBot',
            'analytics_bot': 'analytics_bot.AnalyticsBot',
            'deployment_bot': 'deployment_bot.DeploymentBot',
            'monitoring_bot': 'monitoring_bot.MonitoringBot',
            'rewards_bot': 'rewards_bot.RewardsBot',
            'marketing_bot': 'marketing_bot.MarketingBot',
        }

        for bot_name, bot_class_path in bot_modules.items():
            if self.config.get(bot_name, {}).get('enabled', False):
                try:
                    module_name, class_name = bot_class_path.rsplit('.', 1)
                    module = __import__(module_name)
                    bot_class = getattr(module, class_name)
                    bot_instance = bot_class(self.config[bot_name])
                    self.register_bot(bot_name, bot_instance)
                    self.logger.info(f"Loaded bot: {bot_name}")
                except Exception as e:
                    self.logger.error(f"Failed to load bot {bot_name}: {e}")

    def start(self):
        """Start the orchestrator and all enabled bots"""
        self.logger.info("Starting Bot Orchestrator...")
        self.running = True

        # Load all bots
        self.load_bots()

        # Start each bot in a separate thread
        for bot_name, bot in self.bots.items():
            self.executor.submit(self._run_bot, bot_name, bot)

        # Setup scheduled tasks
        self._setup_schedules()

        # Start health check thread
        health_thread = threading.Thread(target=self._health_check_loop, daemon=True)
        health_thread.start()

        self.logger.info(f"Orchestrator started with {len(self.bots)} bots")

        # Keep main thread alive
        try:
            while self.running:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            self.shutdown()

    def _run_bot(self, bot_name: str, bot: BotBase):
        """Run a bot in a separate thread"""
        try:
            self.logger.info(f"Starting bot: {bot_name}")
            bot.start()
        except Exception as e:
            self.logger.error(f"Error running bot {bot_name}: {e}")
            self._record_bot_error(bot_name, str(e))

    def _setup_schedules(self):
        """Setup scheduled tasks for bots"""
        for bot_name, bot_config in self.config.items():
            if bot_name == 'orchestrator':
                continue

            if 'schedule' in bot_config and bot_config.get('enabled'):
                cron = bot_config['schedule']
                self.logger.info(f"Scheduling {bot_name} with cron: {cron}")
                # Convert cron to schedule format (simplified)
                # For full cron support, use APScheduler

        # Example scheduled tasks
        schedule.every().day.at("08:00").do(self._daily_report)
        schedule.every().hour.do(self._hourly_health_check)

    def _daily_report(self):
        """Generate and send daily report"""
        self.logger.info("Generating daily report...")
        if 'analytics_bot' in self.bots:
            self.executor.submit(self.bots['analytics_bot'].generate_report, 'daily')

    def _hourly_health_check(self):
        """Perform hourly health check on all bots"""
        self.logger.info("Running hourly health check...")
        for bot_name, bot in self.bots.items():
            status = bot.health_check()
            self._record_health_status(bot_name, status)

    def _health_check_loop(self):
        """Continuous health check loop"""
        interval = self.config.get('orchestrator', {}).get('health_check_interval', 60)

        while self.running:
            for bot_name, bot in self.bots.items():
                try:
                    if not bot.is_healthy():
                        self.logger.warning(f"Bot {bot_name} is unhealthy!")
                        self._attempt_bot_restart(bot_name, bot)
                except Exception as e:
                    self.logger.error(f"Health check failed for {bot_name}: {e}")

            time.sleep(interval)

    def _attempt_bot_restart(self, bot_name: str, bot: BotBase):
        """Attempt to restart an unhealthy bot"""
        self.logger.info(f"Attempting to restart {bot_name}...")
        try:
            bot.stop()
            time.sleep(2)
            self.executor.submit(self._run_bot, bot_name, bot)
            self.logger.info(f"Successfully restarted {bot_name}")
        except Exception as e:
            self.logger.error(f"Failed to restart {bot_name}: {e}")

    def _record_bot_error(self, bot_name: str, error: str):
        """Record bot error in database"""
        self.db.execute(
            "INSERT INTO bot_errors (bot_name, error, timestamp) VALUES (?, ?, ?)",
            (bot_name, error, datetime.now().isoformat())
        )

    def _record_health_status(self, bot_name: str, status: dict):
        """Record bot health status"""
        self.db.execute(
            "INSERT INTO bot_health (bot_name, status, timestamp) VALUES (?, ?, ?)",
            (bot_name, json.dumps(status), datetime.now().isoformat())
        )

    def stop_bot(self, bot_name: str):
        """Stop a specific bot"""
        if bot_name in self.bots:
            self.logger.info(f"Stopping bot: {bot_name}")
            self.bots[bot_name].stop()
            del self.bots[bot_name]
        else:
            self.logger.warning(f"Bot not found: {bot_name}")

    def restart_bot(self, bot_name: str):
        """Restart a specific bot"""
        if bot_name in self.bots:
            self.logger.info(f"Restarting bot: {bot_name}")
            self.bots[bot_name].stop()
            time.sleep(2)
            self.executor.submit(self._run_bot, bot_name, self.bots[bot_name])
        else:
            self.logger.warning(f"Bot not found: {bot_name}")

    def get_status(self) -> dict:
        """Get status of all bots"""
        status = {
            'orchestrator': {
                'running': self.running,
                'bots_count': len(self.bots),
                'uptime': time.time(),  # TODO: Track actual uptime
            },
            'bots': {}
        }

        for bot_name, bot in self.bots.items():
            status['bots'][bot_name] = {
                'name': bot_name,
                'running': bot.is_running(),
                'healthy': bot.is_healthy(),
                'last_activity': bot.get_last_activity(),
                'stats': bot.get_stats(),
            }

        return status

    def shutdown(self, signum=None, frame=None):
        """Gracefully shutdown all bots"""
        self.logger.info("Shutting down Bot Orchestrator...")
        self.running = False

        # Stop all bots
        for bot_name, bot in list(self.bots.items()):
            try:
                self.logger.info(f"Stopping bot: {bot_name}")
                bot.stop()
            except Exception as e:
                self.logger.error(f"Error stopping {bot_name}: {e}")

        # Shutdown executor
        self.executor.shutdown(wait=True)

        self.logger.info("Bot Orchestrator shutdown complete")
        sys.exit(0)

    def init_database(self):
        """Initialize database tables"""
        self.logger.info("Initializing database...")

        # Create tables
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS bot_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                error TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        self.db.execute("""
            CREATE TABLE IF NOT EXISTS bot_health (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        self.db.execute("""
            CREATE TABLE IF NOT EXISTS bot_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        self.db.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                task_name TEXT NOT NULL,
                scheduled_time TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
        """)

        self.logger.info("Database initialized successfully")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='ZenBeasts Bot Hub Orchestrator')
    parser.add_argument('command', nargs='?', default='start',
                       choices=['start', 'stop', 'restart', 'status', 'init', 'logs'],
                       help='Command to execute')
    parser.add_argument('--bot', help='Specific bot to operate on')
    parser.add_argument('--config', default='config/bots.yaml', help='Config file path')

    args = parser.parse_args()

    orchestrator = BotOrchestrator(config_path=args.config)

    if args.command == 'init':
        orchestrator.init_database()
        print("Database initialized successfully")
        return

    elif args.command == 'start':
        print("Starting ZenBeasts Bot Hub...")
        print("Press Ctrl+C to stop")
        orchestrator.start()

    elif args.command == 'stop':
        if args.bot:
            orchestrator.stop_bot(args.bot)
        else:
            orchestrator.shutdown()

    elif args.command == 'restart':
        if args.bot:
            orchestrator.restart_bot(args.bot)
        else:
            print("Please specify a bot with --bot")

    elif args.command == 'status':
        status = orchestrator.get_status()
        print(json.dumps(status, indent=2))

    elif args.command == 'logs':
        log_file = f"data/logs/orchestrator.log"
        if args.bot:
            log_file = f"data/logs/{args.bot}.log"

        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                print(f.read())
        else:
            print(f"Log file not found: {log_file}")


if __name__ == '__main__':
    main()
