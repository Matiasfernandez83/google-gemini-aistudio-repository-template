
import React, { useEffect, useState } from 'react';
import { User, ThemeSettings, AuditLog } from '../types';
import { getUsers, saveUser, checkUserEmailExists, getAuditLogs } from '../utils/storage';
import { UserPlus, Palette, LogOut, Power, Maximize, Type, Users, Save, Zap, Coffee, ShieldAlert, Activity, CheckCircle2, UserCog, Key, Lock, Shield } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'users' | 'audit'>('general');
    
    // User Form State (New User)
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as 'admin'|'user' });
    const [formError, setFormError] = useState<string | null>(null);

    // Profile State (Change Own Password)
    const [profilePass, setProfilePass] = useState({ current: '', new: '', confirm: '' });
    const [profileMsg, setProfileMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

    // Admin Reset Password State
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [adminNewPass, setAdminNewPass] = useState('');

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

        if (!newUser.name || !newUser.email || !newUser.password) {
            setFormError("Todos los campos son obligatorios.");
            return;
        }
        if (!validateEmail(newUser.email)) {
            setFormError("El formato del correo electrónico es inválido.");
            return;
        }
        if (newUser.password.length < 6) {
            setFormError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
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

    const handleChangeOwnPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);

        if (profilePass.new.length < 6) {
            setProfileMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        if (profilePass.new !== profilePass.confirm) {
            setProfileMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
            return;
        }

        // Verify current password (simple check against current session object, in real app check DB)
        if (profilePass.current !== currentUser.password) {
             setProfileMsg({ type: 'error', text: 'La contraseña actual es incorrecta.' });
             return;
        }

        const updatedUser = { ...currentUser, password: profilePass.new };
        await saveUser(updatedUser, currentUser);
        
        // Update local session user logic would happen in App.tsx via a callback, 
        // but since we rely on currentUser prop, we just saved to DB. 
        // Ideally we force a re-login or update parent state.
        // For this local-first app, updating DB is enough for next login.
        
        setProfileMsg({ type: 'success', text: 'Contraseña actualizada. Úsala en tu próximo inicio de sesión.' });
        setProfilePass({ current: '', new: '', confirm: '' });
    };

    const handleAdminResetPassword = async () => {
        if (!resetTarget || !adminNewPass) return;
        
        const updatedUser = { ...resetTarget, password: adminNewPass };
        await saveUser(updatedUser, currentUser); // currentUser is the admin performing the action
        
        await loadUsers(); // Refresh list
        setResetTarget(null);
        setAdminNewPass('');
        alert(`Contraseña restablecida para ${updatedUser.name}`);
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
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap", activeTab === 'general' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >General</button>
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1", activeTab === 'profile' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    ><UserCog size={14}/> Mi Perfil</button>
                    {currentUser.role === 'admin' && (
                        <>
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap", activeTab === 'users' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >Usuarios</button>
                            <button 
                                onClick={() => setActiveTab('audit')}
                                className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap", activeTab === 'audit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >Auditoría</button>
                        </>
                    )}
                </div>
            </div>

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* COSTOS / API */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className={`text-${currentTheme.primaryColor}-500`} />
                            Velocidad de Procesamiento
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Selecciona cómo quieres que trabaje la IA. Si ya configuraste tu clave de Google Cloud, elige la opción derecha.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* OPCIÓN GRATIS */}
                            <div 
                                onClick={() => onUpdateTheme({ ...currentTheme, processingMode: 'free' })}
                                className={clsx(
                                    "cursor-pointer p-6 rounded-xl border-2 transition-all relative",
                                    (!currentTheme.processingMode || currentTheme.processingMode === 'free') ? "border-slate-400 bg-slate-50" : "border-slate-100 bg-white hover:border-slate-200"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-slate-200 text-slate-600 rounded-lg"><Coffee size={24} /></div>
                                    <h4 className="font-bold text-slate-800">Modo Lento (Gratis)</h4>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Espera 6 segundos entre cada archivo. Ideal si no has configurado tarjetas en Google.
                                </p>
                                {(!currentTheme.processingMode || currentTheme.processingMode === 'free') && (
                                    <div className="absolute top-4 right-4 text-slate-400"><CheckCircle2 size={24}/></div>
                                )}
                            </div>

                            {/* OPCIÓN PAGA / RÁPIDA */}
                            <div 
                                onClick={() => onUpdateTheme({ ...currentTheme, processingMode: 'fast' })}
                                className={clsx(
                                    "cursor-pointer p-6 rounded-xl border-2 transition-all relative",
                                    currentTheme.processingMode === 'fast' ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-lg" : "border-slate-200 bg-white hover:border-blue-300"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Zap size={24} /></div>
                                    <h4 className="font-bold text-slate-800">Modo Rápido (Cloud)</h4>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    <strong>Velocidad Máxima.</strong> Procesa todo al instante. Requiere que hayas puesto la API Key de tu cuenta Google Cloud.
                                </p>
                                {currentTheme.processingMode === 'fast' && (
                                    <div className="absolute top-4 right-4 text-blue-600"><CheckCircle2 size={24}/></div>
                                )}
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

            {/* PROFILE TAB (Change Own Password) - ESTILOS MEJORADOS */}
            {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
                            <div className={`w-16 h-16 rounded-full bg-${currentTheme.primaryColor}-100 flex items-center justify-center text-${currentTheme.primaryColor}-600 shadow-sm`}>
                                <UserCog size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{currentUser.name}</h3>
                                <p className="text-slate-600 font-medium">{currentUser.email}</p>
                                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-1 inline-block">{currentUser.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                            </div>
                        </div>

                        <form onSubmit={handleChangeOwnPassword} className="space-y-8">
                            <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <Key size={20} className="text-slate-600"/> Cambiar Contraseña
                            </h4>
                            
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Contraseña Actual</label>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-0 transition-all shadow-sm font-medium"
                                            value={profilePass.current}
                                            onChange={e => setProfilePass({...profilePass, current: e.target.value})}
                                            placeholder="Ingrese su clave actual"
                                            required
                                        />
                                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Nueva Contraseña</label>
                                        <input 
                                            type="password" 
                                            className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-0 transition-all shadow-sm font-medium"
                                            value={profilePass.new}
                                            onChange={e => setProfilePass({...profilePass, new: e.target.value})}
                                            placeholder="Min. 6 caracteres"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Confirmar Nueva</label>
                                        <input 
                                            type="password" 
                                            className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-0 transition-all shadow-sm font-medium"
                                            value={profilePass.confirm}
                                            onChange={e => setProfilePass({...profilePass, confirm: e.target.value})}
                                            placeholder="Repetir contraseña"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {profileMsg && (
                                <div className={clsx("p-4 rounded-lg text-sm flex items-center gap-3 font-medium border animate-in fade-in", profileMsg.type === 'success' ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200")}>
                                    {profileMsg.type === 'success' ? <CheckCircle2 size={20}/> : <ShieldAlert size={20}/>}
                                    {profileMsg.text}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button type="submit" className={`w-full md:w-auto px-8 py-3.5 bg-${currentTheme.primaryColor}-600 text-white rounded-xl font-bold hover:bg-${currentTheme.primaryColor}-700 shadow-lg shadow-${currentTheme.primaryColor}-200 transition-all flex items-center justify-center gap-2 text-base`}>
                                    <Save size={18} />
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* USERS TAB (Admin) */}
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

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative">
                        {resetTarget && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center p-6 rounded-xl animate-in fade-in">
                                <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-2xl border border-slate-200">
                                    <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <Shield size={18} className="text-orange-500"/> Resetear Contraseña
                                    </h5>
                                    <p className="text-sm text-slate-500 mb-4">Nueva clave para: <span className="font-bold">{resetTarget.name}</span></p>
                                    
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="w-full px-3 py-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        placeholder="Escribe la nueva contraseña..."
                                        value={adminNewPass}
                                        onChange={(e) => setAdminNewPass(e.target.value)}
                                    />
                                    
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => { setResetTarget(null); setAdminNewPass(''); }} className="px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                                        <button onClick={handleAdminResetPassword} className="px-3 py-1.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded">Confirmar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-slate-500"/> Usuarios Activos
                        </h4>
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-2">Usuario</th>
                                        <th className="px-4 py-2">Rol</th>
                                        <th className="px-4 py-2 text-right">Acciones</th>
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
                                                <button 
                                                    onClick={() => setResetTarget(u)}
                                                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                                                    title="Resetear contraseña"
                                                >
                                                    <Lock size={16} />
                                                </button>
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
