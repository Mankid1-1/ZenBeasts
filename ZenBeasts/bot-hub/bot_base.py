#!/usr/bin/env python3
"""
Base Bot Class
Provides common functionality for all automation bots
"""

import os
import time
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Optional, Any
from pathlib import Path


class BotBase(ABC):
    """Base class for all bots with common functionality"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = self.__class__.__name__
        self.running = False
        self.healthy = True
        self.last_activity = None
        self.stats = {
            'start_time': None,
            'total_runs': 0,
            'successful_runs': 0,
            'failed_runs': 0,
            'last_error': None,
        }

        # Setup logging
        self.logger = self._setup_logger()
        self.logger.info(f"{self.name} initialized")

    def _setup_logger(self) -> logging.Logger:
        """Setup logger for this bot"""
        log_dir = Path("data/logs")
        log_dir.mkdir(parents=True, exist_ok=True)

        logger = logging.getLogger(self.name)
        logger.setLevel(logging.INFO)

        # File handler
        fh = logging.FileHandler(log_dir / f"{self.name.lower()}.log")
        fh.setLevel(logging.INFO)

        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        logger.addHandler(fh)
        logger.addHandler(ch)

        return logger

    @abstractmethod
    def start(self):
        """Start the bot - must be implemented by subclass"""
        pass

    @abstractmethod
    def stop(self):
        """Stop the bot - must be implemented by subclass"""
        pass

    @abstractmethod
    def run(self):
        """Main bot logic - must be implemented by subclass"""
        pass

    def is_running(self) -> bool:
        """Check if bot is currently running"""
        return self.running

    def is_healthy(self) -> bool:
        """Check if bot is healthy"""
        return self.healthy

    def get_last_activity(self) -> Optional[str]:
        """Get timestamp of last activity"""
        return self.last_activity

    def get_stats(self) -> Dict[str, Any]:
        """Get bot statistics"""
        return self.stats.copy()

    def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        return {
            'healthy': self.healthy,
            'running': self.running,
            'last_activity': self.last_activity,
            'uptime': self._get_uptime(),
            'stats': self.stats,
        }

    def _get_uptime(self) -> Optional[int]:
        """Get uptime in seconds"""
        if self.stats['start_time']:
            return int(time.time() - self.stats['start_time'])
        return None

    def _record_run(self, success: bool, error: Optional[str] = None):
        """Record a bot run"""
        self.stats['total_runs'] += 1
        if success:
            self.stats['successful_runs'] += 1
        else:
            self.stats['failed_runs'] += 1
            self.stats['last_error'] = error

        self.last_activity = datetime.now().isoformat()

    def _log_and_track(self, level: str, message: str):
        """Log message and track activity"""
        getattr(self.logger, level)(message)
        self.last_activity = datetime.now().isoformat()

    def safe_run(self):
        """Safely run the bot with error handling"""
        try:
            self.logger.info(f"Starting {self.name} run...")
            self.run()
            self._record_run(success=True)
            self.logger.info(f"{self.name} run completed successfully")
        except Exception as e:
            self.logger.error(f"Error in {self.name} run: {e}")
            self._record_run(success=False, error=str(e))
            self.healthy = False

    def get_config(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self.config.get(key, default)

    def get_env(self, key: str, default: Any = None) -> Any:
        """Get environment variable"""
        return os.getenv(key, default)

    def validate_config(self, required_keys: list) -> bool:
        """Validate that required config keys are present"""
        missing_keys = [key for key in required_keys if key not in self.config]

        if missing_keys:
            self.logger.error(f"Missing required config keys: {missing_keys}")
            return False

        return True

    def validate_env(self, required_vars: list) -> bool:
        """Validate that required environment variables are set"""
        missing_vars = [var for var in required_vars if not os.getenv(var)]

        if missing_vars:
            self.logger.error(f"Missing required environment variables: {missing_vars}")
            return False

        return True

    def rate_limit_wait(self, calls_per_period: int, period_seconds: int):
        """Simple rate limiting"""
        wait_time = period_seconds / calls_per_period
        time.sleep(wait_time)

    def retry_on_failure(self, func, max_retries: int = 3, delay: int = 5):
        """Retry a function on failure"""
        for attempt in range(max_retries):
            try:
                return func()
            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(delay)
                else:
                    raise

    def schedule_task(self, task_name: str, func, interval_seconds: int):
        """Schedule a recurring task"""
        self.logger.info(f"Scheduling task: {task_name} every {interval_seconds}s")

        def task_loop():
            while self.running:
                try:
                    func()
                except Exception as e:
                    self.logger.error(f"Error in scheduled task {task_name}: {e}")
                time.sleep(interval_seconds)

        import threading
        thread = threading.Thread(target=task_loop, daemon=True)
        thread.start()

    def cache_get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        cache_dir = Path("data/cache")
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / f"{self.name}_{key}.cache"

        if cache_file.exists():
            try:
                import json
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    # Check if cache is still valid (24 hour default)
                    if time.time() - data['timestamp'] < 86400:
                        return data['value']
            except Exception as e:
                self.logger.warning(f"Cache read error: {e}")

        return None

    def cache_set(self, key: str, value: Any):
        """Set value in cache"""
        cache_dir = Path("data/cache")
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / f"{self.name}_{key}.cache"

        try:
            import json
            with open(cache_file, 'w') as f:
                json.dump({
                    'timestamp': time.time(),
                    'value': value
                }, f)
        except Exception as e:
            self.logger.warning(f"Cache write error: {e}")

    def send_alert(self, message: str, severity: str = "info"):
        """Send alert (to be implemented with notification service)"""
        self.logger.log(
            logging.WARNING if severity == "warning" else logging.ERROR,
            f"ALERT [{severity}]: {message}"
        )
        # TODO: Implement actual alerting (Discord webhook, email, etc.)

    def __repr__(self) -> str:
        return f"<{self.name} running={self.running} healthy={self.healthy}>"

    def __str__(self) -> str:
        return self.name
