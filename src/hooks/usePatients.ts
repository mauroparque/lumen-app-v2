import { useData } from '../context/DataContext';
import { User } from 'firebase/auth';

export const usePatients = (_user: User | null) => {
    const { patients, loading } = useData();
    return { patients, loading };
};
