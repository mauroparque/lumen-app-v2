import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ModalOverlay } from '../ui';
import { useDataActions } from '../../hooks/useDataActions';

interface PatientModalProps {
    onClose: () => void;
    user: User;
}

export const PatientModal = ({ onClose, user }: PatientModalProps) => {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        dni: '',
        email: '',
        phone: '',
        fee: '',
        preference: 'presencial' as 'presencial' | 'online',
        office: '',
        professional: ''
    });
    const { addPatient } = useDataActions(user);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        await addPatient({
            ...form,
            name: `${form.firstName} ${form.lastName}`.trim(),
            fee: form.fee ? parseFloat(form.fee) : 0
        });
        onClose();
    };

    return (
        <ModalOverlay onClose={onClose}>
            <form onSubmit={save} className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">Nuevo Paciente</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input required className="w-full p-2 border rounded" placeholder="Nombre" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                    <input required className="w-full p-2 border rounded" placeholder="Apellido" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <input className="w-full p-2 border rounded" placeholder="DNI" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input className="w-full p-2 border rounded" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <input className="w-full p-2 border rounded" placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input className="w-full p-2 border rounded" placeholder="Honorarios ($)" type="number" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} />
                    <select className="w-full p-2 border rounded" value={form.preference} onChange={(e: any) => setForm({ ...form, preference: e.target.value })}>
                        <option value="presencial">Presencial</option>
                        <option value="online">Online</option>
                    </select>
                </div>
                {form.preference === 'presencial' && (
                    <input className="w-full p-2 border rounded" placeholder="Consultorio (Dirección/Nombre)" value={form.office} onChange={e => setForm({ ...form, office: e.target.value })} />
                )}
                <input className="w-full p-2 border rounded" placeholder="Profesional Asignado" value={form.professional} onChange={e => setForm({ ...form, professional: e.target.value })} />

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                    <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700">Guardar</button>
                </div>
            </form>
        </ModalOverlay>
    );
};
