#!/usr/bin/env python3
"""
Content Bot - Automated content creation and scheduling for ZenBeasts
Features: AI-generated threads, memes, educational content, scheduling
"""

import os
import random
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import openai

sys.path.append("..")
from bot_base import BotBase


class ContentBot(BotBase):
    """Automated content creation and scheduling bot"""

    def __init__(self, config: Dict):
        super().__init__(config)

        # Validate required environment variables
        if not self.validate_env(["OPENAI_API_KEY"]):
            self.logger.warning(
                "OpenAI API key not found - AI content generation disabled"
            )
            self.ai_enabled = False
        else:
            self.ai_enabled = True
            openai.api_key = os.getenv("OPENAI_API_KEY")

        # Bot settings
        self.daily_threads = self.get_config("daily_threads", 3)
        self.topics = self.get_config("topics", "solana,nft,gaming,crypto").split(",")
        self.content_queue = []
        self.content_cache = []

        # Content templates
        self.templates = self._load_content_templates()

        self.logger.info(f"ContentBot initialized - AI enabled: {self.ai_enabled}")

    def _load_content_templates(self) -> Dict[str, List[str]]:
        """Load content templates for different types"""
        return {
            "educational": [
                "🧠 Let's talk about {topic}...\n\nThread 👇",
                "💡 {topic} 101: Everything you need to know\n\n1/",
                "🎓 Deep dive into {topic}\n\nA comprehensive guide 🧵",
            ],
            "update": [
                "🚀 ZenBeasts Update:\n\n{content}",
                "📢 Exciting news!\n\n{content}",
                "⚡ Update: {content}",
            ],
            "engagement": [
                "🤔 Quick question for the community:\n\n{question}",
                "💭 What's your take on {topic}?",
                "🗳️ Poll: {question}",
            ],
            "meme": [
                "When {situation} 😂",
                "POV: {situation}",
                "{situation}\n\nIf you know, you know 👀",
            ],
        }

    def start(self):
        """Start the content bot"""
        self.running = True
        self.stats["start_time"] = time.time()
        self.logger.info("ContentBot started")

        # Initial content generation
        self._generate_daily_content()

        # Run the main loop
        self.run()

    def stop(self):
        """Stop the content bot"""
        self.running = False
        self.logger.info("ContentBot stopped")

    def run(self):
        """Main bot loop"""
        while self.running:
            try:
                self.logger.info("ContentBot checking for scheduled content...")

                # Check if we need to generate new content
                if len(self.content_queue) < self.daily_threads:
                    self._generate_daily_content()

                # Process scheduled content
                self._process_scheduled_content()

                # Wait before next check (1 hour)
                time.sleep(3600)

            except Exception as e:
                self.logger.error(f"Error in ContentBot loop: {e}")
                self.healthy = False
                time.sleep(300)  # Wait 5 minutes on error

    def _generate_daily_content(self):
        """Generate content for the day"""
        self.logger.info(f"Generating {self.daily_threads} pieces of content...")

        try:
            for i in range(self.daily_threads):
                content_type = random.choice(["educational", "engagement", "update"])

                if content_type == "educational" and self.ai_enabled:
                    content = self._generate_educational_thread()
                elif content_type == "engagement":
                    content = self._generate_engagement_post()
                else:
                    content = self._generate_update_post()

                if content:
                    self.content_queue.append(
                        {
                            "type": content_type,
                            "content": content,
                            "scheduled_time": datetime.now() + timedelta(hours=i * 4),
                            "posted": False,
                        }
                    )
                    self.logger.info(f"Generated {content_type} content (#{i + 1})")

            self.logger.info(f"Content queue: {len(self.content_queue)} items")

        except Exception as e:
            self.logger.error(f"Error generating content: {e}")

    def _generate_educational_thread(self) -> Optional[Dict]:
        """Generate an educational thread using AI"""
        if not self.ai_enabled:
            return None

        try:
            topic = random.choice(self.topics)

            prompt = f"""Create an engaging educational Twitter thread about {topic} in the context of Solana NFTs and ZenBeasts.

Requirements:
- 5-7 tweets maximum
- Start with a hook
- Include actionable insights
- End with a call-to-action
- Use emojis appropriately
- Keep it casual but informative

Format: Return as a Python list of strings, one per tweet."""

            response = openai.ChatCompletion.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Solana NFT expert creating engaging Twitter content.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1000,
                temperature=0.8,
            )

            thread = response.choices[0].message.content

            return {
                "format": "thread",
                "tweets": self._parse_thread(thread),
                "topic": topic,
            }

        except Exception as e:
            self.logger.error(f"Error generating educational thread: {e}")
            return None

    def _generate_engagement_post(self) -> Optional[Dict]:
        """Generate an engagement post"""
        try:
            topic = random.choice(self.topics)
            template = random.choice(self.templates["engagement"])

            questions = [
                f"What's your favorite {topic} project and why?",
                f"How do you see {topic} evolving in 2024?",
                f"What's one thing you wish you knew about {topic} earlier?",
                f"Hot take: {topic} is going to...",
                f"Which {topic} feature would you like to see in ZenBeasts?",
            ]

            question = random.choice(questions)
            content = template.format(question=question, topic=topic)

            return {
                "format": "single",
                "text": content,
                "topic": topic,
            }

        except Exception as e:
            self.logger.error(f"Error generating engagement post: {e}")
            return None

    def _generate_update_post(self) -> Optional[Dict]:
        """Generate a project update post"""
        try:
            template = random.choice(self.templates["update"])

            updates = [
                "Our bot hub is now live and managing community automation! 🤖",
                "New trait combinations discovered by the community! 🎨",
                "Activity rewards system is working smoothly ⚡",
                "Community milestone: 1000+ engaged members! 🎉",
                "Developer documentation updated with new examples 📚",
            ]

            update_text = random.choice(updates)
            content = template.format(content=update_text)

            return {
                "format": "single",
                "text": content,
            }

        except Exception as e:
            self.logger.error(f"Error generating update post: {e}")
            return None

    def _parse_thread(self, thread_text: str) -> List[str]:
        """Parse AI-generated thread into individual tweets"""
        # Simple parsing - can be improved
        tweets = []
        for line in thread_text.split("\n"):
            line = line.strip()
            if line and not line.startswith("[") and not line.startswith("#"):
                # Remove numbering like "1.", "2/7", etc.
                line = line.lstrip("0123456789./() ")
                if len(line) > 10:  # Minimum tweet length
                    tweets.append(line[:280])  # Twitter limit

        return tweets[:7]  # Max 7 tweets

    def _process_scheduled_content(self):
        """Process and post scheduled content"""
        now = datetime.now()

        for item in self.content_queue[:]:
            if not item["posted"] and item["scheduled_time"] <= now:
                self.logger.info(f"Posting scheduled content: {item['type']}")

                # Here you would integrate with TwitterBot to actually post
                # For now, we'll just mark it as posted
                item["posted"] = True
                self.content_cache.append(item)

                # Remove from queue
                self.content_queue.remove(item)

                self.logger.info(f"Content posted successfully: {item['type']}")

    def generate_meme_idea(self) -> Dict:
        """Generate a meme idea"""
        situations = [
            "you finally mint your ZenBeast",
            "your beast gets a legendary trait",
            "the activity cooldown just ended",
            "you're waiting for the next trait reveal",
            "someone asks 'wen moon' in Discord",
            "you explain NFT utility to a friend",
            "gas fees are low for once",
            "your portfolio is all NFTs",
        ]

        situation = random.choice(situations)
        template = random.choice(self.templates["meme"])

        return {
            "text": template.format(situation=situation),
            "type": "meme",
            "image_needed": True,
        }

    def get_content_stats(self) -> Dict:
        """Get content generation statistics"""
        return {
            "queue_size": len(self.content_queue),
            "cached_content": len(self.content_cache),
            "ai_enabled": self.ai_enabled,
            "daily_target": self.daily_threads,
            "topics": self.topics,
        }

    def schedule_content(self, content: Dict, post_time: datetime):
        """Manually schedule content"""
        self.content_queue.append(
            {
                "content": content,
                "scheduled_time": post_time,
                "posted": False,
                "manual": True,
            }
        )
        self.logger.info(f"Content scheduled for {post_time}")

    def clear_queue(self):
        """Clear the content queue"""
        self.content_queue.clear()
        self.logger.info("Content queue cleared")

    def get_next_scheduled(self) -> Optional[Dict]:
        """Get the next scheduled content"""
        if not self.content_queue:
            return None

        return min(self.content_queue, key=lambda x: x["scheduled_time"])

    def export_content_calendar(self) -> List[Dict]:
        """Export the content calendar"""
        return sorted(
            [
                {
                    "type": item["type"],
                    "scheduled": item["scheduled_time"].isoformat(),
                    "posted": item["posted"],
                }
                for item in self.content_queue
            ],
            key=lambda x: x["scheduled"],
        )


if __name__ == "__main__":
    # Test the bot
    from dotenv import load_dotenv

    load_dotenv()

    config = {
        "daily_threads": 3,
        "topics": "solana,nft,gaming",
    }

    bot = ContentBot(config)
    print(f"ContentBot initialized: {bot.name}")
    print(f"AI enabled: {bot.ai_enabled}")
    print(f"Daily threads: {bot.daily_threads}")

    # Generate some content
    bot._generate_daily_content()
    print(f"\nGenerated {len(bot.content_queue)} pieces of content")

    # Show first item
    if bot.content_queue:
        print(f"\nFirst item preview:")
        print(f"Type: {bot.content_queue[0]['type']}")
        print(f"Scheduled: {bot.content_queue[0]['scheduled_time']}")
