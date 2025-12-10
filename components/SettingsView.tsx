
import React, { useEffect, useState } from 'react';
import { User, ThemeSettings, AuditLog } from '../types';
import { getUsers, saveUser, checkUserEmailExists, getAuditLogs } from '../utils/storage';
import { UserPlus, Palette, LogOut, Power, Maximize, Type, Users, Save, Zap, Coffee, ShieldAlert, Activity } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'audit'>('general');
    
    // User Form State
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as 'admin'|'user' });
    const [formError, setFormError] = useState<string | null>(null);

    // Theme options
    const colors: ThemeSettings['primaryColor'][] = ['blue', 'green', 'purple', 'slate', 'orange'];
    const fonts: ThemeSettings['fontFamily'][] = ['inter', 'roboto', 'mono'];

    useEffect(() => {
        if (currentUser.role === 'admin') {
            loadUsers();
            loadAuditLogs();
        }
    }, [currentUser]);

    const loadUsers = async () => {
        const loadedUsers = await getUsers();
        setUsers(loadedUsers);
    };

    const loadAuditLogs = async () => {
        const logs = await getAuditLogs();
        setAuditLogs(logs.slice(0, 100)); // Show last 100
    };

    const validateEmail = (email: string) => {
        return String(email).toLowerCase().match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // Validation 1: Empty Fields
        if (!newUser.name || !newUser.email || !newUser.password) {
            setFormError("Todos los campos son obligatorios.");
            return;
        }

        // Validation 2: Email Format
        if (!validateEmail(newUser.email)) {
            setFormError("El formato del correo electrónico es inválido.");
            return;
        }

        // Validation 3: Password Strength
        if (newUser.password.length < 6) {
            setFormError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // Validation 4: Unique Email
        const exists = await checkUserEmailExists(newUser.email);
        if (exists) {
            setFormError("Este correo electrónico ya está registrado.");
            return;
        }

        const userToAdd: User = {
            id: `user-${Date.now()}`,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            createdAt: Date.now(),
            isActive: true
        };

        await saveUser(userToAdd, currentUser);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        await loadUsers();
        await loadAuditLogs();
        alert('Usuario creado correctamente');
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
                    <p className="text-slate-500 text-sm">Gestiona la plataforma, usuarios y auditoría.</p>
                </div>
                {currentUser.role === 'admin' && (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('general')}
                            className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'general' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >General</button>
                        <button 
                             onClick={() => setActiveTab('users')}
                             className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'users' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >Usuarios</button>
                        <button 
                             onClick={() => setActiveTab('audit')}
                             className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'audit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >Auditoría</button>
                    </div>
                )}
            </div>

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* COSTOS / API */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className={`text-${currentTheme.primaryColor}-500`} />
                            Optimización de Costos y API
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                                onClick={() => onUpdateTheme({ ...currentTheme, processingMode: 'free' })}
                                className={clsx(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                                    (!currentTheme.processingMode || currentTheme.processingMode === 'free') ? "border-green-500 bg-green-50" : "border-slate-200 bg-white hover:border-green-200"
                                )}
                            >
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Coffee size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Modo Gratuito</h4>
                                    <p className="text-xs text-slate-500 mt-1">Delay de 5s entre archivos. Ideal para evitar límites de la API gratuita.</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => onUpdateTheme({ ...currentTheme, processingMode: 'fast' })}
                                className={clsx(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                                    currentTheme.processingMode === 'fast' ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"
                                )}
                            >
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Zap size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Modo Rápido</h4>
                                    <p className="text-xs text-slate-500 mt-1">Velocidad máxima (0.5s). Requiere cuenta de facturación en Google Cloud.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* APARIENCIA */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Palette className={`text-${currentTheme.primaryColor}-500`} />
                            Personalización Visual
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Color de Acento</label>
                                <div className="flex gap-4">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => onUpdateTheme({ ...currentTheme, primaryColor: color })}
                                            className={clsx(
                                                "w-10 h-10 rounded-full transition-all border-2",
                                                `bg-${color}-500`,
                                                currentTheme.primaryColor === color ? "border-slate-900 scale-110 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                    <Type size={16}/> Tipografía
                                </label>
                                <div className="flex gap-3">
                                    {fonts.map(font => (
                                        <button
                                            key={font}
                                            onClick={() => onUpdateTheme({ ...currentTheme, fontFamily: font })}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize",
                                                currentTheme.fontFamily === font ? `bg-${currentTheme.primaryColor}-50 text-${currentTheme.primaryColor}-700 border-${currentTheme.primaryColor}-200` : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            )}
                                            style={{ fontFamily: font === 'mono' ? 'monospace' : font === 'roboto' ? 'Roboto, sans-serif' : 'Inter, sans-serif' }}
                                        >
                                            {font}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SESIÓN */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Power className={`text-${currentTheme.primaryColor}-500`} />
                            Control de Sesión
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={toggleFullScreen} className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                <Maximize className="text-slate-600 mb-2" />
                                <span className="text-sm font-medium text-slate-700">Pantalla Completa</span>
                            </button>
                            <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                <LogOut className="text-slate-600 mb-2 rotate-180" />
                                <span className="text-sm font-medium text-slate-700">Reiniciar Sistema</span>
                            </button>
                            <button onClick={onLogout} className="col-span-2 flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-red-700 font-bold">
                                <LogOut size={20} />
                                Cerrar Sesión Segura
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && currentUser.role === 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UserPlus size={18} className="text-blue-500"/> Nuevo Usuario
                        </h4>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    className="w-full mt-1 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    className="w-full mt-1 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                    <input 
                                        type="text" 
                                        className="w-full mt-1 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newUser.password}
                                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        placeholder="Min. 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Rol / Permisos</label>
                                    <select 
                                        className="w-full mt-1 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newUser.role}
                                        onChange={e => setNewUser({...newUser, role: e.target.value as 'admin'|'user'})}
                                    >
                                        <option value="user">Usuario (Lectura/Carga)</option>
                                        <option value="admin">Administrador (Total)</option>
                                    </select>
                                </div>
                            </div>

                            {formError && (
                                <div className="text-red-600 text-sm bg-red-50 p-2 rounded flex items-center gap-2">
                                    <ShieldAlert size={14}/> {formError}
                                </div>
                            )}

                            <button className={`w-full py-2 bg-${currentTheme.primaryColor}-600 text-white rounded-lg font-bold hover:bg-${currentTheme.primaryColor}-700 flex items-center justify-center gap-2`}>
                                <Save size={16} /> Crear Usuario Seguro
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-slate-500"/> Usuarios Activos
                        </h4>
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-2">Usuario</th>
                                        <th className="px-4 py-2">Rol</th>
                                        <th className="px-4 py-2 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-slate-900">{u.name}</p>
                                                <p className="text-xs text-slate-500">{u.email}</p>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={clsx("px-2 py-0.5 rounded text-xs uppercase font-bold", u.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600")}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <span className="text-green-600 text-xs font-bold">Activo</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && currentUser.role === 'admin' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <Activity size={18} className="text-orange-500"/> Registro de Auditoría (Últimos 100)
                        </h4>
                        <button onClick={loadAuditLogs} className="text-sm text-blue-600 hover:underline">Refrescar</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-slate-200 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Fecha/Hora</th>
                                    <th className="px-4 py-3">Usuario</th>
                                    <th className="px-4 py-3">Acción</th>
                                    <th className="px-4 py-3">Módulo</th>
                                    <th className="px-4 py-3 w-1/3">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-xs">
                                {auditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-500">
                                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-2 font-bold text-slate-700">{log.userName}</td>
                                        <td className="px-4 py-2">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded",
                                                log.action === 'DELETE' ? "bg-red-100 text-red-700" :
                                                log.action === 'CREATE' ? "bg-green-100 text-green-700" :
                                                log.action === 'LOGIN' ? "bg-blue-100 text-blue-700" :
                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">{log.module}</td>
                                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs" title={log.details}>
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
