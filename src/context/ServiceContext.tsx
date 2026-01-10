import React, { createContext, useContext, useMemo } from 'react';
import { User } from 'firebase/auth';
import { IDataService } from '../services/IDataService';
import { FirebaseService } from '../services/FirebaseService';
import { StaffProfile } from '../types';

const ServiceContext = createContext<IDataService | null>(null);

export const useService = () => {
    return useContext(ServiceContext);
};

interface ServiceProviderProps {
    user: User | null;
    profile: StaffProfile | null;
    children: React.ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ user, profile, children }) => {
    const service = useMemo(() => {
        if (!user) return null;
        // Pass the professional name based on profile or user display name
        const professionalName = profile?.name || user.displayName || null;
        return new FirebaseService(user.uid, professionalName || undefined);
    }, [user?.uid, profile?.name, user?.displayName]);

    if (!user || !service) {
        return <>{children}</>;
    }

    return (
        <ServiceContext.Provider value={service}>
            {children}
        </ServiceContext.Provider>
    );
};
