// TOPS CORE — Server-Authoritative Timer Module
// Client timer is UI-only. Server validates deadline on submit.

/** 
 * @param {string} expectedEndAtISO - ISO string from server
 * @param {Object} options
 * @param {number} [options.totalSeconds] - total duration in seconds for percentage-based warnings (30% & 10%)
 * @param {Function} options.onTick(remainingSeconds)
 * @param {Function} options.onWarning(remainingSeconds, tier) - called at 30% ('warning') and 10% ('critical') marks
 * @param {Function} options.onExpire() - called when timer reaches zero
 * @returns {{ stop: Function }}
 */
export function startCountdown(expectedEndAtISO, { totalSeconds, onTick, onWarning, onExpire } = {}) {
  const endTime = new Date(expectedEndAtISO).getTime();
  const initialRemaining = Math.max(1, Math.floor((endTime - Date.now()) / 1000));
  const total = (Number(totalSeconds) > 0) ? Number(totalSeconds) : initialRemaining;
  const warnThreshold = Math.max(1, Math.round(total * 0.30));
  const critThreshold = Math.max(1, Math.round(total * 0.10));

  let intervalId = null;
  let warningFired = false;
  let criticalFired = false;

  function tick() {
    const remaining = Math.floor((endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(intervalId);
      onTick?.(0);
      onExpire?.();
      return;
    }

    onTick?.(remaining);

    // Warning at 30% remaining
    if (!warningFired && remaining <= warnThreshold) {
      warningFired = true;
      onWarning?.(remaining, 'warning');
    }

    // Critical at 10% remaining
    if (!criticalFired && remaining <= critThreshold) {
      criticalFired = true;
      onWarning?.(remaining, 'critical');
    }
  }

  tick(); // immediate first call
  intervalId = setInterval(tick, 1000);

  return {
    stop() { clearInterval(intervalId); },
    getRemainingSeconds() {
      return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    }
  };
}

/** Returns true if the server deadline has passed */
export function isExpired(expectedEndAtISO) {
  return new Date(expectedEndAtISO).getTime() < Date.now();
}
