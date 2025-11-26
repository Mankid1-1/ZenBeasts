#!/usr/bin/env python3
"""
ZenBeasts Bot Hub - Bots Package
Individual bot implementations for different platforms and purposes
"""

from .analytics_bot import AnalyticsBot
from .content_bot import ContentBot
from .deployment_bot import DeploymentBot
from .discord_bot import DiscordBot
from .marketing_bot import MarketingBot
from .monitoring_bot import MonitoringBot
from .rewards_bot import RewardsBot
from .twitter_bot import TwitterBot

__all__ = [
    "AnalyticsBot",
    "ContentBot",
    "DeploymentBot",
    "DiscordBot",
    "MarketingBot",
    "MonitoringBot",
    "RewardsBot",
    "TwitterBot",
]

__version__ = "1.0.0"

# Bot registry for dynamic loading
BOT_REGISTRY = {
    "analytics_bot": AnalyticsBot,
    "content_bot": ContentBot,
    "deployment_bot": DeploymentBot,
    "discord_bot": DiscordBot,
    "marketing_bot": MarketingBot,
    "monitoring_bot": MonitoringBot,
    "rewards_bot": RewardsBot,
    "twitter_bot": TwitterBot,
}


def get_bot_class(bot_name: str):
    """
    Get bot class by name

    Args:
        bot_name: Name of the bot (e.g., 'discord_bot', 'twitter_bot')

    Returns:
        Bot class or None if not found
    """
    return BOT_REGISTRY.get(bot_name)


def list_available_bots():
    """
    Get list of all available bot names

    Returns:
        List of bot names
    """
    return list(BOT_REGISTRY.keys())
