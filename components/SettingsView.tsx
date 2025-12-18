
import React, { useEffect, useState } from 'react';
import { User, ThemeSettings, AuditLog } from '../types';
import { getUsers, saveUser, checkUserEmailExists, getAuditLogs, saveTheme, logAction } from '../utils/storage';
import { 
    UserPlus, Palette, LogOut, Power, Maximize, Type, Users, Save, 
    ShieldAlert, Activity, CheckCircle2, UserCog, Key, Lock, Zap, 
    Coffee, RefreshCcw, Monitor, ChevronRight, Search, Trash2, Calendar, Clock
} from 'lucide-react';
import clsx from 'clsx';

interface SettingsViewProps {
    currentUser: User;
    currentTheme: ThemeSettings;
    onUpdateTheme: (theme: ThemeSettings) => void;
    onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, currentTheme, onUpdateTheme, onLogout }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [activeTab, setActiveTab] = useState<'general' | 'usuarios' | 'auditoria'>('general');
    
    // User Form State
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' });
    
    // License/API Activation State
    const [licenseKey, setLicenseKey] = useState(localStorage.getItem('furlong_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);

    useEffect(() => {
        loadUsers();
        loadAuditLogs();
    }, []);

    const loadUsers = async () => { const loadedUsers = await getUsers(); setUsers(loadedUsers); };
    const loadAuditLogs = async () => { const logs = await getAuditLogs(); setAuditLogs(logs); };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.email || !newUser.password) return;
        
        const user: User = {
            id: `user-${Date.now()}`,
            ...newUser,
            createdAt: Date.now(),
            isActive: true
        };
        
        await saveUser(user, currentUser);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        loadUsers();
        alert("Usuario creado exitosamente.");
    };

    const handleSaveAPIKey = () => {
        if (licenseKey.trim().length > 10) {
            localStorage.setItem('furlong_api_key', licenseKey);
            onUpdateTheme({ ...currentTheme, processingMode: 'fast' });
            setShowKeyInput(false);
            logAction(currentUser, 'SETTINGS', 'API', 'Activación de Modo Industrial con API Key');
            alert("¡Modo Industrial Activado!");
        } else {
            alert("Clave de API no válida.");
        }
    };

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header section matches screenshots */}
            <div className="mb-2">
                <h3 className="text-xl font-bold text-slate-800 brand-font">Configuración del Sistema</h3>
                <p className="text-slate-500 text-sm">Gestión avanzada de plataforma, accesos y auditoría de seguridad.</p>
            </div>

            {/* Tab Navigation - Screenshot Style */}
            <div className="flex bg-[#F1F3F5] p-1 rounded-xl w-fit mb-8">
                {['GENERAL', 'USUARIOS', 'AUDITORÍA'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase() as any)}
                        className={clsx(
                            "px-8 py-2 text-[11px] font-black rounded-lg transition-all tracking-widest",
                            activeTab === tab.toLowerCase() ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Procesamiento */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-6">
                            <Zap className="text-furlong-red" size={18} /> Optimización de Procesamiento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Modo Estándar */}
                            <div 
                                className={clsx(
                                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center",
                                    currentTheme.processingMode !== 'fast' ? "border-green-500 bg-white shadow-md" : "border-slate-100 bg-slate-50 opacity-60"
                                )}
                                onClick={() => onUpdateTheme({...currentTheme, processingMode: 'free'})}
                            >
                                <div className="p-3 bg-green-50 rounded-xl text-green-500">
                                    <Coffee size={24} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-800 text-sm">Modo Estándar</h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Pausa de 5s entre archivos. Optimizado para evitar límites de tasa en capas gratuitas.</p>
                                </div>
                            </div>
                            
                            {/* Modo Industrial */}
                            <div 
                                className={clsx(
                                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center relative overflow-hidden",
                                    currentTheme.processingMode === 'fast' ? "border-furlong-red bg-white shadow-md" : "border-slate-100 bg-slate-50"
                                )}
                                onClick={() => !licenseKey ? setShowKeyInput(true) : onUpdateTheme({...currentTheme, processingMode: 'fast'})}
                            >
                                <div className="p-3 bg-red-50 rounded-xl text-furlong-red">
                                    <Zap size={24} className="fill-current" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-800 text-sm">Modo Industrial</h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Procesamiento ultra-rápido (0.5s). Ideal para despliegues con alta carga de trabajo.</p>
                                </div>
                                {!licenseKey && <div className="absolute top-2 right-2"><Lock size={12} className="text-slate-300"/></div>}
                            </div>
                        </div>

                        {/* API Key Inline Input */}
                        {showKeyInput && (
                            <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-700 animate-in zoom-in-95">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Activación de Licencia / API Key</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="password" 
                                        value={licenseKey}
                                        onChange={(e) => setLicenseKey(e.target.value)}
                                        placeholder="Ingrese clave de API Google Gemini..."
                                        className="flex-1 bg-slate-800 border-none text-white px-4 py-2 rounded-lg text-xs"
                                    />
                                    <button onClick={handleSaveAPIKey} className="bg-furlong-red text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">Activar</button>
                                    <button onClick={() => setShowKeyInput(false)} className="text-slate-400 px-2 py-2 text-xs">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interfaz */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-6">
                            <Palette className="text-furlong-red" size={18} /> Preferencias de Interfaz
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tipografía Global</p>
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                            {['Inter', 'Roboto', 'Mono'].map(font => (
                                <button
                                    key={font}
                                    onClick={() => onUpdateTheme({ ...currentTheme, fontFamily: font.toLowerCase() as any })}
                                    className={clsx(
                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                        currentTheme.fontFamily === font.toLowerCase() ? "bg-[#121212] text-white shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sesion */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-6">
                            <Power className="text-furlong-red" size={18} /> Sesión y Entorno
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={handleToggleFullscreen} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                                <Maximize size={20} className="text-slate-400 mb-2" />
                                <span className="text-[10px] font-bold text-slate-600">Pantalla Completa</span>
                            </button>
                            <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                                <RefreshCcw size={20} className="text-slate-400 mb-2" />
                                <span className="text-[10px] font-bold text-slate-600">Reiniciar</span>
                            </button>
                        </div>
                        <button 
                            onClick={onLogout}
                            className="w-full py-4 bg-furlong-red text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={16} /> Cerrar Sesión Segura
                        </button>
                    </div>
                </div>
            )}

            {/* USUARIOS TAB */}
            {activeTab === 'usuarios' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Alta de Usuario */}
                    <div className="lg:col-span-3 bg-white p-8 rounded-2xl border-t-4 border-t-furlong-red shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-red-50 text-furlong-red rounded-xl flex items-center justify-center">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Alta de Usuario</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Credenciales maestras de acceso.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                                <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ej. Ricardo Furlong" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-furlong-red outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="usuario@transportefurlong.com.ar" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-furlong-red outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contraseña</label>
                                    <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-furlong-red outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Privilegios</label>
                                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="user">USER (Operativo)</option>
                                        <option value="admin">ADMIN (Control Total)</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-furlong-red text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
                                <Save size={16}/> Crear Usuario Seguro
                            </button>
                        </form>
                    </div>

                    {/* Lista de Usuarios */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm h-fit">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-6 uppercase tracking-tight">
                            <Users className="text-slate-400" size={18} /> Usuarios Activos
                        </h4>
                        <div className="bg-[#12122b] rounded-xl overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-[#0a0a1a] text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3 text-right">Rol</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/5">
                                            <td className="px-4 py-3">
                                                <p className="text-white text-xs font-bold">{u.name}</p>
                                                <p className="text-[9px] text-slate-400">{u.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                                    u.role === 'admin' ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                                                )}>{u.role}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            )}

            {/* AUDITORIA TAB */}
            {activeTab === 'auditoria' && (
                <div className="bg-white rounded-2xl border-t-4 border-t-furlong-red shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 text-furlong-red rounded-xl flex items-center justify-center">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Registro de Auditoría</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Últimas 100 acciones de seguridad registradas.</p>
                            </div>
                        </div>
                        <button onClick={loadAuditLogs} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                            <RefreshCcw size={14}/> Refrescar
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-[#121212] text-white text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Fecha / Hora</th>
                                    <th className="px-8 py-5">Usuario Operador</th>
                                    <th className="px-8 py-5 text-center">Acción</th>
                                    <th className="px-8 py-5">Módulo</th>
                                    <th className="px-8 py-5">Detalle Técnico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4">
                                            <p className="text-slate-800 font-bold text-sm">{new Date(log.timestamp).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                    {log.userName.substring(0,2)}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{log.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg border border-blue-100 uppercase tracking-tighter">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                            {log.module}
                                        </td>
                                        <td className="px-8 py-4 text-xs text-slate-500 italic">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </div>
            )}
        </div>
    );
};
