import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from './firebase';
import { User } from 'firebase/auth';

export const requestInvoice = async (appointmentId: string, user: User) => {
    const queueRef = collection(db, 'artifacts', appId, 'users', user.uid, 'integrations', 'billing', 'queue');

    await addDoc(queueRef, {
        appointmentId,
        status: 'pending',
        createdAt: serverTimestamp(),
        retryCount: 0
    });
};
