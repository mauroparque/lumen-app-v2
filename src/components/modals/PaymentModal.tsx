import React, { useState } from 'react';
import { Appointment, PaymentInput } from '../../types';
import { ModalOverlay } from '../ui';
import { DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDataActions } from '../../hooks/useDataActions';

interface PaymentModalProps {
    appointment: Appointment;
    onClose: () => void;
}

export const PaymentModal = ({ appointment, onClose }: PaymentModalProps) => {
    const [amount, setAmount] = useState(appointment.price?.toString() || '');
    const [concept, setConcept] = useState(`Sesión del ${new Date(appointment.date).toLocaleDateString()}`);
    const { addPayment } = useDataActions();

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const paymentData: PaymentInput = {
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                patientName: appointment.patientName,
                amount: parseFloat(amount),
                concept: concept,
                date: null // Will be set by service as Timestamp.now()
            };

            await addPayment(paymentData, appointment.id);
            toast.success('Pago registrado correctamente');
            onClose();
        } catch (error: unknown) {
            console.error(error);
            // Handle permission errors specifically
            if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
                toast.error('No tienes permisos para modificar este turno facturado');
            } else {
                toast.error('Error al registrar el pago');
            }
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-2 text-slate-800">Regularizar Sesión</h2>
                <p className="text-sm text-slate-500 mb-6">Esto registrará un cobro y marcará el turno como pagado.</p>

                <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Paciente:</span>
                        <span className="font-medium">{appointment.patientName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Fecha Original:</span>
                        <span className="font-medium">{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                </div>

                <form onSubmit={handlePay} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">Monto a cobrar</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input autoFocus type="number" className="w-full pl-9 p-2 border rounded-lg" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">Concepto</label>
                        <input className="w-full p-2 border rounded-lg" value={concept} onChange={e => setConcept(e.target.value)} />
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="text-slate-500 px-4 py-2">Cancelar</button>
                        <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 shadow-sm flex items-center">
                            <CheckCircle size={16} className="mr-2" /> Confirmar Pago
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};
