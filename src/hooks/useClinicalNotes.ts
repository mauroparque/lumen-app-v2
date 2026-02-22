import { useState, useEffect, useCallback } from 'react';
import { useService } from '../context/ServiceContext';
import type { ClinicalNote } from '../types';

export function useClinicalNote(appointmentId: string | null) {
    const service = useService();
    const [note, setNote] = useState<ClinicalNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!service || !appointmentId) {
            setNote(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = service.subscribeToClinicalNote(appointmentId, (data: ClinicalNote | null) => {
            setNote(data);
            setLoading(false);
        });
        return unsub;
    }, [service, appointmentId]);

    const saveNote = useCallback(
        async (noteData: Partial<ClinicalNote>, existingNoteId?: string) => {
            if (!service || !appointmentId) throw new Error('Service not available');
            return service.saveNote(noteData, appointmentId, existingNoteId);
        },
        [service, appointmentId],
    );

    const uploadAttachment = useCallback(
        async (file: File, patientId: string) => {
            if (!service) throw new Error('Service not available');
            return service.uploadNoteAttachment(file, patientId);
        },
        [service],
    );

    return { note, loading, saveNote, uploadAttachment };
}

export function usePatientNotes(patientId: string | null) {
    const service = useService();
    const [notes, setNotes] = useState<ClinicalNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!service || !patientId) {
            setNotes([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = service.subscribeToPatientNotes(patientId, (data: ClinicalNote[]) => {
            setNotes(data);
            setLoading(false);
        });
        return unsub;
    }, [service, patientId]);

    return { notes, loading };
}
