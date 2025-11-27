import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, appId, CLINIC_ID } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Patient } from '../types';
import { Trash2, Search, Edit2 } from 'lucide-react';
import { PatientModal } from '../components/modals/PatientModal';
import { usePatients } from '../hooks/usePatients';
import { toast } from 'sonner';

import { StaffProfile } from '../types';

interface PatientsViewProps {
    user: User;
    profile: StaffProfile | null;
}

export const PatientsView = ({ user, profile }: PatientsViewProps) => {
    const [showAdd, setShowAdd] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { patients } = usePatients(user);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (patient: Patient) => {
        if (confirm(`¿Estás seguro de que deseas eliminar a ${patient.name}?`)) {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'clinics', CLINIC_ID, 'patients', patient.id));
                toast.success(`Paciente ${patient.name} eliminado`);
            } catch (error) {
                console.error(error);
                toast.error('Error al eliminar el paciente');
            }
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
                <button onClick={() => setShowAdd(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm font-medium flex items-center gap-2">
                    <span>+ Nuevo Paciente</span>
                </button>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredPatients.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No se encontraron pacientes.
                    </div>
                ) : (
                    filteredPatients.map((p: Patient) => (
                        <div key={p.id} className="p-4 border-b last:border-b-0 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                                <div className="font-bold text-slate-800">{p.name}</div>
                                <div className="text-sm text-slate-500">{p.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingPatient(p)}
                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(p)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {(showAdd || editingPatient) && (
                <PatientModal
                    onClose={() => {
                        setShowAdd(false);
                        setEditingPatient(null);
                    }}
                    user={user}
                    profile={profile}
                    existingPatient={editingPatient}
                />
            )}
        </div>
    );
};
