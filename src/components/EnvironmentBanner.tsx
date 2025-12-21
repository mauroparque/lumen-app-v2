/**
 * Banner visual para indicar el entorno de ejecución.
 * Solo se muestra en modo desarrollo (staging).
 */
export function EnvironmentBanner() {
    const isDevelopment = import.meta.env.MODE === 'development';

    if (!isDevelopment) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white text-center py-1 text-sm font-semibold shadow-md">
            🚧 MODO PRUEBAS - Entorno Staging 🚧
        </div>
    );
}
