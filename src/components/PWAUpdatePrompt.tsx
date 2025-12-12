import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-teal-600 text-white rounded-xl shadow-2xl p-4 max-w-sm flex items-center gap-4">
                <RefreshCw className="w-6 h-6 flex-shrink-0 animate-spin-slow" />
                <div className="flex-1">
                    <p className="font-semibold text-sm">Nueva versión disponible</p>
                    <p className="text-xs text-teal-100">Actualizá para obtener las últimas mejoras</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={close}
                        className="px-3 py-1.5 text-xs text-teal-200 hover:text-white transition-colors"
                    >
                        Más tarde
                    </button>
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="px-4 py-1.5 bg-white text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-50 transition-colors"
                    >
                        Actualizar
                    </button>
                </div>
            </div>
        </div>
    );
};
