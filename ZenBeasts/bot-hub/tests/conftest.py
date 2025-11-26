#!/usr/bin/env python3
"""
ZenBeasts Bot Hub - Pytest Configuration and Fixtures
Shared fixtures and configuration for all tests
"""

import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, Mock

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot_base import BotBase
from utils.db import Database
from utils.logger import setup_logger

# ============================================================================
# Session-level Fixtures
# ============================================================================


@pytest.fixture(scope="session")
def test_data_dir():
    """Create temporary directory for test data"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture(scope="session")
def test_env_vars():
    """Set up test environment variables"""
    original_env = os.environ.copy()

    # Set test environment variables
    test_env = {
        "DISCORD_BOT_TOKEN": "test_discord_token_12345",
        "TWITTER_API_KEY": "test_twitter_key",
        "TWITTER_API_SECRET": "test_twitter_secret",
        "TWITTER_ACCESS_TOKEN": "test_access_token",
        "TWITTER_ACCESS_TOKEN_SECRET": "test_access_secret",
        "OPENAI_API_KEY": "test_openai_key",
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_DB": "test_zenbeasts",
        "POSTGRES_USER": "test_user",
        "POSTGRES_PASSWORD": "test_password",
        "LOG_LEVEL": "DEBUG",
        "ENVIRONMENT": "test",
        "TEST_MODE": "true",
    }

    os.environ.update(test_env)

    yield test_env

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


# ============================================================================
# Function-level Fixtures
# ============================================================================


@pytest.fixture
def mock_logger():
    """Provide a mock logger"""
    logger = MagicMock()
    logger.debug = MagicMock()
    logger.info = MagicMock()
    logger.warning = MagicMock()
    logger.error = MagicMock()
    logger.critical = MagicMock()
    return logger


@pytest.fixture
def test_config():
    """Provide basic test configuration"""
    return {
        "test_mode": True,
        "log_level": "DEBUG",
        "check_interval": 5,
        "timeout": 30,
    }


@pytest.fixture
def test_database(test_data_dir):
    """Provide a test database"""
    db_path = test_data_dir / "test.db"
    db = Database(db_path=str(db_path), auto_migrate=True)
    yield db
    db.close_all()


@pytest.fixture
def mock_bot(test_config):
    """Provide a mock bot instance"""

    class MockBot(BotBase):
        def start(self):
            self.running = True

        def stop(self):
            self.running = False

        def run(self):
            pass

    return MockBot(test_config)


@pytest.fixture
def mock_discord_client():
    """Mock Discord client"""
    client = MagicMock()
    client.user = MagicMock()
    client.user.name = "TestBot"
    client.user.id = 123456789
    client.guilds = []
    return client


@pytest.fixture
def mock_twitter_client():
    """Mock Twitter client"""
    client = MagicMock()
    client.get_me = MagicMock(
        return_value={"data": {"id": "123", "username": "testbot"}}
    )
    client.create_tweet = MagicMock(return_value={"data": {"id": "456"}})
    return client


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client"""
    client = MagicMock()
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = "Test AI response"
    client.ChatCompletion.create = MagicMock(return_value=response)
    return client


@pytest.fixture
def sample_campaign():
    """Sample marketing campaign for testing"""
    return {
        "id": "campaign-123",
        "name": "Test Campaign",
        "type": "awareness",
        "channels": ["twitter", "discord"],
        "budget": 100.0,
        "spent": 0.0,
        "duration_days": 7,
        "target_audience": "all",
        "status": "draft",
        "created_at": datetime.now().isoformat(),
        "metrics": {
            "impressions": 0,
            "clicks": 0,
            "conversions": 0,
            "engagement_rate": 0.0,
            "ctr": 0.0,
            "roi": 0.0,
        },
    }


@pytest.fixture
def sample_reward():
    """Sample reward for testing"""
    return {
        "id": "reward-123",
        "user_id": "user_456",
        "amount": 50.0,
        "reason": "Test reward",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "metadata": {},
    }


@pytest.fixture
def sample_deployment():
    """Sample deployment for testing"""
    return {
        "id": "deploy-123",
        "environment": "staging",
        "version": "v1.0.0",
        "started_at": datetime.now().isoformat(),
        "status": "in_progress",
        "dry_run": False,
        "steps": [],
    }


@pytest.fixture
def mock_requests(monkeypatch):
    """Mock requests library"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True}
    mock_response.text = "OK"

    mock_get = MagicMock(return_value=mock_response)
    mock_post = MagicMock(return_value=mock_response)

    monkeypatch.setattr("requests.get", mock_get)
    monkeypatch.setattr("requests.post", mock_post)

    return {"get": mock_get, "post": mock_post, "response": mock_response}


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    redis = MagicMock()
    redis.get = MagicMock(return_value=None)
    redis.set = MagicMock(return_value=True)
    redis.delete = MagicMock(return_value=1)
    redis.exists = MagicMock(return_value=False)
    return redis


@pytest.fixture
def mock_postgres():
    """Mock PostgreSQL connection"""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchone = MagicMock(return_value=None)
    cursor.fetchall = MagicMock(return_value=[])
    conn.cursor = MagicMock(return_value=cursor)
    return conn


# ============================================================================
# Utility Functions
# ============================================================================


def create_temp_file(content: str, suffix: str = ".txt") -> Path:
    """Create a temporary file with content"""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "w") as f:
        f.write(content)
    return Path(path)


def create_test_user():
    """Create a test user dictionary"""
    return {
        "user_id": "test_user_123",
        "username": "testuser",
        "xp": 100,
        "level": 5,
        "messages_sent": 50,
        "joined_at": datetime.now().isoformat(),
    }


def create_test_tweet():
    """Create a test tweet dictionary"""
    return {
        "id": "tweet_123",
        "text": "Test tweet content",
        "author_id": "user_456",
        "created_at": datetime.now().isoformat(),
        "public_metrics": {"like_count": 10, "retweet_count": 5, "reply_count": 2},
    }


# ============================================================================
# Pytest Hooks
# ============================================================================


def pytest_configure(config):
    """Configure pytest with custom settings"""
    # Register custom markers
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "slow: Slow running tests")

    # Create logs directory
    logs_dir = Path("tests/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)


def pytest_collection_modifyitems(config, items):
    """Modify test items during collection"""
    for item in items:
        # Add markers based on test location
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)

        # Mark slow tests
        if "slow" in item.nodeid:
            item.add_marker(pytest.mark.slow)


def pytest_runtest_setup(item):
    """Setup for each test"""
    # Skip integration tests if no network
    if "integration" in item.keywords:
        try:
            import socket

            socket.create_connection(("8.8.8.8", 53), timeout=3)
        except OSError:
            pytest.skip("No network connection available")

    # Skip tests requiring environment variables
    if "requires_env" in item.keywords:
        required_vars = getattr(item, "required_env_vars", [])
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            pytest.skip(f"Missing required environment variables: {missing}")


def pytest_runtest_teardown(item):
    """Teardown after each test"""
    # Clean up any test files
    pass


# ============================================================================
# Custom Assertions
# ============================================================================


def assert_bot_healthy(bot):
    """Assert that a bot is in healthy state"""
    assert bot.healthy, "Bot is not healthy"
    assert bot.running or not bot.stats["start_time"], "Bot state inconsistent"


def assert_valid_timestamp(timestamp_str):
    """Assert that a string is a valid ISO timestamp"""
    try:
        datetime.fromisoformat(timestamp_str)
    except ValueError:
        pytest.fail(f"Invalid timestamp: {timestamp_str}")


def assert_positive_number(value, name="value"):
    """Assert that a value is a positive number"""
    assert isinstance(value, (int, float)), f"{name} is not a number"
    assert value >= 0, f"{name} is negative"


# ============================================================================
# Pytest Plugins
# ============================================================================


@pytest.fixture
def capture_logs(caplog):
    """Capture log messages during test"""
    import logging

    caplog.set_level(logging.DEBUG)
    return caplog


# ============================================================================
# Test Data Generators
# ============================================================================


class TestDataGenerator:
    """Generate test data for various scenarios"""

    @staticmethod
    def generate_users(count: int = 10):
        """Generate multiple test users"""
        return [
            {
                "user_id": f"user_{i}",
                "username": f"testuser{i}",
                "xp": i * 100,
                "level": i,
            }
            for i in range(count)
        ]

    @staticmethod
    def generate_metrics(count: int = 100):
        """Generate metric data points"""
        return [
            {
                "timestamp": datetime.now().isoformat(),
                "value": i * 10,
                "metric_name": "test_metric",
            }
            for i in range(count)
        ]


@pytest.fixture
def test_data_generator():
    """Provide test data generator"""
    return TestDataGenerator()


# ============================================================================
# Async Support
# ============================================================================


@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    import asyncio

    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
