#!/usr/bin/env python3
"""
ZenBeasts Bot Hub
Automated bot orchestration and management system
"""

__version__ = "1.0.0"
__author__ = "ZenBeasts Team"
__description__ = "Automated bot orchestration for ZenBeasts ecosystem"

from .bot_base import BotBase
from .orchestrator import BotOrchestrator

__all__ = [
    "BotBase",
    "BotOrchestrator",
]
