import { useState, useMemo } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Appointment, Patient } from '../types';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, CheckCircle, Trash2 } from 'lucide-react';
import { AppointmentModal } from '../components/modals/AppointmentModal';

interface CalendarViewProps {
    appointments: Appointment[];
    patients: Patient[];
    user: User;
}

export const CalendarView = ({ appointments, patients, user }: CalendarViewProps) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
    const weekDays = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    // Extract unique professionals
    const professionals = useMemo(() => {
        const pros = new Set<string>();
        appointments.forEach(app => {
            if (app.professional) pros.add(app.professional);
        });
        return Array.from(pros);
    }, [appointments]);

    const filteredAppointments = useMemo(() => {
        if (selectedProfessional === 'all') return appointments;
        return appointments.filter(app => app.professional === selectedProfessional);
    }, [appointments, selectedProfessional]);

    // OPTIMIZACIÓN: Indexar citas por fecha-hora para acceso O(1)
    const appointmentsMap = useMemo(() => {
        const map = new Map<string, Appointment>();
        filteredAppointments.forEach(app => {
            // Clave: YYYY-MM-DD-HH:mm
            // Normalizar la hora de la cita a bloques de 15 min si es necesario, 
            // pero asumimos que el input guarda "HH:mm"
            const key = `${app.date}-${app.time}`;
            map.set(key, app);
        });
        return map;
    }, [filteredAppointments]);

    const getAppt = (day: Date, hour: number, minute: number) => {
        const dStr = day.toISOString().split('T')[0];
        const hStr = hour < 10 ? `0${hour}` : `${hour}`;
        const mStr = minute < 10 ? `0${minute}` : `${minute}`;
        return appointmentsMap.get(`${dStr}-${hStr}:${mStr}`);
    };

    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20
    const minutes = [0, 15, 30, 45];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>

                <div className="flex items-center space-x-4">
                    {professionals.length > 0 && (
                        <select
                            className="p-2 border rounded-lg bg-white text-sm"
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                        >
                            <option value="all">Todos los profesionales</option>
                            {professionals.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    )}

                    <div className="flex items-center border rounded-lg bg-white">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))} className="p-2 hover:bg-slate-50"><ChevronLeft size={18} /></button>
                        <span className="px-4 text-sm font-medium min-w-[120px] text-center">
                            {weekDays[0].getDate()} - {weekDays[4].getDate()} {weekDays[4].toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))} className="p-2 hover:bg-slate-50"><ChevronRight size={18} /></button>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm hover:bg-teal-700">
                        <Plus size={18} /> <span>Turno</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-6 border-b bg-slate-50">
                    <div className="p-3 text-center text-xs text-slate-400 font-bold border-r">HORA</div>
                    {weekDays.map((d, i) => (
                        <div key={i} className={`p-3 text-center border-r ${d.toDateString() === new Date().toDateString() ? 'bg-teal-50' : ''}`}>
                            <div className="text-xs text-slate-500 uppercase">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                            <div className="font-bold">{d.getDate()}</div>
                        </div>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {hours.map(hour => (
                        <div key={hour} className="contents">
                            {minutes.map((minute) => (
                                <div key={`${hour}-${minute}`} className="grid grid-cols-6 min-h-[40px] border-b last:border-0">
                                    <div className={`p-1 text-[10px] text-slate-400 text-center border-r flex items-start justify-center ${minute === 0 ? 'font-bold text-slate-600' : ''}`}>
                                        {minute === 0 ? `${hour}:00` : `:${minute}`}
                                    </div>
                                    {weekDays.map((day, i) => {
                                        const appt = getAppt(day, hour, minute);
                                        return (
                                            <div key={i} className="border-r p-0.5 relative group hover:bg-slate-50/50">
                                                {appt ? (
                                                    <div className={`w-full h-full rounded p-1 text-[10px] border-l-2 shadow-sm cursor-pointer relative overflow-hidden
                                                        ${appt.type === 'online' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-teal-50 border-teal-300 text-teal-800'}`}
                                                        style={{ minHeight: '36px' }}
                                                    >
                                                        <div className="font-bold truncate leading-tight">{appt.patientName}</div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <div className="flex items-center space-x-1 opacity-80 scale-90 origin-left">
                                                                {appt.type === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                                                                <span className="truncate max-w-[40px]">{appt.professional || 'General'}</span>
                                                            </div>
                                                            {appt.isPaid ? (
                                                                <CheckCircle size={10} className="text-green-600" />
                                                            ) : (
                                                                <span className="text-[8px] font-bold text-red-500">IMPAGO</span>
                                                            )}
                                                        </div>
                                                        {appt.meetLink && (
                                                            <a href={appt.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="block mt-1 text-center bg-blue-100 text-blue-700 rounded py-0.5 hover:bg-blue-200">
                                                                Unirse
                                                            </a>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', appt.id)); }} className="absolute top-0.5 right-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setShowModal(true)} className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-teal-300 hover:text-teal-600"><Plus size={12} /></button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            {showModal && <AppointmentModal onClose={() => setShowModal(false)} patients={patients} user={user} />}
        </div>
    );
};
