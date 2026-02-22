import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Algo salió mal</h2>
                <p className="text-gray-600 mb-4">Ocurrió un error inesperado. Podés intentar recargar la página.</p>
                {import.meta.env.DEV && (
                    <pre className="text-left text-xs bg-gray-100 p-3 rounded mb-4 overflow-auto max-h-40">
                        {error instanceof Error ? error.message : String(error)}
                    </pre>
                )}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={resetErrorBoundary}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Reintentar
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Recargar página
                    </button>
                </div>
            </div>
        </div>
    );
}

interface AppErrorBoundaryProps {
    children: React.ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
    return (
        <ReactErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {}}
            onError={(error, info) => {
                console.error('Uncaught error:', error, info);
            }}
        >
            {children}
        </ReactErrorBoundary>
    );
}
