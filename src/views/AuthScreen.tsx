import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, appId } from '../lib/firebase';

export const AuthScreen = ({ onDemoLogin }: { onDemoLogin?: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Lazy Creation Logic
            const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName || 'Profesional Lumen',
                    createdAt: Timestamp.now(),
                    role: 'admin',
                    settings: { notifications: true }
                });
                console.log('Perfil creado en Firestore:', user.uid);
            }
        } catch (err: any) { setError(err.message); }
    };

    const handleDemo = async () => {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.warn("Firebase Auth failed (expected in preview), falling back to local demo mode.");
            if (onDemoLogin) onDemoLogin();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold text-teal-600 text-center mb-6">Lumen Acceso</h1>
                {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Contraseña" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">Ingresar</button>
                </form>
                <button onClick={handleDemo} className="w-full text-center text-xs text-teal-500 mt-2">Modo Demo</button>
            </div>
        </div>
    );
};
