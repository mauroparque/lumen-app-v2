import { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { ArrowLeft, FileText, ListTodo, Calendar, Phone, Mail, MessageCircle, Baby } from 'lucide-react';
import { View } from '../types';
import { usePatients } from '../hooks/usePatients';
import { useData } from '../context/DataContext';
import { StaffProfile } from '../types';
import { formatPhoneNumber } from '../lib/utils';

interface PatientHistoryViewProps {
    user: User;
    profile: StaffProfile | null;
    patientId: string | null;
    setCurrentView: (view: View) => void;
}

const calculateAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const PatientHistoryView = ({ user, patientId, setCurrentView }: PatientHistoryViewProps) => {
    const [activeTab, setActiveTab] = useState<'history' | 'tasks'>('history');
    const { patients } = usePatients(user);
    const { appointments } = useData();

    const patient = useMemo(() =>
        patients.find(p => p.id === patientId),
        [patients, patientId]
    );

    // Get all appointments for this patient
    const patientAppointments = useMemo(() =>
        appointments
            .filter(a => a.patientId === patientId)
            .sort((a, b) => b.date.localeCompare(a.date)),
        [appointments, patientId]
    );

    // Filter completed appointments (with notes potential)
    const completedAppointments = useMemo(() =>
        patientAppointments.filter(a => a.status === 'completado' || new Date(a.date) < new Date()),
        [patientAppointments]
    );

    if (!patient) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <button
                    onClick={() => setCurrentView('patients')}
                    className="flex items-center gap-2 text-slate-600 hover:text-teal-600 mb-6"
                >
                    <ArrowLeft size={20} />
                    Volver a Pacientes
                </button>
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
                    Paciente no encontrado.
                </div>
            </div>
        );
    }

    const age = calculateAge(patient.birthDate);
    const isChild = age !== null && age < 18;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <button
                onClick={() => setCurrentView('patients')}
                className="flex items-center gap-2 text-slate-600 hover:text-teal-600 mb-6 transition-colors"
            >
                <ArrowLeft size={20} />
                Volver a Pacientes
            </button>

            {/* Patient Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${isChild ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'
                            }`}>
                            {isChild ? <Baby size={28} /> : patient.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {age !== null && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isChild ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {age} años {isChild && '(Menor)'}
                                    </span>
                                )}
                                {patient.patientSource && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${patient.patientSource === 'psique'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-teal-100 text-teal-700'
                                        }`}>
                                        {patient.patientSource === 'psique' ? 'Psique' : 'Particular'}
                                    </span>
                                )}
                                {patient.isActive ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                        Activo
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                        {patient.dischargeType === 'clinical' ? 'Alta Clínica' :
                                            patient.dischargeType === 'dropout' ? 'Abandono' : 'Inactivo'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex items-center gap-2">
                        {patient.phone && (
                            <>
                                <a
                                    href={`tel:${patient.phone}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                >
                                    <Phone size={16} />
                                    <span className="text-sm">{patient.phone}</span>
                                </a>
                                <a
                                    href={`https://wa.me/${formatPhoneNumber(patient.phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                                    title="WhatsApp"
                                >
                                    <MessageCircle size={18} />
                                </a>
                            </>
                        )}
                        {patient.email && (
                            <a
                                href={`mailto:${patient.email}`}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                            >
                                <Mail size={16} />
                                <span className="text-sm truncate max-w-[150px]">{patient.email}</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Child Contact Info */}
                {isChild && patient.contactName && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="text-sm text-slate-500">
                            <span className="font-medium">Contacto:</span> {patient.contactName}
                            {patient.contactRelationship && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                                    {patient.contactRelationship === 'otro'
                                        ? patient.contactRelationshipOther
                                        : patient.contactRelationship.charAt(0).toUpperCase() + patient.contactRelationship.slice(1)}
                                </span>
                            )}
                            {patient.contactPhone && (
                                <span className="ml-2">· {patient.contactPhone}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-xs text-slate-500">Profesional</div>
                        <div className="font-medium text-slate-700">{patient.professional || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Admisión</div>
                        <div className="font-medium text-slate-700">
                            {patient.admissionDate ? formatDate(patient.admissionDate) : '-'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Sesiones Totales</div>
                        <div className="font-medium text-slate-700">{completedAppointments.length}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Honorarios</div>
                        <div className="font-medium text-slate-700">
                            {patient.fee ? `$${patient.fee.toLocaleString()}` : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <FileText size={16} />
                    Historia Clínica
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tasks'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <ListTodo size={16} />
                    Tareas
                </button>
            </div>

            {/* Content */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {completedAppointments.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
                            <Calendar size={48} className="mx-auto mb-4 text-slate-200" />
                            No hay sesiones registradas para este paciente.
                        </div>
                    ) : (
                        completedAppointments.map(appointment => (
                            <div
                                key={appointment.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:border-teal-200 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-medium text-slate-800">
                                            {formatDate(appointment.date)}
                                        </div>
                                        <span className="text-slate-400">·</span>
                                        <div className="text-sm text-slate-500">{appointment.time}hs</div>
                                        {appointment.hasNotes && (
                                            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 rounded text-xs font-medium">
                                                Con notas
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {appointment.isPaid ? (
                                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium">
                                                Pagado
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium">
                                                Pendiente
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600">
                                    {appointment.consultationType || 'Consulta'} · {appointment.type === 'online' ? 'Online' : 'Presencial'}
                                    {appointment.professional && ` · ${appointment.professional}`}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
                    <ListTodo size={48} className="mx-auto mb-4 text-slate-200" />
                    Las tareas pendientes se mostrarán aquí.
                    <p className="text-sm mt-2">Funcionalidad en desarrollo.</p>
                </div>
            )}
        </div>
    );
};
