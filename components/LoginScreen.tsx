
import React, { useState } from 'react';
import { Truck, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { getUsers } from '../utils/storage';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    themeColor: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
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
            setError('Credenciales inválidas. Verifique sus datos.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative bg-slate-900">
            {/* Background Image with Overlay */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")', // Logistics/Truck image
                }}
            >
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-5xl h-auto md:h-[600px] flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl m-4">
                
                {/* Left Side: Brand Area */}
                <div className="w-full md:w-1/2 bg-gradient-to-br from-furlong-dark to-slate-800 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-furlong-red rounded-lg shadow-lg">
                                <Truck size={32} className="text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-wider brand-font">FURLONG</span>
                        </div>
                        <h1 className="text-4xl font-extrabold mb-4 leading-tight brand-font">
                            Logística Integral <br/>
                            <span className="text-furlong-red">Inteligente</span>
                        </h1>
                        <p className="text-slate-300 text-lg max-w-sm">
                            Gestión centralizada de flota, gastos y documentación para el transporte moderno.
                        </p>
                    </div>

                    <div className="relative z-10 mt-12 md:mt-0">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <ShieldCheck size={16} className="text-furlong-red" />
                            <span>Plataforma Segura v2.1</span>
                        </div>
                    </div>

                    {/* Decorative Circles */}
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-furlong-red/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-12 right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 brand-font">Bienvenido</h2>
                        <p className="text-slate-500">Ingrese sus credenciales corporativas.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Usuario / Correo</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-furlong-red/20 focus:border-furlong-red transition-all"
                                placeholder="usuario@transportefurlong.com.ar"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Contraseña</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-furlong-red/20 focus:border-furlong-red transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-furlong-red text-sm bg-red-50 p-4 rounded-lg border border-red-100 animate-in fade-in">
                                <AlertCircle size={18} className="flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-4 px-4 bg-furlong-red hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                        >
                            <LogIn size={20} />
                            Iniciar Sesión
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400">
                            Soporte Técnico: sistemas@transportefurlong.com.ar <br/>
                            <span className="opacity-50">Acceso Admin: admin@transportefurlong.com.ar / admin</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
