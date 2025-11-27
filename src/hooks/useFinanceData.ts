import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, appId } from '../lib/firebase';
import { Appointment, Payment } from '../types';
import { MOCK_APPOINTMENTS, MOCK_PAYMENTS } from '../lib/mockData';

export const useFinanceData = (user: User | null) => {
    const [unpaidAppointments, setUnpaidAppointments] = useState<Appointment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            setUnpaidAppointments([]);
            setPayments([]);
            return;
        }

        setLoading(true);

        // DEMO MODE
        if (user.uid === 'demo-user') {
            const unpaid = MOCK_APPOINTMENTS.filter(a => !a.isPaid && a.status !== 'cancelado');
            unpaid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setUnpaidAppointments(unpaid);
            setPayments(MOCK_PAYMENTS);
            setLoading(false);
            return;
        }

        // REAL FIRESTORE MODE
        const appointmentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'appointments');
        const paymentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'payments');

        // Query 1: All Unpaid Appointments (No date filter)
        const unpaidQuery = query(
            appointmentsRef,
            where('isPaid', '==', false),
            where('status', '!=', 'cancelado')
        );

        // Query 2: Payments (Last 50)
        const paymentsQuery = query(
            paymentsRef,
            orderBy('date', 'desc'),
            limit(50)
        );

        const unsubUnpaid = onSnapshot(unpaidQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            // Client-side sort by date descending
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setUnpaidAppointments(data);
        });

        const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(data);
            setLoading(false);
        });

        return () => {
            unsubUnpaid();
            unsubPayments();
        };
    }, [user]);

    return { unpaidAppointments, payments, loading };
};
