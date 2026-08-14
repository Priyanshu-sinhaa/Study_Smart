"""
Structured logging configuration for Concept Canvas FastAPI backend.
Provides colored console output and optional file logging.
"""
import logging
import sys
from datetime import datetime

# ANSI color codes for terminal output
COLORS = {
    "DEBUG":    "\033[36m",   # Cyan
    "INFO":     "\033[32m",   # Green
    "WARNING":  "\033[33m",   # Yellow
    "ERROR":    "\033[31m",   # Red
    "CRITICAL": "\033[35m",   # Magenta
    "RESET":    "\033[0m",
    "BOLD":     "\033[1m",
    "DIM":      "\033[2m",
}

class ColorFormatter(logging.Formatter):
    """Custom formatter that adds color and structured fields to log records."""

    FORMAT = "{bold}{level_color}[{levelname:<8}]{reset} {dim}{asctime}{reset}  {bold}{name}{reset}  {message}"

    def format(self, record: logging.LogRecord) -> str:
        level_color = COLORS.get(record.levelname, COLORS["RESET"])
        record.level_color = level_color
        record.bold = COLORS["BOLD"]
        record.dim = COLORS["DIM"]
        record.reset = COLORS["RESET"]
        record.asctime = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        formatter = logging.Formatter(
            fmt=self.FORMAT.format(
                bold=record.bold,
                level_color=record.level_color,
                levelname=record.levelname,
                reset=record.reset,
                dim=record.dim,
                asctime=record.asctime,
                name=record.name,
                message="%(message)s",
            ),
            style="%",
        )
        return formatter.format(record)


def get_logger(name: str) -> logging.Logger:
    """
    Returns a named logger with colored console output.
    Usage:
        from logger import get_logger
        log = get_logger(__name__)
        log.info("Server started")
        log.error("Something went wrong", exc_info=True)
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Avoid duplicate handlers on re-import

    logger.setLevel(logging.DEBUG)

    # Console handler with color
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.DEBUG)
    console.setFormatter(ColorFormatter())
    logger.addHandler(console)

    # Prevent propagation to root logger (avoids duplicate uvicorn lines)
    logger.propagate = False

    return logger


# Module-level shorthand for the root app logger
log = get_logger("canvas.app")
