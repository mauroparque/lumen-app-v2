import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

export const triggerInvoiceGeneration = functions.firestore
    .document("artifacts/{appId}/clinics/{clinicId}/integrations/billing/queue/{docId}")
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const { docId } = context.params;

        // 1. Validar estado inicial
        if (data.status !== "pending") return null;

        // 2. Obtener configuración (Bypassing TypeScript error)
        // Usamos 'as any' porque TS marca config() como deprecated, pero funciona en runtime.
        const config = (functions.config as any)().billing;

        if (!config || !config.url || !config.secret) {
            console.error("Falta configuración de billing (url o secret)");
            return snap.ref.update({ status: "error_config" });
        }

        try {
            // 3. Marcar como procesando
            await snap.ref.update({ status: "processing" });

            // 4. Enviar a n8n con Header de Seguridad
            await axios.post(config.url, {
                queueDocId: docId,
                ...data
            }, {
                headers: { "x-lumen-secret": config.secret }
            });

            console.log(`Solicitud enviada a n8n para docId: ${docId}`);
            return null;

        } catch (error: any) {
            console.error("Error enviando a n8n:", error.message);
            return snap.ref.update({
                status: "error_sending",
                debugError: error.message
            });
        }
    });