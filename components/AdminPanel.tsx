import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, CheckCircle2, XCircle, Clock, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfile {
  id: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  full_name: string;
  license_number: string;
  country: string;
  email?: string;
}

interface AdminPanelProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, isDarkMode }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSqlConfig, setShowSqlConfig] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Intentar primero usar la función con bypass RLS de administrador
      let { data, error } = await supabase.rpc('get_all_profiles_admin');

      if (error || !data) {
        // Fallback a consultar la tabla directamente si la función no existe
        const res = await supabase.from('profiles').select('*');
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      
      const sortedData = (data || []).sort((a, b) => {
        // Fallback to purely sorting on frontend, assuming newer profiles usually have higher IDs or something, 
        // but no reliable date exists if updated_at/created_at aren't guaranteed.
        // We can just rely on the order they are inserted or sort by full_name.
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
      setProfiles(sortedData);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'verified' | 'unverified') => {
    if (!supabase) return;
    setActionLoading(id);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setShowSqlConfig(true);
        alert('Error: La base de datos bloqueó la actualización debido a las políticas de seguridad (RLS). Por favor, ejecuta el código SQL que se muestra arriba para arreglar los permisos de Administrador.');
        return;
      }
      
      setProfiles(prev => prev.map(p => 
        p.id === id ? { ...p, verification_status: status } : p
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    let status = p.verification_status || 'unverified';
    if (filter !== 'all' && status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // Added email to search query just in case 
      return (p.full_name?.toLowerCase() || '').includes(q) || 
             (p.license_number?.toLowerCase() || '').includes(q) || 
             (p.email?.toLowerCase() || '').includes(q);
    }
    return true;
  });

  return (
    <div className={`p-4 sm:p-8 flex flex-col h-full ${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={28} />
            Panel de Administración
          </h2>
          <p className="text-sm opacity-60 mt-1">Verificación de Especialistas y Acceso</p>
        </div>
        <button 
          onClick={fetchProfiles}
          disabled={loading}
          className={`p-2 rounded-xl border ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-white'} transition-colors`}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin opacity-50' : ''} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className={`flex relative flex-1 items-center rounded-xl overflow-hidden border ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
            <Search className="absolute left-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, licencia o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent py-2.5 pl-10 pr-4 outline-none text-sm"
            />
        </div>
        
        <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
          {(['all', 'pending', 'verified', 'unverified'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === tab ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900') : 'opacity-60 hover:opacity-100'}`}
            >
              {tab === 'all' ? 'Todos' : tab === 'pending' ? 'Pendientes' : tab === 'verified' ? 'Verificados' : 'Rechazados'}
            </button>
          ))}
        </div>
      </div>

      {(showSqlConfig || (profiles.length <= 1 && !loading && searchQuery === '')) && (
        <div className={`mb-6 p-4 rounded-xl border flex gap-3 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="text-amber-500 mt-0.5">
             <ShieldCheck size={20} />
          </div>
          <div className="text-sm">
             <p className="font-bold mb-1">¿No puedes aprobar usuarios o los usuarios no ven su estado?</p>
             <p className="opacity-90 mb-2">Supabase usa políticas de seguridad (RLS). Si al aprobar un usuario este sigue como "Pendiente" para él, necesitas actualizar las reglas de acceso. Ejecuta esto en tu SQL Editor:</p>
             <pre className={`p-1.5 sm:p-2.5 rounded justify-start mt-2 text-[10px] sm:text-[11px] overflow-x-auto font-mono whitespace-pre ${isDarkMode ? 'bg-black/40 text-amber-300' : 'bg-white/80 text-amber-900'} border ${isDarkMode ? 'border-amber-500/20' : 'border-amber-300'}`}>
{`-- 1. Asegurar perfil del Administrador
insert into public.profiles (id, email, username, full_name, verification_status)
select id, email, split_part(email, '@', 1), raw_user_meta_data->>'full_name', 'verified'
from auth.users where lower(email) = 'adalberto.pw@gmail.com'
on conflict do nothing;

-- 2. Migrar usuarios a la tabla
insert into public.profiles (id, email, username, full_name, license_number, country, verification_status)
select id, email, split_part(email, '@', 1), raw_user_meta_data->>'full_name', raw_user_meta_data->>'license_number', raw_user_meta_data->>'country', 'pending'
from auth.users 
where id not in (select id from public.profiles)
and lower(email) != 'adalberto.pw@gmail.com';

-- 3. Crear función Bypass RLS 
create or replace function get_all_profiles_admin() 
returns setof profiles language sql security definer as $$
  select * from profiles;
$$;

-- 4. ARREGLAR POLÍTICAS RLS (Crucial para que los usuarios vean su estado)
drop policy if exists "Admin select all" on profiles;
drop policy if exists "Admin update all" on profiles;
drop policy if exists "Users see own" on profiles;
drop policy if exists "Public Select" on profiles;
drop policy if exists "Admins update all" on profiles;
drop policy if exists "Users update own" on profiles;

create policy "Public Select" on profiles for select using (true);
create policy "Users update own" on profiles for update using (auth.uid() = id);
create policy "Admins update all" on profiles for update using ( lower(auth.jwt() ->> 'email') = 'adalberto.pw@gmail.com' );`}
             </pre>
             <p className="opacity-95 font-semibold mt-3 text-sm">💡 Después de ejecutarlo, aprueba a los usuarios aquí y pídeles que recarguen la página.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
            <ShieldCheck size={48} className="mb-4" />
            <p>No se encontraron perfiles</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredProfiles.map(profile => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={profile.id} 
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg">{profile.full_name || 'Usuario sin nombre'}</h3>
                      {profile.verification_status === 'verified' && <CheckCircle2 size={16} className="text-green-500" />}
                      {profile.verification_status === 'pending' && <Clock size={16} className="text-amber-500" />}
                      {profile.verification_status === 'unverified' && <AlertTriangle size={16} className="text-red-500" />}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
                      <span>Correo: <strong>{profile.email || 'N/A'}</strong></span>
                      <span>Licencia: <strong>{profile.license_number || 'N/A'}</strong></span>
                      <span>País: <strong>{profile.country || 'N/A'}</strong></span>
                    </div>
                    <div className="text-xs opacity-50 mt-2 font-mono">{profile.id}</div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {profile.verification_status !== 'verified' && (
                      <button 
                        onClick={() => updateStatus(profile.id, 'verified')}
                        disabled={actionLoading === profile.id}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-xl font-medium transition-colors"
                      >
                        {actionLoading === profile.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        <span className="sm:hidden">Aprobar</span>
                        <span className="hidden sm:inline">Verificar</span>
                      </button>
                    )}
                    {profile.verification_status !== 'unverified' && (
                      <button 
                        onClick={() => updateStatus(profile.id, 'unverified')}
                        disabled={actionLoading === profile.id}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl font-medium transition-colors"
                      >
                       {actionLoading === profile.id ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                       <span className="sm:hidden">Rechazar</span>
                       <span className="hidden sm:inline">Desverificar</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
