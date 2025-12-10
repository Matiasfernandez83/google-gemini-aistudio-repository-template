
import React, { useState } from 'react';
import { Truck, LogIn, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { getUsers } from '../utils/storage';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    themeColor: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, themeColor }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const users = await getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            onLogin(user);
        } else {
            setError('Credenciales inválidas. Intente nuevamente.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className={`p-8 text-center bg-${themeColor}-600`}>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                        <Truck className="text-white" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">ERP Logística Integral</h1>
                    <p className="text-white/80">Plataforma Inteligente de Gestión</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de Correo</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="ejemplo@logisticaintegral.com.ar"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className={`w-full py-3 px-4 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                        >
                            <LogIn size={20} />
                            Ingresar al Sistema
                        </button>
                    </form>
                    
                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">
                            Acceso restringido solo a personal autorizado.<br/>
                            Credenciales por defecto: admin@logisticaintegral.com.ar / admin
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
