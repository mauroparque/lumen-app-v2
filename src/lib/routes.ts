import { appId, CLINIC_ID } from './firebase';

export const PATIENTS_COLLECTION = `artifacts/${appId}/clinics/${CLINIC_ID}/patients`;
export const APPOINTMENTS_COLLECTION = `artifacts/${appId}/clinics/${CLINIC_ID}/appointments`;
export const PAYMENTS_COLLECTION = `artifacts/${appId}/clinics/${CLINIC_ID}/payments`;
export const BILLING_QUEUE_COLLECTION = `artifacts/${appId}/clinics/${CLINIC_ID}/integrations/billing/queue`;
