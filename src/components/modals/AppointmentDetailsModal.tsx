import { Appointment } from '../../types';
import { ModalOverlay } from '../ui';
import { MapPin, Video, User as UserIcon, DollarSign, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { User } from 'firebase/auth';

interface AppointmentDetailsModalProps {
    appointment: Appointment;
    onClose: () => void;
    onEdit: () => void;
    user: User;
}

export const AppointmentDetailsModal = ({ appointment, onClose, onEdit, user }: AppointmentDetailsModalProps) => {
    const handleDelete = async () => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este turno?')) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', appointment.id));
            onClose();
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6 max-w-md w-full">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{appointment.patientName}</h2>
                        <p className="text-slate-500 text-sm">{appointment.patientEmail}</p>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={onEdit} className="p-2 text-teal-600 hover:bg-teal-50 rounded-full transition-colors" title="Editar">
                            <Edit2 size={20} />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-700">
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

                    <div className="flex items-center space-x-3 text-slate-700">
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

                    <div className="flex items-center space-x-3 text-slate-700">
                        <UserIcon size={20} className="text-slate-400" />
                        <div>
                            <div className="font-medium">Profesional</div>
                            <div className="text-sm text-slate-500">{appointment.professional || 'No asignado'}</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-700">
                        <DollarSign size={20} className="text-slate-400" />
                        <div>
                            <div className="font-medium">Honorarios</div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-slate-500">${appointment.price}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${appointment.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {appointment.isPaid ? 'PAGADO' : 'PENDIENTE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200">
                        Cerrar
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
