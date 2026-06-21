import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ShieldCheck, ShieldAlert, BadgeCheck, ChevronRight, Stethoscope, CreditCard, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  isDarkMode: boolean;
  t?: any;
}

export function UserMenu({ isOpen, onClose, onOpenAuth, isDarkMode, t }: UserMenuProps) {
  const { user, signOut, verificationStatus } = useAuth();

  if (!user) return null;

  const statusConfig = {
    unverified: {
      label: t?.unverified || 'No Verificado',
      icon: ShieldAlert,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    pending: {
      label: t?.pending || 'Verificación Pendiente',
      icon: ShieldCheck,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    verified: {
      label: t?.verified || 'Médico Verificado',
      icon: BadgeCheck,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    }
  };

  const config = statusConfig[verificationStatus] || statusConfig.unverified;
  const StatusIcon = config.icon;

  // Extract metadata
  const fullName = user.user_metadata?.full_name || (t?.unknownUser || 'Usuario');
  const specialty = user.user_metadata?.specialty || 'Nephrology';
  const licenseNumber = user.user_metadata?.license_number || 'N/A';
  const country = user.user_metadata?.country || 'N/A';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`absolute right-0 top-full mt-2 w-80 z-[110] rounded-[2.5rem] shadow-2xl border overflow-hidden ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* CREDENTIAL HEADER */}
            <div className="relative p-6 overflow-hidden group/credential">
                {/* Holographic Effect */}
                <div className="absolute inset-0 opacity-0 group-hover/credential:opacity-20 transition-opacity duration-1000 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 animate-pulse mix-blend-overlay" />
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-600 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="flex items-start justify-between relative z-10 mb-6">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Credencial Digital</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-tight opacity-60">NephroUpdate Network</span>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${config.bg} ${config.border} ${config.color}`}>
                        <StatusIcon size={10} />
                        {config.label}
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-600/20">
                            {fullName[0].toUpperCase()}
                        </div>
                        {verificationStatus === 'verified' && (
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                                <BadgeCheck size={16} className="text-emerald-500 fill-emerald-500/10" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-black text-lg leading-tight truncate">{fullName}</h3>
                        <div className="flex items-center gap-1.5 opacity-60 mt-0.5">
                            <Stethoscope size={12} className="text-blue-500" />
                            <span className="text-xs font-bold">{specialty}</span>
                        </div>
                    </div>
                </div>

                {/* ID DETAILS GRID */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">Nº Licencia</span>
                        <span className="text-xs font-mono font-bold tracking-tighter">{licenseNumber}</span>
                    </div>
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">Válido Hasta</span>
                        <span className="text-xs font-bold truncate block">12 / 2026</span>
                    </div>
                </div>

                {/* Aesthetic Barcode / QR Element */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[6px] font-black uppercase tracking-[0.3em] opacity-30">Signature</span>
                        <div className="h-6 w-24 border-b border-slate-300 dark:border-slate-700 opacity-40 italic font-serif text-[10px] flex items-end pb-1">
                            {fullName.split(' ').map(n => n[0]).join('. ')}.
                        </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-30">
                        <div className="flex gap-0.5 h-4 items-end">
                            {[2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 2, 4].map((h, i) => (
                                <div key={i} className="w-0.5 bg-current" style={{ height: `${h * 20}%` }} />
                            ))}
                        </div>
                        <QrCode size={20} />
                    </div>
                </div>
            </div>

            {/* ACTIONS */}
            <div className={`p-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <button 
                onClick={() => {
                  onOpenAuth();
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <CreditCard size={18} />
                  </div>
                  <span className="text-sm font-bold">{t?.digitalCard || 'Gestionar Credencial'}</span>
                </div>
                <ChevronRight size={14} className="opacity-40" />
              </button>

              <button 
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 transition-all hover:bg-red-500/10 active:scale-95 mt-1`}
              >
                <div className="p-2 rounded-xl bg-red-500/10">
                    <LogOut size={18} />
                </div>
                <span className="text-sm font-bold">{t?.logout || 'Cerrar Sesión'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
