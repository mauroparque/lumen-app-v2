import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

if (!admin.apps.length) {
    admin.initializeApp();
}

export const processBillingQueue = functions.firestore
    .document('artifacts/{appId}/clinics/{clinicId}/integrations/billing/queue/{docId}')
    .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
        const data = snap.data();
        const { docId } = context.params;
        const webhookUrl = process.env.N8N_BILLING_WEBHOOK;

        if (!webhookUrl) {
            console.error('N8N_BILLING_WEBHOOK is not defined');
            return snap.ref.update({ status: 'error_config' });
        }

        try {
            const response = await axios.post(webhookUrl, {
                ...data,
                requestId: docId
            });

            if (response.status !== 200) {
                throw new Error(`N8N responded with status ${response.status}`);
            }

            // N8N should handle the completion update, or we can do it here if N8N just triggers
            // But the requirement says "Si n8n responde !== 200, actualizar el doc con status: 'error_sending'"
            // It implies if it IS 200, we might just leave it processing or let N8N update it?
            // Usually N8N would update it back to 'completed' with the invoice URL.
            // For now, we just handle the error case as requested.

            return null;

        } catch (error: any) {
            console.error('Error sending to N8N:', error);
            return snap.ref.update({
                status: 'error_sending',
                error: error.message
            });
        }
    });
