import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, appId, CLINIC_ID } from '../lib/firebase';

export interface InvoiceStatus {
    status: 'pending' | 'processing' | 'completed' | 'error' | 'error_sending' | 'error_config';
    invoiceUrl: string | null;
    invoiceNumber: string | null;
    error?: string;
}

export const useInvoiceStatus = (trackingId: string | null) => {
    const [status, setStatus] = useState<InvoiceStatus>({
        status: 'pending',
        invoiceUrl: null,
        invoiceNumber: null
    });

    useEffect(() => {
        if (!trackingId) {
            setStatus({
                status: 'pending', // Or 'idle' if we want to distinguish
                invoiceUrl: null,
                invoiceNumber: null
            });
            return;
        }

        // Use the same path structure as in queue.ts
        // artifacts/{appId}/clinics/{clinicId}/integrations/billing/queue/{docId}
        const docRef = doc(db, 'artifacts', appId, 'clinics', CLINIC_ID, 'integrations', 'billing', 'queue', trackingId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStatus({
                    status: data.status,
                    invoiceUrl: data.invoiceUrl || null,
                    invoiceNumber: data.invoiceNumber || null,
                    error: data.error
                });
            }
        }, (error) => {
            console.error("Error listening to invoice status:", error);
            setStatus(prev => ({ ...prev, status: 'error', error: error.message }));
        });

        return () => unsubscribe();
    }, [trackingId]);

    return status;
};
