/**
 * Banner visual para indicar el entorno de ejecución.
 * Se muestra en entornos que NO son producción (development, staging).
 * Usa la variable VITE_APP_ENVIRONMENT para determinar el entorno.
 */
export function EnvironmentBanner() {
    const environment = import.meta.env.VITE_APP_ENVIRONMENT || import.meta.env.MODE;

    // Solo ocultar en producción explícita
    if (environment === 'production') return null;

    const label = environment === 'staging'
        ? '🧪 ENTORNO STAGING - Pruebas'
        : '🚧 MODO DESARROLLO LOCAL 🚧';

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white text-center py-1 text-sm font-semibold shadow-md">
            {label}
        </div>
    );
}
