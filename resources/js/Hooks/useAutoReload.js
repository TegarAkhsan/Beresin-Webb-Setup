import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

/**
 * useAutoReload — silent background polling via Inertia partial reload.
 *
 * @param {string[]} only      - Props to reload (e.g. ['activeTasks', 'stats'])
 * @param {number}   interval  - Polling interval in ms (default: 30_000)
 * @param {boolean}  enabled   - Toggle polling on/off (default: true)
 *
 * Usage:
 *   useAutoReload(['activeTasks', 'reviewTasks', 'stats'], 30_000);
 */
export default function useAutoReload(only = [], interval = 30_000, enabled = true) {
    const timerRef = useRef(null);
    const activeRef = useRef(false); // prevent overlapping requests

    useEffect(() => {
        if (!enabled || only.length === 0) return;

        const poll = () => {
            // Skip if a reload is already in-flight
            if (activeRef.current) return;

            activeRef.current = true;
            router.reload({
                only,
                preserveScroll: true,
                preserveState: true,
                // Inertia does not show the top progress bar for `only` reloads
                // when we explicitly disable it:
                headers: { 'X-Inertia-Partial-Reload': 'true' },
                onFinish: () => {
                    activeRef.current = false;
                },
            });
        };

        timerRef.current = setInterval(poll, interval);

        return () => {
            clearInterval(timerRef.current);
        };
    }, [enabled, interval, only.join(',')]);
}
