#!/usr/bin/env python3
"""
Monitoring Bot - System health monitoring and alerting for ZenBeasts
Features: Health checks, uptime monitoring, performance tracking, automated alerts
"""

import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import psutil
import requests

sys.path.append("..")
from bot_base import BotBase


class MonitoringBot(BotBase):
    """Automated system monitoring and alerting bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Monitoring settings
        self.check_interval = self.get_config("check_interval", 60)  # seconds
        self.alert_threshold = self.get_config(
            "alert_threshold", 5
        )  # consecutive failures

        # Services to monitor
        self.services = {
            "rpc": {
                "url": os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
                "method": "POST",
                "timeout": 10,
                "failures": 0,
                "last_check": None,
                "status": "unknown",
            },
            "bot_hub": {
                "url": f"http://{os.getenv('BOT_HUB_HOST', 'localhost')}:{os.getenv('BOT_HUB_PORT', '5000')}/health",
                "method": "GET",
                "timeout": 5,
                "failures": 0,
                "last_check": None,
                "status": "unknown",
            },
        }

        # System metrics history
        self.metrics_history = []
        self.alerts_sent = []

        # Thresholds
        self.thresholds = {
            "cpu_percent": 80,
            "memory_percent": 85,
            "disk_percent": 90,
            "response_time_ms": 5000,
        }

        self.logger.info("MonitoringBot initialized")

    def start(self):
        """Start the monitoring bot"""
        self.running = True
        self.stats["start_time"] = time.time()
        self.logger.info("MonitoringBot started")

        # Run the main loop
        self.run()

    def stop(self):
        """Stop the monitoring bot"""
        self.running = False
        self.logger.info("MonitoringBot stopped")

    def run(self):
        """Main bot loop"""
        while self.running:
            try:
                # Collect system metrics
                system_metrics = self._collect_system_metrics()

                # Check all services
                for service_name in self.services:
                    self._check_service(service_name)

                # Analyze metrics and alert if needed
                self._analyze_and_alert(system_metrics)

                # Store metrics
                self._store_metrics(system_metrics)

                # Cleanup old data (keep 24 hours)
                self._cleanup_old_data(hours=24)

                # Wait for next check
                time.sleep(self.check_interval)

            except Exception as e:
                self.logger.error(f"Error in MonitoringBot loop: {e}")
                self.healthy = False
                time.sleep(60)

    def _collect_system_metrics(self) -> Dict:
        """Collect system performance metrics"""
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu": {
                    "percent": psutil.cpu_percent(interval=1),
                    "count": psutil.cpu_count(),
                    "load_avg": psutil.getloadavg()
                    if hasattr(psutil, "getloadavg")
                    else [0, 0, 0],
                },
                "memory": {
                    "percent": psutil.virtual_memory().percent,
                    "total_mb": psutil.virtual_memory().total / (1024 * 1024),
                    "available_mb": psutil.virtual_memory().available / (1024 * 1024),
                    "used_mb": psutil.virtual_memory().used / (1024 * 1024),
                },
                "disk": {
                    "percent": psutil.disk_usage("/").percent,
                    "total_gb": psutil.disk_usage("/").total / (1024 * 1024 * 1024),
                    "free_gb": psutil.disk_usage("/").free / (1024 * 1024 * 1024),
                },
                "network": {
                    "connections": len(psutil.net_connections()),
                },
            }

            self.logger.debug(
                f"System metrics collected: CPU {metrics['cpu']['percent']}%, Memory {metrics['memory']['percent']}%"
            )
            return metrics

        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return {}

    def _check_service(self, service_name: str) -> bool:
        """Check if a service is healthy"""
        service = self.services[service_name]

        try:
            start_time = time.time()

            if service["method"] == "GET":
                response = requests.get(service["url"], timeout=service["timeout"])
            elif service["method"] == "POST":
                # For RPC, send a simple health check
                response = requests.post(
                    service["url"],
                    json={"jsonrpc": "2.0", "id": 1, "method": "getHealth"},
                    timeout=service["timeout"],
                )

            response_time = (time.time() - start_time) * 1000  # ms

            # Check response
            is_healthy = response.status_code == 200

            if is_healthy:
                service["failures"] = 0
                service["status"] = "healthy"
                self.logger.debug(
                    f"{service_name} is healthy (response time: {response_time:.2f}ms)"
                )
            else:
                service["failures"] += 1
                service["status"] = "unhealthy"
                self.logger.warning(
                    f"{service_name} returned status {response.status_code}"
                )

            service["last_check"] = datetime.now().isoformat()
            service["response_time"] = response_time

            # Alert if threshold reached
            if service["failures"] >= self.alert_threshold:
                self._send_alert(
                    severity="critical",
                    title=f"{service_name} is DOWN",
                    message=f"{service_name} has failed {service['failures']} consecutive health checks",
                )

            return is_healthy

        except requests.exceptions.Timeout:
            service["failures"] += 1
            service["status"] = "timeout"
            service["last_check"] = datetime.now().isoformat()
            self.logger.error(f"{service_name} health check timed out")

            if service["failures"] >= self.alert_threshold:
                self._send_alert(
                    severity="critical",
                    title=f"{service_name} is UNRESPONSIVE",
                    message=f"{service_name} has timed out {service['failures']} times",
                )

            return False

        except Exception as e:
            service["failures"] += 1
            service["status"] = "error"
            service["last_check"] = datetime.now().isoformat()
            self.logger.error(f"Error checking {service_name}: {e}")
            return False

    def _analyze_and_alert(self, metrics: Dict):
        """Analyze metrics and send alerts if thresholds exceeded"""
        if not metrics:
            return

        alerts = []

        # Check CPU
        if metrics["cpu"]["percent"] > self.thresholds["cpu_percent"]:
            alerts.append(f"⚠️ High CPU usage: {metrics['cpu']['percent']}%")

        # Check Memory
        if metrics["memory"]["percent"] > self.thresholds["memory_percent"]:
            alerts.append(f"⚠️ High memory usage: {metrics['memory']['percent']}%")

        # Check Disk
        if metrics["disk"]["percent"] > self.thresholds["disk_percent"]:
            alerts.append(f"⚠️ High disk usage: {metrics['disk']['percent']}%")

        # Send alerts if any
        if alerts:
            self._send_alert(
                severity="warning",
                title="System Resource Alert",
                message="\n".join(alerts),
            )

    def _store_metrics(self, metrics: Dict):
        """Store metrics for historical analysis"""
        if metrics:
            self.metrics_history.append(metrics)

    def _cleanup_old_data(self, hours: int = 24):
        """Remove old metrics data"""
        cutoff = datetime.now() - timedelta(hours=hours)

        self.metrics_history = [
            m
            for m in self.metrics_history
            if datetime.fromisoformat(m["timestamp"]) > cutoff
        ]

    def _send_alert(self, severity: str, title: str, message: str):
        """Send alert notification"""
        try:
            # Check if already alerted recently (avoid spam)
            alert_key = f"{severity}:{title}"
            recent_alert = next(
                (a for a in self.alerts_sent[-10:] if a["key"] == alert_key), None
            )

            if recent_alert:
                time_since = datetime.now() - datetime.fromisoformat(
                    recent_alert["timestamp"]
                )
                if time_since < timedelta(minutes=30):
                    self.logger.debug(f"Skipping duplicate alert: {title}")
                    return

            # Get webhook URL
            webhook_url = (
                os.getenv("ERROR_WEBHOOK_URL")
                if severity == "critical"
                else os.getenv("WEBHOOK_URL")
            )

            if not webhook_url:
                self.logger.warning("No webhook URL configured for alerts")
                return

            # Format alert
            color = {
                "info": 3447003,  # Blue
                "warning": 16776960,  # Yellow
                "critical": 15158332,  # Red
            }.get(severity, 3447003)

            payload = {
                "embeds": [
                    {
                        "title": f"🚨 {title}",
                        "description": message,
                        "color": color,
                        "timestamp": datetime.now().isoformat(),
                        "footer": {"text": f"Severity: {severity.upper()}"},
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload, timeout=10)

            if response.status_code == 204:
                self.logger.info(f"Alert sent: {title}")
                self.alerts_sent.append(
                    {
                        "key": alert_key,
                        "timestamp": datetime.now().isoformat(),
                        "severity": severity,
                        "title": title,
                    }
                )
            else:
                self.logger.error(f"Failed to send alert: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Error sending alert: {e}")

    def get_status_report(self) -> Dict:
        """Get current monitoring status"""
        return {
            "monitoring_active": self.running,
            "services": {
                name: {
                    "status": service["status"],
                    "last_check": service["last_check"],
                    "failures": service["failures"],
                    "response_time": service.get("response_time", 0),
                }
                for name, service in self.services.items()
            },
            "recent_metrics": self.metrics_history[-1] if self.metrics_history else {},
            "alerts_sent_24h": len(self.alerts_sent),
            "thresholds": self.thresholds,
        }

    def add_service(self, name: str, url: str, method: str = "GET", timeout: int = 10):
        """Add a new service to monitor"""
        self.services[name] = {
            "url": url,
            "method": method,
            "timeout": timeout,
            "failures": 0,
            "last_check": None,
            "status": "unknown",
        }
        self.logger.info(f"Added service to monitor: {name}")

    def remove_service(self, name: str):
        """Remove a service from monitoring"""
        if name in self.services:
            del self.services[name]
            self.logger.info(f"Removed service from monitoring: {name}")

    def get_uptime_percentage(self, service_name: str, hours: int = 24) -> float:
        """Calculate uptime percentage for a service"""
        # This would require storing check history
        # For now, return a simple calculation based on current status
        service = self.services.get(service_name)
        if not service:
            return 0.0

        if service["status"] == "healthy":
            return 100.0 - (service["failures"] * 10)
        else:
            return max(0.0, 100.0 - (service["failures"] * 20))

    def get_metrics_summary(self, hours: int = 24) -> Dict:
        """Get summary of metrics over time period"""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_metrics = [
            m
            for m in self.metrics_history
            if datetime.fromisoformat(m["timestamp"]) > cutoff
        ]

        if not recent_metrics:
            return {}

        cpu_values = [m["cpu"]["percent"] for m in recent_metrics]
        memory_values = [m["memory"]["percent"] for m in recent_metrics]
        disk_values = [m["disk"]["percent"] for m in recent_metrics]

        return {
            "cpu": {
                "avg": sum(cpu_values) / len(cpu_values),
                "max": max(cpu_values),
                "min": min(cpu_values),
            },
            "memory": {
                "avg": sum(memory_values) / len(memory_values),
                "max": max(memory_values),
                "min": min(memory_values),
            },
            "disk": {
                "avg": sum(disk_values) / len(disk_values),
                "max": max(disk_values),
                "min": min(disk_values),
            },
            "period_hours": hours,
            "data_points": len(recent_metrics),
        }


if __name__ == "__main__":
    # Test the bot
    from dotenv import load_dotenv

    load_dotenv()

    config = {
        "check_interval": 60,
        "alert_threshold": 5,
    }

    bot = MonitoringBot(config)
    print(f"MonitoringBot initialized: {bot.name}")
    print(f"Monitoring {len(bot.services)} services")
    print(f"Check interval: {bot.check_interval}s")

    # Run a single check
    print("\nRunning health checks...")
    for service_name in bot.services:
        result = bot._check_service(service_name)
        print(f"  {service_name}: {'✓' if result else '✗'}")

    # Show status
    status = bot.get_status_report()
    print(f"\nStatus report generated")
