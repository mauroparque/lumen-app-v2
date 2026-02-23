import { useState, useEffect, useMemo, useCallback } from 'react';
import { useService } from '../context/ServiceContext';
import { useData } from '../context/DataContext';
import type { ClinicalNote, Appointment } from '../types';

export interface Subtask {
    text: string;
    completed: boolean;
}

export interface PendingTask {
    noteId: string;
    appointmentId: string;
    patientId: string;
    patientName?: string;
    taskIndex: number;
    text: string;
    subtasks?: Subtask[];
    createdAt: unknown;
    appointmentDate?: string;
}

export function usePendingTasks(appointments: Appointment[] = [], myPatientIds?: Set<string>) {
    const service = useService();
    const { patients } = useData();
    const [allNotes, setAllNotes] = useState<ClinicalNote[]>([]);
    const [loading, setLoading] = useState(true);

    const patientMap = useMemo(() => {
        return new Map(patients.map((p) => [p.id, p]));
    }, [patients]);

    const filteredPatientIds = useMemo(() => {
        if (!myPatientIds) return null;
        return myPatientIds;
    }, [myPatientIds]);

    useEffect(() => {
        if (!service) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = service.subscribeToAllNotes((notes) => {
            setAllNotes(notes);
            setLoading(false);
        });

        return unsub;
    }, [service]);

    const pendingTasks = useMemo(() => {
        const tasks: PendingTask[] = [];

        allNotes.forEach((note) => {
            if (filteredPatientIds && !filteredPatientIds.has(note.patientId)) {
                return;
            }

            if (note.tasks && Array.isArray(note.tasks)) {
                const appointment = appointments.find((a) => a.id === note.appointmentId);
                const patient = patientMap.get(note.patientId);

                note.tasks.forEach((task, index) => {
                    if (!task.completed) {
                        tasks.push({
                            noteId: note.id,
                            appointmentId: note.appointmentId,
                            patientId: note.patientId,
                            patientName: patient?.name,
                            taskIndex: index,
                            text: task.text,
                            subtasks: task.subtasks || [],
                            createdAt: note.createdAt,
                            appointmentDate: appointment?.date,
                        });
                    }
                });
            }
        });

        tasks.sort((a, b) => {
            if (a.appointmentDate && b.appointmentDate) {
                return a.appointmentDate.localeCompare(b.appointmentDate);
            }
            const dateA = (a.createdAt as unknown as { toDate?: () => Date })?.toDate?.() || new Date(0);
            const dateB = (b.createdAt as unknown as { toDate?: () => Date })?.toDate?.() || new Date(0);
            return dateA.getTime() - dateB.getTime();
        });

        return tasks;
    }, [allNotes, appointments, filteredPatientIds, patientMap]);

    const completeTask = useCallback(
        async (noteId: string, taskIndex: number) => {
            if (!service) throw new Error('Service not available');
            return service.completeTask(noteId, taskIndex);
        },
        [service],
    );

    return { pendingTasks, loading, completeTask };
}
