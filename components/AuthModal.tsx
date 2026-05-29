import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2, User, ShieldAlert, GraduationCap, CheckCircle, BadgeCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function AuthModal({ isOpen, onClose, isDarkMode }: AuthModalProps) {
  const { user, signOut, updateVerificationStatus } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Verification fields
  const [fullName, setFullName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [country, setCountry] = useState('');
  
  // Signup Flow State
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4>(1); // 1: Auth, 2: Profile, 3: Quiz, 4: Success
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        // If user is already logged in but unverified, skip to step 2
        setIsLogin(false);
        setSignupStep(2);
        setFullName(user.user_metadata?.full_name || '');
      } else {
        setIsLogin(true);
        setSignupStep(1);
      }
    }
  }, [isOpen, user]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError('Supabase no está configurado.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (signupStep === 1) {
      if (!email || !password) {
        setError('Por favor completa email y contraseña.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      setSignupStep(2);
    } else if (signupStep === 2) {
      if (!fullName || !licenseNumber || !country) {
        setError('Por favor completa todos los campos profesionales.');
        return;
      }
      setSignupStep(3);
    }
  };

  const handleQuizAnswer = async (ans: string) => {
    setQuizAnswer(ans);
    if (ans === '< 120 mmHg') {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      
      // Proceed to final signup or update
      setIsLoading(true);
      setError(null);
      
      try {
        if (!supabase) throw new Error('Supabase no está configurado.');
        
        if (user) {
          // User already exists, just update their profile and metadata
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              specialty: 'Nephrology',
              license_number: licenseNumber,
              country: country,
              quiz_passed: true
            }
          });
          
          await updateVerificationStatus('pending', {
            full_name: fullName,
            license_number: licenseNumber,
            country: country,
            quiz_passed: true
          });
          
          setSignupStep(4);
        } else {
          // New user signup
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                full_name: fullName,
                specialty: 'Nephrology',
                license_number: licenseNumber,
                country: country,
                quiz_passed: true
              }
            }
          });
          
          if (signUpError) throw signUpError;
          
          if (data?.user) {
            // Attempt to proactively create the profile so admin sees them immediately
            const username = email.split('@')[0];
            const { error: insertError } = await supabase.from('profiles').insert({
              id: data.user.id,
              username: username,
              email: email,
              full_name: fullName,
              license_number: licenseNumber,
              country: country,
              verification_status: 'pending'
            });
            if (insertError) {
              console.error("Proactive profile insert failed:", insertError);
            }
          }

          setSignupStep(4);
        }
      } catch (err: any) {
        setError(err.message || 'Ocurrió un error durante el registro.');
        setSignupStep(2); // Go back to form if error
      } finally {
        setIsLoading(false);
      }
      
    } else {
      if (navigator.vibrate) navigator.vibrate(200);
      setError("Respuesta incorrecta según guías KDIGO 2024. Intenta nuevamente.");
      setQuizAnswer(null);
    }
  };

  const resetState = () => {
    if (!user) {
      setIsLogin(true);
      setSignupStep(1);
    } else {
      setIsLogin(false);
      setSignupStep(2);
    }
    setEmail('');
    setPassword('');
    setFullName(user?.user_metadata?.full_name || '');
    setLicenseNumber('');
    setCountry('');
    setQuizAnswer(null);
    setError(null);
    setMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-md p-6 rounded-3xl shadow-2xl ${
            isDarkMode ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-900'
          } overflow-hidden`}
        >
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-black mb-2">
              {isLogin ? 'Iniciar Sesión' : (
                signupStep === 1 ? 'Crear Cuenta' : 
                signupStep === 2 ? 'Verificación Profesional' :
                signupStep === 3 ? 'Reto Médico' : '¡Solicitud Enviada!'
              )}
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isLogin
                ? 'Accede a tus artículos guardados y preferencias.'
                : (
                  signupStep === 1 ? 'Únete para guardar artículos y personalizar tu experiencia.' :
                  signupStep === 2 ? 'Necesitamos validar tu identidad médica para darte acceso a la comunidad.' :
                  signupStep === 3 ? 'Demuestra tus conocimientos clínicos para completar el registro.' :
                  'Revisa tu correo para confirmar tu cuenta. Tu perfil será validado pronto.'
                )
              }
            </p>
          </div>

          {/* PROGRESS BAR FOR SIGNUP */}
          {!isLogin && signupStep < 4 && (
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    step <= signupStep 
                      ? 'bg-blue-600' 
                      : (isDarkMode ? 'bg-slate-800' : 'bg-slate-200')
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                    } border`}
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                    } border`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading && <Loader2 className="animate-spin" size={18} />}
                Entrar
              </button>
            </form>
          )}

          {/* SIGNUP FLOW */}
          {!isLogin && (
            <div className="relative">
              {/* STEP 1: AUTH INFO */}
              {signupStep === 1 && (
                <form onSubmit={handleSignupNext} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        } border`}
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        } border`}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    Continuar
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`w-full py-3 rounded-xl font-bold transition-colors ${
                      isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    Ya tengo cuenta
                  </button>
                </form>
              )}

              {/* STEP 2: PROFESSIONAL INFO */}
              {signupStep === 2 && (
                <form onSubmit={handleSignupNext} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        } border`}
                        placeholder="Dr. Juan Pérez"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nº Licencia / NPI / Colegiado
                    </label>
                    <div className="relative">
                      <ShieldAlert className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        } border`}
                        placeholder="Ej: 12345678"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      País / Región
                    </label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                      } border`}
                      placeholder="Ej: Colombia"
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                        isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: QUIZ */}
              {signupStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-3 text-indigo-500">
                      <GraduationCap size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Reto Clínico</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">
                      KDIGO 2024: ¿Cuál es el objetivo de PAS recomendado para pacientes CKD con proteinuria, sin diabetes?
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {['< 140 mmHg', '< 130 mmHg', '< 120 mmHg'].map(opt => (
                      <button 
                        key={opt} 
                        onClick={() => handleQuizAnswer(opt)}
                        disabled={isLoading}
                        className={`w-full p-4 rounded-xl border text-sm font-bold text-left transition-all ${
                          quizAnswer === opt 
                          ? (opt === '< 120 mmHg' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500')
                          : (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-400')
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-blue-500 text-sm font-bold mt-4">
                      <Loader2 className="animate-spin" size={16} /> Procesando registro...
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSignupStep(2)}
                    disabled={isLoading}
                    className={`w-full py-3 mt-2 rounded-xl font-bold transition-colors ${
                      isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    } ${isLoading ? 'opacity-50' : ''}`}
                  >
                    Atrás
                  </button>
                </div>
              )}

              {/* STEP 4: SUCCESS */}
              {signupStep === 4 && (
                <div className="text-center py-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="font-black text-xl mb-2">{user ? '¡Verificación Enviada!' : '¡Registro Exitoso!'}</h3>
                  <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {user ? (
                      <>Tu solicitud de verificación está en estado <span className="font-bold text-amber-500">Pendiente</span>. Pronto validaremos tu perfil.</>
                    ) : (
                      <>Tu cuenta ha sido creada y tu solicitud de verificación está en estado <span className="font-bold text-amber-500">Pendiente</span>.<br/><br/>Por favor revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.</>
                    )}
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TOGGLE LOGIN/SIGNUP OR LOGOUT */}
          {signupStep < 4 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setSignupStep(1);
                    setError(null);
                    setMessage(null);
                  }}
                  className={`text-sm font-bold transition-colors ${
                    isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {isLogin ? '¿No tienes cuenta? Regístrate y Verifícate' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    handleClose();
                  }}
                  className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Loader2 className="animate-spin hidden" size={14} />
                  Cerrar Sesión
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
