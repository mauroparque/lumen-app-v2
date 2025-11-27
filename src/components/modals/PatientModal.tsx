import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { User } from 'firebase/auth';
import { ModalOverlay } from '../ui';
import { toast } from 'sonner';

interface PatientModalProps {
    onClose: () => void;
    user: User;
}

export const PatientModal = ({ onClose, user }: PatientModalProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'patients'), {
                name, email, phone
            });
            toast.success(`Paciente ${name} creado correctamente`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el paciente');
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Nuevo Paciente</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm mb-1">Nombre</label><input className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} required /></div>
                    <div><label className="block text-sm mb-1">Email</label><input className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label className="block text-sm mb-1">Teléfono</label><input className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};
