#!/usr/bin/env python3
"""
Twitter Bot - Automate Twitter presence for ZenBeasts
Features: Auto-posting, engagement, growth automation, analytics
"""

import os
import time
import random
import tweepy
import openai
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys
sys.path.append('..')
from bot_base import BotBase


class TwitterBot(BotBase):
    """Automated Twitter management bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Validate required environment variables
        required_env = [
            'TWITTER_API_KEY',
            'TWITTER_API_SECRET',
            'TWITTER_ACCESS_TOKEN',
            'TWITTER_ACCESS_SECRET',
        ]

        if not self.validate_env(required_env):
            raise ValueError("Missing required Twitter API credentials")

        # Initialize Twitter API
        self.client = self._setup_twitter_client()

        # Initialize OpenAI for content generation (optional)
        if os.getenv('OPENAI_API_KEY'):
            openai.api_key = os.getenv('OPENAI_API_KEY')
            self.ai_enabled = True
        else:
            self.ai_enabled = False
            self.logger.warning("OpenAI API key not found - AI features disabled")

        # Bot settings
        self.auto_engage = self.get_config('auto_engage', True)
        self.growth_mode = self.get_config('growth_mode', False)
        self.daily_post_limit = self.get_config('daily_post_limit', 10)

        # Content templates
        self.content_templates = self._load_content_templates()

        # Tracking
        self.posts_today = 0
        self.last_post_time = None

        self.logger.info("Twitter Bot initialized successfully")

    def _setup_twitter_client(self):
        """Setup Twitter API v2 client"""
        try:
            client = tweepy.Client(
                consumer_key=os.getenv('TWITTER_API_KEY'),
                consumer_secret=os.getenv('TWITTER_API_SECRET'),
                access_token=os.getenv('TWITTER_ACCESS_TOKEN'),
                access_token_secret=os.getenv('TWITTER_ACCESS_SECRET'),
                wait_on_rate_limit=True
            )

            # Test connection
            me = client.get_me()
            self.logger.info(f"Connected to Twitter as @{me.data.username}")

            return client

        except Exception as e:
            self.logger.error(f"Failed to setup Twitter client: {e}")
            raise

    def _load_content_templates(self) -> Dict[str, List[str]]:
        """Load content templates from config"""
        return {
            'gm': [
                "GM ZenBeasts fam! 🌅 Ready to evolve some beasts today?",
                "Good morning! ☀️ Who's minting legendary beasts today?",
                "GM! 🐉 New day, new traits to upgrade!",
            ],
            'educational': [
                "🧵 Let's talk about on-chain traits...",
                "🎓 Quick lesson: Why trait rarity matters...",
                "💡 Did you know? ZenBeasts traits are stored on-chain...",
            ],
            'community': [
                "Shoutout to our amazing community! 🙏",
                "This community never stops impressing us 💜",
                "You all are legendary! 🏆",
            ],
            'calls_to_action': [
                "Ready to mint your first ZenBeast? 👇",
                "Join the evolution! Link in bio 🔗",
                "The zen revolution starts now 🚀",
            ],
        }

    def start(self):
        """Start the Twitter bot"""
        self.running = True
        self.stats['start_time'] = time.time()
        self.logger.info("Twitter Bot started")

        # Run main bot loop
        self.bot_loop()

    def stop(self):
        """Stop the Twitter bot"""
        self.running = False
        self.logger.info("Twitter Bot stopped")

    def run(self):
        """Main bot execution (called by orchestrator)"""
        if self.posts_today >= self.daily_post_limit:
            self.logger.info("Daily post limit reached")
            return

        # Check what tasks to perform
        current_hour = datetime.now().hour

        # Morning post (9 AM)
        if current_hour == 9:
            self.post_gm()

        # Midday engagement (12 PM)
        elif current_hour == 12:
            self.engage_with_community()

        # Afternoon content (3 PM)
        elif current_hour == 15:
            self.post_educational_thread()

        # Evening update (6 PM)
        elif current_hour == 18:
            self.post_project_update()

        # Always check mentions and engage
        if self.auto_engage:
            self.respond_to_mentions()

    def bot_loop(self):
        """Continuous bot loop"""
        while self.running:
            try:
                self.safe_run()

                # Check for growth automation
                if self.growth_mode:
                    self.growth_automation()

                # Wait before next run (5 minutes)
                time.sleep(300)

            except Exception as e:
                self.logger.error(f"Error in bot loop: {e}")
                time.sleep(60)

    def post_tweet(self, content: str, media_ids: Optional[List[str]] = None) -> Optional[str]:
        """Post a tweet"""
        try:
            if self.posts_today >= self.daily_post_limit:
                self.logger.warning("Daily post limit reached")
                return None

            # Check rate limiting
            if self.last_post_time:
                time_since_last = time.time() - self.last_post_time
                if time_since_last < 300:  # 5 minutes minimum
                    wait_time = 300 - time_since_last
                    self.logger.info(f"Rate limiting: waiting {wait_time}s")
                    time.sleep(wait_time)

            # Post tweet
            response = self.client.create_tweet(
                text=content,
                media_ids=media_ids
            )

            tweet_id = response.data['id']
            self.posts_today += 1
            self.last_post_time = time.time()

            self.logger.info(f"Tweet posted: {tweet_id}")
            return tweet_id

        except Exception as e:
            self.logger.error(f"Failed to post tweet: {e}")
            return None

    def post_thread(self, tweets: List[str]) -> bool:
        """Post a Twitter thread"""
        try:
            previous_tweet_id = None

            for i, tweet_text in enumerate(tweets):
                # Add thread numbering
                if len(tweets) > 1:
                    numbered_text = f"{tweet_text}\n\n{i+1}/{len(tweets)}"
                else:
                    numbered_text = tweet_text

                # Post tweet
                if previous_tweet_id:
                    response = self.client.create_tweet(
                        text=numbered_text,
                        in_reply_to_tweet_id=previous_tweet_id
                    )
                else:
                    response = self.client.create_tweet(text=numbered_text)

                previous_tweet_id = response.data['id']

                # Small delay between tweets
                time.sleep(2)

            self.logger.info(f"Thread posted with {len(tweets)} tweets")
            return True

        except Exception as e:
            self.logger.error(f"Failed to post thread: {e}")
            return False

    def post_gm(self):
        """Post good morning tweet"""
        gm_templates = self.content_templates['gm']
        content = random.choice(gm_templates)
        self.post_tweet(content)

    def post_educational_thread(self):
        """Post educational content thread"""
        if self.ai_enabled:
            thread = self.generate_ai_thread("on-chain gaming traits")
            if thread:
                self.post_thread(thread)
        else:
            # Use template
            content = random.choice(self.content_templates['educational'])
            self.post_tweet(content)

    def post_project_update(self):
        """Post project update"""
        updates = [
            "🚀 Development update: Making great progress on breeding system!",
            "📊 Stats: Growing every day thanks to this amazing community!",
            "🎮 New features dropping soon! Stay tuned 👀",
        ]
        content = random.choice(updates)
        self.post_tweet(content)

    def generate_ai_thread(self, topic: str, max_tweets: int = 8) -> Optional[List[str]]:
        """Generate thread using GPT-4"""
        if not self.ai_enabled:
            return None

        try:
            prompt = f"""Write an engaging Twitter thread about {topic} for ZenBeasts,
            a Solana NFT gaming project. Make it educational but fun.

            Format: Return ONLY the thread as a list of tweets, numbered.
            Keep each tweet under 280 characters.
            Max {max_tweets} tweets.
            Include emojis.
            End with a call to action."""

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a web3 content creator for ZenBeasts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )

            content = response.choices[0].message.content

            # Parse thread
            tweets = []
            for line in content.split('\n'):
                line = line.strip()
                # Remove numbering if present
                if line and not line.startswith('#'):
                    # Remove leading numbers like "1." or "1)"
                    import re
                    cleaned = re.sub(r'^\d+[\.\)]\s*', '', line)
                    if cleaned and len(cleaned) <= 280:
                        tweets.append(cleaned)

            return tweets[:max_tweets]

        except Exception as e:
            self.logger.error(f"Failed to generate AI thread: {e}")
            return None

    def respond_to_mentions(self):
        """Respond to recent mentions"""
        try:
            # Get recent mentions (last 24 hours)
            mentions = self.client.get_users_mentions(
                id=self.client.get_me().data.id,
                max_results=20
            )

            if not mentions.data:
                return

            for mention in mentions.data:
                # Check if already replied
                if self._already_replied(mention.id):
                    continue

                # Analyze sentiment
                sentiment = self._analyze_sentiment(mention.text)

                # Generate response
                if sentiment > 0.5:  # Positive
                    response = self._generate_positive_response(mention.text)
                    self.reply_to_tweet(mention.id, response)
                elif sentiment < -0.5:  # Negative
                    # Handle complaints with care
                    self.logger.warning(f"Negative mention detected: {mention.text}")
                else:  # Neutral
                    response = self._generate_neutral_response(mention.text)
                    self.reply_to_tweet(mention.id, response)

                # Rate limiting
                time.sleep(30)

        except Exception as e:
            self.logger.error(f"Failed to respond to mentions: {e}")

    def reply_to_tweet(self, tweet_id: str, content: str) -> bool:
        """Reply to a specific tweet"""
        try:
            self.client.create_tweet(
                text=content,
                in_reply_to_tweet_id=tweet_id
            )
            self.logger.info(f"Replied to tweet {tweet_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to reply: {e}")
            return False

    def _already_replied(self, tweet_id: str) -> bool:
        """Check if we already replied to this tweet"""
        # Cache check
        cache_key = f"replied_{tweet_id}"
        return self.cache_get(cache_key) is not None

    def _analyze_sentiment(self, text: str) -> float:
        """Simple sentiment analysis (-1 to 1)"""
        positive_words = ['great', 'awesome', 'love', 'amazing', 'best', 'thank', 'good']
        negative_words = ['bad', 'worst', 'hate', 'terrible', 'awful', 'scam', 'rug']

        text_lower = text.lower()

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        total = positive_count + negative_count
        if total == 0:
            return 0.0

        return (positive_count - negative_count) / total

    def _generate_positive_response(self, mention_text: str) -> str:
        """Generate response to positive mention"""
        responses = [
            "Thank you! 🙏 We're glad you're part of the ZenBeasts community!",
            "Appreciate the support! 💜 Stay tuned for more updates!",
            "Thanks for being awesome! 🔥",
        ]
        return random.choice(responses)

    def _generate_neutral_response(self, mention_text: str) -> str:
        """Generate response to neutral mention"""
        responses = [
            "Thanks for reaching out! Check our Discord for more info 👉",
            "We're here to help! Join our community: [link]",
            "Great question! We'll get back to you soon 🙏",
        ]
        return random.choice(responses)

    def engage_with_community(self):
        """Like and retweet relevant content"""
        try:
            # Search for relevant tweets
            search_queries = [
                '#SolanaNFT',
                '#NFTGaming',
                'Solana NFT',
            ]

            for query in search_queries:
                tweets = self.client.search_recent_tweets(
                    query=query,
                    max_results=10,
                    tweet_fields=['public_metrics']
                )

                if not tweets.data:
                    continue

                for tweet in tweets.data:
                    # Filter by engagement
                    metrics = tweet.public_metrics
                    if metrics['like_count'] > 10 or metrics['retweet_count'] > 5:
                        # Like the tweet
                        self.client.like(tweet.id)
                        self.logger.info(f"Liked tweet {tweet.id}")

                        # Sometimes retweet
                        if random.random() < 0.3:  # 30% chance
                            self.client.retweet(tweet.id)
                            self.logger.info(f"Retweeted {tweet.id}")

                        time.sleep(10)  # Rate limiting

        except Exception as e:
            self.logger.error(f"Failed to engage with community: {e}")

    def growth_automation(self):
        """Follow relevant accounts for growth"""
        if not self.growth_mode:
            return

        try:
            target_accounts = self.get_config('target_accounts', ['@SolanaNFT', '@NFTGaming'])
            follow_limit = self.get_config('follow_per_day', 50)

            # Get followers of target accounts
            for account_handle in target_accounts:
                # Remove @ if present
                username = account_handle.lstrip('@')

                # Get account ID
                user = self.client.get_user(username=username)
                if not user.data:
                    continue

                # Get their followers
                followers = self.client.get_users_followers(
                    id=user.data.id,
                    max_results=100
                )

                if not followers.data:
                    continue

                followed_today = 0
                for follower in followers.data:
                    if followed_today >= follow_limit:
                        break

                    # Check if already following
                    # (This is simplified - in production, maintain a database)

                    # Follow user
                    try:
                        self.client.follow_user(target_user_id=follower.id)
                        self.logger.info(f"Followed user {follower.username}")
                        followed_today += 1
                        time.sleep(60)  # 1 minute between follows
                    except Exception as e:
                        self.logger.warning(f"Failed to follow {follower.username}: {e}")

        except Exception as e:
            self.logger.error(f"Growth automation error: {e}")

    def get_analytics(self) -> Dict:
        """Get Twitter analytics"""
        try:
            me = self.client.get_me(user_fields=['public_metrics'])
            metrics = me.data.public_metrics

            analytics = {
                'followers': metrics['followers_count'],
                'following': metrics['following_count'],
                'tweets': metrics['tweet_count'],
                'posts_today': self.posts_today,
                'last_post': self.last_post_time,
            }

            return analytics

        except Exception as e:
            self.logger.error(f"Failed to get analytics: {e}")
            return {}


if __name__ == '__main__':
    # Test bot standalone
    import yaml

    config = {
        'enabled': True,
        'auto_engage': True,
        'growth_mode': False,
        'daily_post_limit': 10,
    }

    bot = TwitterBot(config)

    try:
        bot.start()
    except KeyboardInterrupt:
        bot.stop()
        print("\nTwitter Bot stopped")
