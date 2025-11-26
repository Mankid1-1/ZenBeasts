#!/usr/bin/env python3
"""
Discord Bot - Community management and automation for ZenBeasts
Features: Moderation, rewards, giveaways, level system, custom commands
"""

import os
import discord
from discord.ext import commands, tasks
import random
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import sys
sys.path.append('..')
from bot_base import BotBase


class DiscordBot(BotBase):
    """Automated Discord community management bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Validate required environment variables
        if not self.validate_env(['DISCORD_BOT_TOKEN']):
            raise ValueError("Missing DISCORD_BOT_TOKEN")

        # Bot settings
        self.guild_id = self.get_config('guild_id')
        self.auto_mod = self.get_config('auto_mod', True)
        self.reward_system = self.get_config('rewards', {}).get('enabled', True)

        # Initialize Discord bot
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        intents.presences = True

        self.bot = commands.Bot(command_prefix='!', intents=intents)

        # User tracking
        self.user_xp = {}  # {user_id: xp}
        self.user_levels = {}  # {user_id: level}
        self.message_cooldowns = {}  # {user_id: last_message_time}

        # Moderation
        self.spam_threshold = 5  # messages per 10 seconds
        self.profanity_filter = ['scam', 'rug', 'hack']  # Add more as needed

        # Setup event handlers
        self._setup_events()
        self._setup_commands()

        self.logger.info("Discord Bot initialized successfully")

    def _setup_events(self):
        """Setup Discord event handlers"""

        @self.bot.event
        async def on_ready():
            self.logger.info(f'Discord Bot logged in as {self.bot.user.name}')
            self.healthy = True

            # Start background tasks
            self.check_voice_activity.start()
            self.save_user_data.start()

        @self.bot.event
        async def on_member_join(member):
            """Welcome new members"""
            await self._handle_member_join(member)

        @self.bot.event
        async def on_message(message):
            """Handle incoming messages"""
            if message.author.bot:
                return

            # Auto-moderation
            if self.auto_mod:
                if await self._check_spam(message):
                    return
                if await self._check_profanity(message):
                    return

            # Award XP for messages
            if self.reward_system:
                await self._award_message_xp(message)

            # Process commands
            await self.bot.process_commands(message)

        @self.bot.event
        async def on_member_remove(member):
            """Log member leaves"""
            self.logger.info(f"Member left: {member.name}")

        @self.bot.event
        async def on_error(event, *args, **kwargs):
            """Handle errors"""
            self.logger.error(f"Discord error in {event}: {args}")

    def _setup_commands(self):
        """Setup Discord bot commands"""

        @self.bot.command(name='price')
        async def price(ctx):
            """Get current ZEN token price"""
            # TODO: Fetch real price from API
            await ctx.send("💎 Current $ZEN price: $0.01 (Coming soon!)")

        @self.bot.command(name='stats')
        async def stats(ctx):
            """Get user stats"""
            user_id = str(ctx.author.id)
            xp = self.user_xp.get(user_id, 0)
            level = self.user_levels.get(user_id, 1)

            embed = discord.Embed(
                title=f"📊 Stats for {ctx.author.name}",
                color=discord.Color.purple()
            )
            embed.add_field(name="Level", value=level, inline=True)
            embed.add_field(name="XP", value=xp, inline=True)
            embed.add_field(name="Rank", value=self._get_user_rank(user_id), inline=True)

            await ctx.send(embed=embed)

        @self.bot.command(name='leaderboard')
        async def leaderboard(ctx):
            """Show XP leaderboard"""
            sorted_users = sorted(
                self.user_xp.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]

            embed = discord.Embed(
                title="🏆 Top 10 Leaderboard",
                color=discord.Color.gold()
            )

            for i, (user_id, xp) in enumerate(sorted_users, 1):
                user = self.bot.get_user(int(user_id))
                if user:
                    level = self.user_levels.get(user_id, 1)
                    embed.add_field(
                        name=f"{i}. {user.name}",
                        value=f"Level {level} • {xp} XP",
                        inline=False
                    )

            await ctx.send(embed=embed)

        @self.bot.command(name='claim')
        async def claim(ctx):
            """Claim daily rewards"""
            user_id = str(ctx.author.id)

            # Check if already claimed today
            last_claim = self.cache_get(f"claim_{user_id}")
            if last_claim:
                await ctx.send("⏰ You've already claimed today! Come back tomorrow.")
                return

            # Award daily reward
            reward_amount = 50  # 50 XP
            self._add_xp(user_id, reward_amount)

            # Cache claim
            self.cache_set(f"claim_{user_id}", datetime.now().isoformat())

            await ctx.send(f"✅ Claimed! You received {reward_amount} XP. 🎉")

        @self.bot.command(name='help')
        async def help_command(ctx):
            """Show available commands"""
            embed = discord.Embed(
                title="🤖 ZenBeasts Bot Commands",
                description="Here are all available commands:",
                color=discord.Color.blue()
            )

            commands_list = [
                ("!price", "Get current $ZEN token price"),
                ("!stats", "View your stats and level"),
                ("!leaderboard", "See top 10 users"),
                ("!claim", "Claim daily rewards"),
                ("!giveaway", "Enter current giveaway"),
                ("!help", "Show this help message"),
            ]

            for cmd, desc in commands_list:
                embed.add_field(name=cmd, value=desc, inline=False)

            await ctx.send(embed=embed)

        @self.bot.command(name='giveaway')
        @commands.has_permissions(administrator=True)
        async def start_giveaway(ctx, duration: int, winners: int, *, prize: str):
            """Start a giveaway (admin only)"""
            await self._start_giveaway(ctx.channel, duration, winners, prize)

        @self.bot.command(name='announce')
        @commands.has_permissions(administrator=True)
        async def announce(ctx, *, message: str):
            """Send an announcement (admin only)"""
            embed = discord.Embed(
                title="📢 Announcement",
                description=message,
                color=discord.Color.red()
            )
            embed.timestamp = datetime.now()

            await ctx.send("@everyone", embed=embed)

        @self.bot.command(name='purge')
        @commands.has_permissions(manage_messages=True)
        async def purge(ctx, amount: int):
            """Delete messages (mod only)"""
            if amount > 100:
                await ctx.send("❌ Cannot delete more than 100 messages at once")
                return

            deleted = await ctx.channel.purge(limit=amount + 1)
            await ctx.send(f"✅ Deleted {len(deleted) - 1} messages", delete_after=5)

        @self.bot.command(name='kick')
        @commands.has_permissions(kick_members=True)
        async def kick(ctx, member: discord.Member, *, reason: str = "No reason provided"):
            """Kick a member (mod only)"""
            await member.kick(reason=reason)
            await ctx.send(f"👢 Kicked {member.name}. Reason: {reason}")
            self.logger.info(f"Kicked {member.name} by {ctx.author.name}")

        @self.bot.command(name='ban')
        @commands.has_permissions(ban_members=True)
        async def ban(ctx, member: discord.Member, *, reason: str = "No reason provided"):
            """Ban a member (mod only)"""
            await member.ban(reason=reason)
            await ctx.send(f"🔨 Banned {member.name}. Reason: {reason}")
            self.logger.warning(f"Banned {member.name} by {ctx.author.name}")

    async def _handle_member_join(self, member):
        """Handle new member joining"""
        try:
            # Get welcome channel
            welcome_config = self.get_config('welcome', {})
            channel_id = welcome_config.get('channel_id')

            if not channel_id:
                return

            channel = self.bot.get_channel(int(channel_id))
            if not channel:
                return

            # Send welcome message
            message_template = welcome_config.get(
                'message',
                'Welcome {user}! 🎉 Check out #getting-started'
            )

            message = message_template.format(user=member.mention)

            embed = discord.Embed(
                title=f"Welcome to ZenBeasts! 🐉",
                description=message,
                color=discord.Color.green()
            )
            embed.set_thumbnail(url=member.avatar.url if member.avatar else None)

            await channel.send(embed=embed)

            # Auto-assign role
            auto_role = welcome_config.get('auto_role')
            if auto_role:
                role = discord.utils.get(member.guild.roles, name=auto_role)
                if role:
                    await member.add_roles(role)
                    self.logger.info(f"Assigned {auto_role} role to {member.name}")

        except Exception as e:
            self.logger.error(f"Error handling member join: {e}")

    async def _check_spam(self, message) -> bool:
        """Check for spam and take action"""
        user_id = str(message.author.id)
        current_time = datetime.now()

        # Get recent message times
        if user_id not in self.message_cooldowns:
            self.message_cooldowns[user_id] = []

        # Clean old timestamps (older than 10 seconds)
        self.message_cooldowns[user_id] = [
            t for t in self.message_cooldowns[user_id]
            if (current_time - t).total_seconds() < 10
        ]

        # Add current message
        self.message_cooldowns[user_id].append(current_time)

        # Check if spam threshold exceeded
        if len(self.message_cooldowns[user_id]) > self.spam_threshold:
            await message.delete()
            await message.channel.send(
                f"{message.author.mention} Slow down! Anti-spam triggered.",
                delete_after=5
            )
            self.logger.warning(f"Spam detected from {message.author.name}")
            return True

        return False

    async def _check_profanity(self, message) -> bool:
        """Check for profanity/scams and take action"""
        content_lower = message.content.lower()

        for word in self.profanity_filter:
            if word in content_lower:
                await message.delete()
                await message.channel.send(
                    f"{message.author.mention} That message was removed by auto-mod.",
                    delete_after=5
                )
                self.logger.warning(f"Profanity detected from {message.author.name}: {word}")
                return True

        return False

    async def _award_message_xp(self, message):
        """Award XP for sending messages"""
        user_id = str(message.author.id)

        # Cooldown check (1 XP per minute max)
        last_xp = self.cache_get(f"xp_{user_id}")
        if last_xp:
            return

        # Award XP
        xp_amount = self.get_config('rewards', {}).get('message_xp', 10)
        self._add_xp(user_id, xp_amount)

        # Set cooldown
        self.cache_set(f"xp_{user_id}", datetime.now().isoformat())

    def _add_xp(self, user_id: str, amount: int):
        """Add XP to user and check for level up"""
        # Add XP
        current_xp = self.user_xp.get(user_id, 0)
        new_xp = current_xp + amount
        self.user_xp[user_id] = new_xp

        # Calculate level
        current_level = self.user_levels.get(user_id, 1)
        new_level = self._calculate_level(new_xp)

        # Check for level up
        if new_level > current_level:
            self.user_levels[user_id] = new_level
            asyncio.create_task(self._handle_level_up(user_id, new_level))

    def _calculate_level(self, xp: int) -> int:
        """Calculate level based on XP"""
        # Simple formula: level = sqrt(xp / 100)
        import math
        return max(1, int(math.sqrt(xp / 100)))

    async def _handle_level_up(self, user_id: str, new_level: int):
        """Handle user leveling up"""
        try:
            user = self.bot.get_user(int(user_id))
            if not user:
                return

            # Send level up message
            guild = self.bot.get_guild(int(self.guild_id)) if self.guild_id else None
            if guild:
                channel = discord.utils.get(guild.text_channels, name='general')
                if channel:
                    embed = discord.Embed(
                        title="🎉 Level Up!",
                        description=f"{user.mention} reached Level {new_level}!",
                        color=discord.Color.gold()
                    )
                    await channel.send(embed=embed)

            # Check for level rewards
            rewards_config = self.get_config('rewards', {}).get('level_up_rewards', {})
            if str(new_level) in rewards_config:
                reward = rewards_config[str(new_level)]
                self.logger.info(f"User {user.name} earned reward: {reward} at level {new_level}")
                # TODO: Actually distribute ZEN tokens

        except Exception as e:
            self.logger.error(f"Error handling level up: {e}")

    def _get_user_rank(self, user_id: str) -> int:
        """Get user's rank on leaderboard"""
        sorted_users = sorted(
            self.user_xp.items(),
            key=lambda x: x[1],
            reverse=True
        )

        for i, (uid, _) in enumerate(sorted_users, 1):
            if uid == user_id:
                return i

        return len(sorted_users) + 1

    async def _start_giveaway(self, channel, duration: int, winners: int, prize: str):
        """Start a giveaway"""
        try:
            embed = discord.Embed(
                title="🎉 GIVEAWAY! 🎉",
                description=f"**Prize:** {prize}\n**Winners:** {winners}\n**Duration:** {duration} minutes",
                color=discord.Color.purple()
            )
            embed.add_field(
                name="How to Enter",
                value="React with 🎉 to enter!",
                inline=False
            )
            embed.timestamp = datetime.now()

            message = await channel.send(embed=embed)
            await message.add_reaction("🎉")

            # Wait for duration
            await asyncio.sleep(duration * 60)

            # Get reactions
            message = await channel.fetch_message(message.id)
            reaction = discord.utils.get(message.reactions, emoji="🎉")

            if not reaction:
                await channel.send("No entries! Giveaway cancelled.")
                return

            users = [user async for user in reaction.users() if not user.bot]

            if len(users) < winners:
                await channel.send("Not enough entries! Giveaway cancelled.")
                return

            # Select winners
            selected_winners = random.sample(users, winners)

            # Announce winners
            winner_mentions = ", ".join([user.mention for user in selected_winners])

            embed = discord.Embed(
                title="🏆 Giveaway Winners! 🏆",
                description=f"**Prize:** {prize}\n**Winners:** {winner_mentions}",
                color=discord.Color.gold()
            )

            await channel.send(embed=embed)

            self.logger.info(f"Giveaway completed: {prize} - Winners: {[u.name for u in selected_winners]}")

        except Exception as e:
            self.logger.error(f"Error running giveaway: {e}")

    @tasks.loop(minutes=5)
    async def check_voice_activity(self):
        """Award XP for voice channel activity"""
        if not self.reward_system:
            return

        try:
            guild = self.bot.get_guild(int(self.guild_id)) if self.guild_id else None
            if not guild:
                return

            voice_xp_per_minute = self.get_config('rewards', {}).get('voice_xp_per_minute', 5)

            for channel in guild.voice_channels:
                for member in channel.members:
                    if not member.bot:
                        user_id = str(member.id)
                        # Award XP for 5 minutes in voice
                        self._add_xp(user_id, voice_xp_per_minute * 5)

        except Exception as e:
            self.logger.error(f"Error checking voice activity: {e}")

    @tasks.loop(minutes=30)
    async def save_user_data(self):
        """Periodically save user data"""
        try:
            data = {
                'xp': self.user_xp,
                'levels': self.user_levels,
                'timestamp': datetime.now().isoformat()
            }

            with open('data/discord_users.json', 'w') as f:
                json.dump(data, f, indent=2)

            self.logger.info("User data saved")

        except Exception as e:
            self.logger.error(f"Error saving user data: {e}")

    def _load_user_data(self):
        """Load user data from file"""
        try:
            if os.path.exists('data/discord_users.json'):
                with open('data/discord_users.json', 'r') as f:
                    data = json.load(f)
                    self.user_xp = data.get('xp', {})
                    self.user_levels = data.get('levels', {})
                    self.logger.info("User data loaded")
        except Exception as e:
            self.logger.error(f"Error loading user data: {e}")

    def start(self):
        """Start the Discord bot"""
        self.running = True
        self.stats['start_time'] = time.time()

        # Load saved user data
        self._load_user_data()

        self.logger.info("Starting Discord Bot...")

        # Run bot
        token = os.getenv('DISCORD_BOT_TOKEN')
        self.bot.run(token)

    def stop(self):
        """Stop the Discord bot"""
        self.running = False
        asyncio.run(self.bot.close())
        self.logger.info("Discord Bot stopped")

    def run(self):
        """Main bot execution (called by orchestrator)"""
        # Discord bot runs continuously via start()
        pass


if __name__ == '__main__':
    # Test bot standalone
    config = {
        'enabled': True,
        'guild_id': os.getenv('DISCORD_GUILD_ID'),
        'auto_mod': True,
        'welcome': {
            'channel_id': 'YOUR_CHANNEL_ID',
            'message': 'Welcome {user}! 🎉',
            'auto_role': 'Community'
        },
        'rewards': {
            'enabled': True,
            'message_xp': 10,
            'voice_xp_per_minute': 5,
            'level_up_rewards': {
                '5': '50 ZEN',
                '10': '100 ZEN',
                '25': '500 ZEN'
            }
        }
    }

    bot = DiscordBot(config)

    try:
        bot.start()
    except KeyboardInterrupt:
        bot.stop()
        print("\nDiscord Bot stopped")
