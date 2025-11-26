#!/usr/bin/env python3
"""
ZenBeasts Bot Hub Utilities
Common utilities for all bots
"""

from .db import Database
from .logger import get_logger, setup_logger

__all__ = [
    "setup_logger",
    "get_logger",
    "Database",
]

__version__ = "1.0.0"
