#!/usr/bin/env python3
"""
Logger Utility for ZenBeasts Bot Hub
Provides centralized logging with rotation, formatting, and multiple handlers
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import colorlog


def setup_logger(
    name: str,
    log_level: str = "INFO",
    log_dir: str = "data/logs",
    console: bool = True,
    file: bool = True,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
    format_string: Optional[str] = None,
) -> logging.Logger:
    """
    Set up a logger with file and console handlers

    Args:
        name: Logger name (usually module or bot name)
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files
        console: Enable console output
        file: Enable file output
        max_bytes: Maximum log file size before rotation
        backup_count: Number of backup files to keep
        format_string: Custom format string (optional)

    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Create log directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    # Default format
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Date format
    date_format = "%Y-%m-%d %H:%M:%S"

    # Console handler with colors
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))

        # Colored formatter for console
        color_format = (
            "%(log_color)s%(asctime)s - %(name)s - %(levelname)s%(reset)s - %(message)s"
        )
        console_formatter = colorlog.ColoredFormatter(
            color_format,
            datefmt=date_format,
            log_colors={
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "red,bg_white",
            },
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    # File handler with rotation
    if file:
        log_file = log_path / f"{name.lower()}.log"
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(logging.DEBUG)  # Always log DEBUG to file

        # Standard formatter for file
        file_formatter = logging.Formatter(format_string, datefmt=date_format)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    # Prevent propagation to root logger
    logger.propagate = False

    logger.debug(f"Logger '{name}' initialized successfully")
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get an existing logger or create a new one with default settings

    Args:
        name: Logger name

    Returns:
        Logger instance
    """
    logger = logging.getLogger(name)

    # If logger has no handlers, set it up with defaults
    if not logger.handlers:
        return setup_logger(name)

    return logger


class StructuredLogger:
    """
    Structured logger for JSON-formatted logs
    Useful for log aggregation systems like ELK, Datadog, etc.
    """

    def __init__(self, name: str, log_dir: str = "data/logs"):
        self.logger = logging.getLogger(f"{name}_structured")
        self.logger.setLevel(logging.DEBUG)
        self.logger.handlers.clear()

        # Create log directory
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)

        # JSON file handler
        log_file = log_path / f"{name.lower()}_structured.json"
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8",
        )

        # JSON formatter
        from pythonjsonlogger import jsonlogger

        json_formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(name)s %(levelname)s %(message)s"
        )
        file_handler.setFormatter(json_formatter)

        self.logger.addHandler(file_handler)
        self.logger.propagate = False

    def log(self, level: str, message: str, **kwargs):
        """Log with additional structured data"""
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(message, extra=kwargs)

    def debug(self, message: str, **kwargs):
        self.log("debug", message, **kwargs)

    def info(self, message: str, **kwargs):
        self.log("info", message, **kwargs)

    def warning(self, message: str, **kwargs):
        self.log("warning", message, **kwargs)

    def error(self, message: str, **kwargs):
        self.log("error", message, **kwargs)

    def critical(self, message: str, **kwargs):
        self.log("critical", message, **kwargs)


class BotLogger:
    """
    Specialized logger for bot operations with metrics tracking
    """

    def __init__(self, bot_name: str):
        self.bot_name = bot_name
        self.logger = setup_logger(bot_name)
        self.metrics = {
            "total_logs": 0,
            "errors": 0,
            "warnings": 0,
            "start_time": datetime.now(),
        }

    def _track_metric(self, level: str):
        """Track logging metrics"""
        self.metrics["total_logs"] += 1
        if level == "ERROR":
            self.metrics["errors"] += 1
        elif level == "WARNING":
            self.metrics["warnings"] += 1

    def debug(self, message: str, **kwargs):
        self.logger.debug(message, **kwargs)
        self._track_metric("DEBUG")

    def info(self, message: str, **kwargs):
        self.logger.info(message, **kwargs)
        self._track_metric("INFO")

    def warning(self, message: str, **kwargs):
        self.logger.warning(message, **kwargs)
        self._track_metric("WARNING")

    def error(self, message: str, exc_info: bool = False, **kwargs):
        self.logger.error(message, exc_info=exc_info, **kwargs)
        self._track_metric("ERROR")

    def critical(self, message: str, exc_info: bool = True, **kwargs):
        self.logger.critical(message, exc_info=exc_info, **kwargs)
        self._track_metric("CRITICAL")

    def log_bot_action(self, action: str, status: str, details: Optional[dict] = None):
        """Log a bot action with structured data"""
        message = f"[{self.bot_name}] {action}: {status}"
        if details:
            message += f" - {details}"

        if status.lower() in ["success", "completed"]:
            self.info(message)
        elif status.lower() in ["warning", "skipped"]:
            self.warning(message)
        elif status.lower() in ["failed", "error"]:
            self.error(message)
        else:
            self.info(message)

    def get_metrics(self) -> dict:
        """Get logging metrics"""
        uptime = (datetime.now() - self.metrics["start_time"]).total_seconds()
        return {
            **self.metrics,
            "uptime_seconds": uptime,
            "error_rate": self.metrics["errors"] / max(self.metrics["total_logs"], 1),
        }


def configure_root_logger(level: str = "INFO"):
    """
    Configure the root logger for the entire application

    Args:
        level: Logging level for root logger
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def silence_noisy_loggers():
    """Silence commonly noisy third-party loggers"""
    noisy_loggers = [
        "urllib3",
        "requests",
        "discord",
        "tweepy",
        "asyncio",
        "aiohttp",
    ]

    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def setup_error_file_handler(logger: logging.Logger, log_dir: str = "data/logs"):
    """
    Add a separate handler for ERROR and CRITICAL logs

    Args:
        logger: Logger to add handler to
        log_dir: Directory for error log files
    """
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    error_file = log_path / f"{logger.name}_errors.log"
    error_handler = logging.handlers.RotatingFileHandler(
        error_file,
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=10,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)

    error_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s\n"
        "%(pathname)s:%(lineno)d\n"
        "%(exc_info)s\n",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    error_handler.setFormatter(error_formatter)

    logger.addHandler(error_handler)
    return error_handler


# Module-level convenience functions
_default_logger = None


def get_default_logger() -> logging.Logger:
    """Get or create the default logger"""
    global _default_logger
    if _default_logger is None:
        _default_logger = setup_logger("zenbeasts")
    return _default_logger


def log_exception(
    logger: Optional[logging.Logger] = None, message: str = "Exception occurred"
):
    """
    Log an exception with full traceback

    Args:
        logger: Logger to use (defaults to default logger)
        message: Message to log with the exception
    """
    if logger is None:
        logger = get_default_logger()

    logger.exception(message)


def cleanup_old_logs(log_dir: str = "data/logs", days: int = 30):
    """
    Clean up log files older than specified days

    Args:
        log_dir: Directory containing log files
        days: Delete files older than this many days
    """
    import time

    log_path = Path(log_dir)
    if not log_path.exists():
        return

    cutoff_time = time.time() - (days * 86400)
    deleted_count = 0

    for log_file in log_path.glob("*.log*"):
        if log_file.stat().st_mtime < cutoff_time:
            try:
                log_file.unlink()
                deleted_count += 1
            except Exception as e:
                print(f"Failed to delete {log_file}: {e}")

    if deleted_count > 0:
        logger = get_default_logger()
        logger.info(f"Cleaned up {deleted_count} old log files")


# Initialize on import
silence_noisy_loggers()
