import { deleteDoc, doc } from 'firebase/firestore';
import { db, appId, CLINIC_ID } from '../../lib/firebase';
import { User } from 'firebase/auth';
import { Appointment } from '../../types';
import { ModalOverlay } from '../ui';
import { Edit2, Trash2, Video, MapPin, CheckCircle, FileText, User as UserIcon, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { requestInvoice } from '../../lib/queue';

interface AppointmentDetailsModalProps {
    appointment: Appointment;
    onClose: () => void;
    onEdit: () => void;
    user: User;
}

export const AppointmentDetailsModal = ({ appointment, onClose, onEdit, user }: AppointmentDetailsModalProps) => {
    const handleDelete = async () => {
        if (confirm('¿Estás seguro de que deseas eliminar este turno?')) {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'clinics', CLINIC_ID, 'appointments', appointment.id));
                toast.success('Turno eliminado');
                onClose();
            } catch (error) {
                console.error(error);
                toast.error('Error al eliminar el turno');
            }
        }
    };

    const handleRequestInvoice = async () => {
        toast.promise(requestInvoice(appointment.id, user), {
            loading: 'Solicitando factura...',
            success: 'Solicitud enviada a facturación',
            error: 'Error al solicitar factura'
        });
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6 w-full max-w-md bg-white rounded-xl shadow-xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{appointment.patientName}</h2>
                        <p className="text-slate-500 text-sm">{appointment.patientEmail}</p>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Editar">
                            <Edit2 size={20} />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center space-x-3 text-slate-600">
                        <CalendarIcon size={20} className="text-slate-400" />
                        <div>
                            <div className="font-medium">Fecha y Hora</div>
                            <div className="text-sm text-slate-500">
                                {new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                <br />
                                {appointment.time} hs ({appointment.duration} min)
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-600">
                        {appointment.type === 'online' ? <Video size={20} className="text-slate-400" /> : <MapPin size={20} className="text-slate-400" />}
                        <div>
                            <div className="font-medium">Modalidad</div>
                            <div className="text-sm text-slate-500 capitalize">{appointment.type}</div>
                            {appointment.type === 'online' && appointment.meetLink && (
                                <a href={appointment.meetLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline block">
                                    Unirse a la reunión
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-600">
                        <UserIcon size={20} className="text-slate-400" />
                        <div>
                            <div className="font-medium">Profesional</div>
                            <div className="text-sm text-slate-500">{appointment.professional || 'No asignado'}</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-600">
                        <DollarSign size={20} className="text-slate-400" />
                        <div>
                            <div className="font-medium">Honorarios</div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg">${appointment.price}</span>
                                {appointment.isPaid ? (
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center">
                                        <CheckCircle size={12} className="mr-1" /> PAGADO
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">PENDIENTE</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col space-y-3">
                    {appointment.isPaid && (
                        <button
                            onClick={handleRequestInvoice}
                            className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium flex items-center justify-center transition-colors"
                        >
                            <FileText size={18} className="mr-2" /> Solicitar Factura
                        </button>
                    )}
                    <button onClick={onClose} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
