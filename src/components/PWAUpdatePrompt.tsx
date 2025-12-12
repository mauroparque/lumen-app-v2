import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';

// Check for updates every 5 minutes (in milliseconds)
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

export const PWAUpdatePrompt = () => {
    const {
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log('SW Registered: ' + swUrl);
            if (r) {
                // Check for updates periodically
                setInterval(() => {
                    console.log('Checking for SW updates...');
                    r.update();
                }, UPDATE_CHECK_INTERVAL);
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    // Force page reload when SW updates (autoUpdate mode)
    useEffect(() => {
        // Listen for SW controller change (new SW took control)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('New service worker activated, reloading...');
                window.location.reload();
            });
        }
    }, []);

    return null; // No UI needed with autoUpdate
};
