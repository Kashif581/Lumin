
import time


# IP address -> (failed attempt count, first failure time)
FAILS = {}


def too_many_failures(ip):
    count, first = FAILS.get(ip, (0, 0))

    if count >= 5 and time.time() - first < 300:
        return True

    if time.time() - first >= 300:
        FAILS.pop(ip, None)

    return False


def note_failure(ip):
    count, first = FAILS.get(ip, (0, time.time()))
    FAILS[ip] = (count + 1, first)


def clear_failures(ip):
    """Clear failed login attempts after a successful login."""
    FAILS.pop(ip, None)
