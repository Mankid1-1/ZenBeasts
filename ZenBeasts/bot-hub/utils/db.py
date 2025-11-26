#!/usr/bin/env python3
"""
Database Utility for ZenBeasts Bot Hub
Provides database operations, connection pooling, and migrations
"""

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple, Union


class Database:
    """
    Database manager with SQLite support, connection pooling, and migrations
    """

    def __init__(
        self,
        db_path: str = "data/zenbeasts.db",
        pool_size: int = 5,
        timeout: int = 30,
        auto_migrate: bool = True,
    ):
        """
        Initialize database connection

        Args:
            db_path: Path to SQLite database file
            pool_size: Maximum number of connections in pool
            timeout: Database operation timeout in seconds
            auto_migrate: Automatically run migrations on init
        """
        self.db_path = Path(db_path)
        self.pool_size = pool_size
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)

        # Create database directory if it doesn't exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        # Connection pool
        self._connection_pool: List[sqlite3.Connection] = []
        self._pool_lock = Lock()

        # Initialize connection
        self._init_connection()

        # Run migrations if enabled
        if auto_migrate:
            self.migrate()

        self.logger.info(f"Database initialized: {self.db_path}")

    def _init_connection(self):
        """Initialize database connection with proper settings"""
        conn = sqlite3.connect(
            str(self.db_path),
            timeout=self.timeout,
            check_same_thread=False,
        )

        # Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON")

        # Set journal mode to WAL for better concurrency
        conn.execute("PRAGMA journal_mode = WAL")

        # Enable auto-vacuum
        conn.execute("PRAGMA auto_vacuum = INCREMENTAL")

        # Row factory for dict-like access
        conn.row_factory = sqlite3.Row

        return conn

    @contextmanager
    def get_connection(self):
        """
        Get a database connection from the pool

        Yields:
            Database connection
        """
        conn = None
        try:
            with self._pool_lock:
                if self._connection_pool:
                    conn = self._connection_pool.pop()
                else:
                    conn = self._init_connection()

            yield conn

        finally:
            if conn:
                with self._pool_lock:
                    if len(self._connection_pool) < self.pool_size:
                        self._connection_pool.append(conn)
                    else:
                        conn.close()

    def execute(
        self,
        query: str,
        params: Optional[Union[Tuple, Dict]] = None,
        commit: bool = True,
    ) -> sqlite3.Cursor:
        """
        Execute a SQL query

        Args:
            query: SQL query string
            params: Query parameters
            commit: Whether to commit after execution

        Returns:
            Cursor object
        """
        with self.get_connection() as conn:
            try:
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)

                if commit:
                    conn.commit()

                return cursor

            except sqlite3.Error as e:
                self.logger.error(f"Database error: {e}")
                self.logger.error(f"Query: {query}")
                self.logger.error(f"Params: {params}")
                conn.rollback()
                raise

    def executemany(
        self,
        query: str,
        params_list: List[Union[Tuple, Dict]],
        commit: bool = True,
    ) -> int:
        """
        Execute a query multiple times with different parameters

        Args:
            query: SQL query string
            params_list: List of parameter tuples/dicts
            commit: Whether to commit after execution

        Returns:
            Number of rows affected
        """
        with self.get_connection() as conn:
            try:
                cursor = conn.cursor()
                cursor.executemany(query, params_list)

                if commit:
                    conn.commit()

                return cursor.rowcount

            except sqlite3.Error as e:
                self.logger.error(f"Database error: {e}")
                conn.rollback()
                raise

    def fetchone(
        self, query: str, params: Optional[Union[Tuple, Dict]] = None
    ) -> Optional[Dict]:
        """
        Fetch a single row

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            Row as dictionary or None
        """
        cursor = self.execute(query, params, commit=False)
        row = cursor.fetchone()
        return dict(row) if row else None

    def fetchall(
        self, query: str, params: Optional[Union[Tuple, Dict]] = None
    ) -> List[Dict]:
        """
        Fetch all rows

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            List of rows as dictionaries
        """
        cursor = self.execute(query, params, commit=False)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def insert(self, table: str, data: Dict[str, Any]) -> int:
        """
        Insert a row into a table

        Args:
            table: Table name
            data: Dictionary of column->value mappings

        Returns:
            Last inserted row ID
        """
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data])
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

        cursor = self.execute(query, tuple(data.values()))
        return cursor.lastrowid

    def update(
        self,
        table: str,
        data: Dict[str, Any],
        where: str,
        where_params: Optional[Union[Tuple, Dict]] = None,
    ) -> int:
        """
        Update rows in a table

        Args:
            table: Table name
            data: Dictionary of column->value mappings to update
            where: WHERE clause (without 'WHERE' keyword)
            where_params: Parameters for WHERE clause

        Returns:
            Number of rows affected
        """
        set_clause = ", ".join([f"{col} = ?" for col in data.keys()])
        query = f"UPDATE {table} SET {set_clause} WHERE {where}"

        params = tuple(data.values())
        if where_params:
            if isinstance(where_params, dict):
                params = params + tuple(where_params.values())
            else:
                params = params + where_params

        cursor = self.execute(query, params)
        return cursor.rowcount

    def delete(
        self,
        table: str,
        where: str,
        where_params: Optional[Union[Tuple, Dict]] = None,
    ) -> int:
        """
        Delete rows from a table

        Args:
            table: Table name
            where: WHERE clause (without 'WHERE' keyword)
            where_params: Parameters for WHERE clause

        Returns:
            Number of rows affected
        """
        query = f"DELETE FROM {table} WHERE {where}"
        cursor = self.execute(query, where_params)
        return cursor.rowcount

    def table_exists(self, table_name: str) -> bool:
        """
        Check if a table exists

        Args:
            table_name: Name of the table

        Returns:
            True if table exists, False otherwise
        """
        query = """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name=?
        """
        result = self.fetchone(query, (table_name,))
        return result is not None

    def get_table_info(self, table_name: str) -> List[Dict]:
        """
        Get information about table columns

        Args:
            table_name: Name of the table

        Returns:
            List of column information dictionaries
        """
        query = f"PRAGMA table_info({table_name})"
        return self.fetchall(query)

    def migrate(self):
        """Run database migrations"""
        self.logger.info("Running database migrations...")

        # Create migrations table if it doesn't exist
        self.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT UNIQUE NOT NULL,
                applied_at TEXT NOT NULL
            )
        """)

        # Run each migration
        migrations = [
            self._migration_001_initial_schema,
            self._migration_002_bot_tables,
            self._migration_003_analytics_tables,
        ]

        for migration in migrations:
            migration_name = migration.__name__
            if not self._is_migration_applied(migration_name):
                try:
                    self.logger.info(f"Applying migration: {migration_name}")
                    migration()
                    self._mark_migration_applied(migration_name)
                    self.logger.info(f"Migration applied: {migration_name}")
                except Exception as e:
                    self.logger.error(f"Migration failed: {migration_name} - {e}")
                    raise

        self.logger.info("Database migrations complete")

    def _is_migration_applied(self, migration_name: str) -> bool:
        """Check if a migration has been applied"""
        result = self.fetchone(
            "SELECT id FROM migrations WHERE migration_name = ?", (migration_name,)
        )
        return result is not None

    def _mark_migration_applied(self, migration_name: str):
        """Mark a migration as applied"""
        self.insert(
            "migrations",
            {
                "migration_name": migration_name,
                "applied_at": datetime.now().isoformat(),
            },
        )

    def _migration_001_initial_schema(self):
        """Initial schema migration"""
        # Bot errors table
        self.execute("""
            CREATE TABLE IF NOT EXISTS bot_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                error TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                severity TEXT DEFAULT 'ERROR',
                resolved INTEGER DEFAULT 0,
                INDEX idx_bot_errors_bot (bot_name),
                INDEX idx_bot_errors_timestamp (timestamp)
            )
        """)

        # Bot health table
        self.execute("""
            CREATE TABLE IF NOT EXISTS bot_health (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                response_time REAL,
                memory_usage REAL,
                cpu_usage REAL,
                INDEX idx_bot_health_bot (bot_name),
                INDEX idx_bot_health_timestamp (timestamp)
            )
        """)

        # Bot logs table
        self.execute("""
            CREATE TABLE IF NOT EXISTS bot_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                extra_data TEXT,
                INDEX idx_bot_logs_bot (bot_name),
                INDEX idx_bot_logs_level (level),
                INDEX idx_bot_logs_timestamp (timestamp)
            )
        """)

        # Scheduled tasks table
        self.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                task_name TEXT NOT NULL,
                scheduled_time TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                completed_at TEXT,
                result TEXT,
                INDEX idx_scheduled_tasks_bot (bot_name),
                INDEX idx_scheduled_tasks_status (status),
                INDEX idx_scheduled_tasks_scheduled_time (scheduled_time)
            )
        """)

    def _migration_002_bot_tables(self):
        """Bot-specific tables migration"""
        # Discord bot data
        self.execute("""
            CREATE TABLE IF NOT EXISTS discord_users (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                messages_sent INTEGER DEFAULT 0,
                joined_at TEXT NOT NULL,
                last_active TEXT,
                data TEXT
            )
        """)

        # Twitter bot data
        self.execute("""
            CREATE TABLE IF NOT EXISTS twitter_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tweet_id TEXT UNIQUE NOT NULL,
                action TEXT NOT NULL,
                target_user TEXT,
                timestamp TEXT NOT NULL,
                success INTEGER DEFAULT 1,
                response TEXT
            )
        """)

        # Content cache
        self.execute("""
            CREATE TABLE IF NOT EXISTS content_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_type TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                used INTEGER DEFAULT 0,
                metadata TEXT
            )
        """)

    def _migration_003_analytics_tables(self):
        """Analytics tables migration"""
        # Bot metrics
        self.execute("""
            CREATE TABLE IF NOT EXISTS bot_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_name TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                timestamp TEXT NOT NULL,
                tags TEXT,
                INDEX idx_bot_metrics_bot_metric (bot_name, metric_name),
                INDEX idx_bot_metrics_timestamp (timestamp)
            )
        """)

        # Events table
        self.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_data TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                processed INTEGER DEFAULT 0,
                INDEX idx_events_type (event_type),
                INDEX idx_events_timestamp (timestamp),
                INDEX idx_events_processed (processed)
            )
        """)

    # Convenience methods for common operations

    def log_bot_error(self, bot_name: str, error: str, severity: str = "ERROR"):
        """Log a bot error"""
        return self.insert(
            "bot_errors",
            {
                "bot_name": bot_name,
                "error": error,
                "severity": severity,
                "timestamp": datetime.now().isoformat(),
            },
        )

    def log_bot_health(self, bot_name: str, status: dict):
        """Log bot health status"""
        return self.insert(
            "bot_health",
            {
                "bot_name": bot_name,
                "status": json.dumps(status),
                "timestamp": datetime.now().isoformat(),
            },
        )

    def get_bot_errors(self, bot_name: str, limit: int = 100) -> List[Dict]:
        """Get recent errors for a bot"""
        return self.fetchall(
            """
            SELECT * FROM bot_errors
            WHERE bot_name = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (bot_name, limit),
        )

    def get_bot_health_history(self, bot_name: str, hours: int = 24) -> List[Dict]:
        """Get bot health history"""
        from datetime import timedelta

        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()

        return self.fetchall(
            """
            SELECT * FROM bot_health
            WHERE bot_name = ? AND timestamp > ?
            ORDER BY timestamp DESC
            """,
            (bot_name, cutoff),
        )

    def track_metric(
        self, bot_name: str, metric_name: str, value: float, tags: Optional[Dict] = None
    ):
        """Track a metric"""
        return self.insert(
            "bot_metrics",
            {
                "bot_name": bot_name,
                "metric_name": metric_name,
                "metric_value": value,
                "timestamp": datetime.now().isoformat(),
                "tags": json.dumps(tags) if tags else None,
            },
        )

    def get_metrics(
        self, bot_name: str, metric_name: str, hours: int = 24
    ) -> List[Dict]:
        """Get metric history"""
        from datetime import timedelta

        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()

        return self.fetchall(
            """
            SELECT * FROM bot_metrics
            WHERE bot_name = ? AND metric_name = ? AND timestamp > ?
            ORDER BY timestamp ASC
            """,
            (bot_name, metric_name, cutoff),
        )

    def vacuum(self):
        """Vacuum the database to reclaim space"""
        with self.get_connection() as conn:
            conn.execute("VACUUM")
        self.logger.info("Database vacuumed")

    def backup(self, backup_path: Optional[str] = None):
        """
        Create a backup of the database

        Args:
            backup_path: Path for backup file (default: timestamped backup)
        """
        if backup_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = str(self.db_path.parent / f"zenbeasts_backup_{timestamp}.db")

        with self.get_connection() as conn:
            backup_conn = sqlite3.connect(backup_path)
            conn.backup(backup_conn)
            backup_conn.close()

        self.logger.info(f"Database backed up to: {backup_path}")
        return backup_path

    def close_all(self):
        """Close all connections in the pool"""
        with self._pool_lock:
            for conn in self._connection_pool:
                conn.close()
            self._connection_pool.clear()
        self.logger.info("All database connections closed")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close_all()

    def __del__(self):
        """Cleanup on deletion"""
        try:
            self.close_all()
        except:
            pass
