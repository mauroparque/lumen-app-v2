import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DataProvider, useData } from '../DataContext';

// Mock service where subscriptions never invoke the data callback (simulates network/permission errors)
const mockServiceNeverResolves = {
    subscribeToPatients: vi.fn(() => vi.fn()),
    subscribeToAppointments: vi.fn(() => vi.fn()),
    subscribeToMyAppointments: vi.fn(() => vi.fn()),
    subscribeToPayments: vi.fn(() => vi.fn()),
};

// Mock service where all subscriptions resolve immediately with empty arrays
const mockServiceResolvesEmpty = {
    subscribeToPatients: vi.fn((onData) => {
        onData([]);
        return vi.fn();
    }),
    subscribeToAppointments: vi.fn((_start, _end, onData) => {
        onData([]);
        return vi.fn();
    }),
    subscribeToMyAppointments: vi.fn((_start, _end, onData) => {
        onData([]);
        return vi.fn();
    }),
    subscribeToPayments: vi.fn((onData) => {
        onData([]);
        return vi.fn();
    }),
};

vi.mock('../ServiceContext', () => ({
    useService: vi.fn(),
}));

import { useService } from '../ServiceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <DataProvider>{children}</DataProvider>;

describe('DataContext loading', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('sale del estado loading cuando todas las suscripciones resuelven', async () => {
        vi.mocked(useService).mockReturnValue(mockServiceResolvesEmpty as any);

        const { result } = renderHook(() => useData(), { wrapper });

        // Los callbacks de datos se invocan sincrónicamente en el mock;
        // solo necesitamos un flush de React state (avanzar 1ms).
        await act(async () => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current.loading).toBe(false);
    });

    it('sale del estado loading tras timeout de seguridad si alguna suscripción no responde', async () => {
        // Simula el caso en que subscribeToPayments nunca llama el callback (error de permisos, etc.)
        vi.mocked(useService).mockReturnValue(mockServiceNeverResolves as any);

        const { result } = renderHook(() => useData(), { wrapper });

        expect(result.current.loading).toBe(true);

        // Avanzar menos del timeout → debe seguir en loading
        await act(async () => {
            vi.advanceTimersByTime(9_000);
        });
        expect(result.current.loading).toBe(true);

        // Avanzar hasta superar el timeout de 10s → debe salir del loading
        await act(async () => {
            vi.advanceTimersByTime(2_000);
        });
        expect(result.current.loading).toBe(false);
    });
});
