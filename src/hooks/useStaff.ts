import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useService } from '../context/ServiceContext';
import type { StaffProfile } from '../types';

export const useStaff = (user: User | null) => {
    const service = useService();
    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !service) {
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = service.subscribeToStaffProfile(user.uid, (data) => {
            setProfile(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, service]);

    const createProfile = useCallback(
        async (data: { name: string; specialty?: string }) => {
            if (!user || !service) return;

            const newProfile = {
                uid: user.uid,
                email: user.email || '',
                name: data.name,
                role: 'professional' as const,
                specialty: data.specialty,
            };

            await service.createStaffProfile(user.uid, newProfile as StaffProfile);
        },
        [user, service],
    );

    const updateProfile = useCallback(
        async (data: Partial<StaffProfile>) => {
            if (!user || !service) return;
            await service.updateStaffProfile(user.uid, data);
        },
        [user, service],
    );

    return { profile, loading, createProfile, updateProfile };
};
