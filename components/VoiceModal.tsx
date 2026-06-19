
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { Mic, X, Loader2, Volume2, BarChart2, AlertCircle, Minimize2 } from 'lucide-react';
import { arrayBufferToBase64, base64ToUint8Array, floatTo16BitPCM } from '../utils/audioUtils';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextText?: string;
  initialMode?: 'conversation' | 'read_summary' | 'read_all';
  isDarkMode: boolean;
  language: 'es' | 'original';
  onToolCall?: (name: string, args: any) => Promise<any>;
  apiKey?: string; // New prop for user provided key
}

// Tool Definitions
const saveArticlesTool: FunctionDeclaration = {
  name: 'saveArticlesByTopic',
  description: 'Saves articles to the user library that match a specific topic or keyword. Use this when the user asks to save, bookmark, or keep articles.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: 'The topic or keyword to filter articles by (e.g., "renal", "transplant").',
      },
    },
    required: ['topic'],
  },
};

const getAllArticlesTool: FunctionDeclaration = {
  name: 'getAllArticlesContent',
  description: 'Retrieves the full text content of the currently visible articles on screen.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getNewsForTopicTool: FunctionDeclaration = {
  name: 'getNewsForTopic',
  description: 'Retrieves the latest news and research updates for a specific Nephrology sub-specialty or topic (e.g., Hypertension, Transplant, AKI) from the background database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: 'The specific topic to retrieve news for. Must be one of: "General", "Renal Transplant", "Acute Kidney Injury", "Renal Support Therapies", "Chronic Kidney Disease", "Hypertension", "Glomerular Diseases".',
      },
    },
    required: ['topic'],
  },
};

const changeTopicTool: FunctionDeclaration = {
  name: 'changeTopic',
  description: 'Changes the currently active topic in the main Discover view. Use this when the user explicitly wants to switch the main view to a different topic.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: 'The topic to switch to (e.g. "Hypertension", "Renal Transplant").' }
    },
    required: ['topic']
  }
};

const navigateTabTool: FunctionDeclaration = {
  name: 'navigateTab',
  description: 'Navigates between the main sections of the app: Discover (Home), Library (Saved), and History.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tab: { type: Type.STRING, description: 'The tab to switch to. Values: "discover", "saved", "history".' }
    },
    required: ['tab']
  }
};

const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose, contextText, initialMode = 'conversation', isDarkMode, language, onToolCall, apiKey }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (isOpen) {
      startSession();
      setIsMinimized(false);
    } else {
      stopSession();
    }
    return () => stopSession();
  }, [isOpen]);

  const startSession = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');
      
      const key = apiKey || process.env.API_KEY;
      if (!key) {
          throw new Error("Gemini API Key missing.");
      }

      const ai = new GoogleGenAI({ apiKey: key });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1
        } 
      });
      
      mediaStreamRef.current = stream;
      const safeContext = contextText ? contextText.substring(0, 5000).replace(/[\u0000-\u001F\u007F-\u009F]/g, "") : "";

      let systemInstruction = language === 'es' 
        ? "Eres NephroBot, un asistente experto en Nefrología. Tienes control total sobre la aplicación. Habla con naturalidad y precisión clínica.\n" +
          "1. Para cambiar de tema, usa `changeTopic`.\n" +
          "2. Para navegar, usa `navigateTab`.\n" +
          "3. Si piden guardar artículos por tema, `saveArticlesByTopic`."
        : "You are NephroBot, an expert assistant in Nephrology. You have full control over the app. Speak naturally with clinical precision.\n" +
          "1. To switch topics, use `changeTopic`.\n" +
          "2. To navigate, use `navigateTab`.\n" +
          "3. To save by topic, use `saveArticlesByTopic`.";

      if (initialMode === 'read_summary' && safeContext) {
        systemInstruction += ` TAREA PRIORITARIA: Lee el siguiente resumen: "${safeContext}"`;
      } else if (safeContext) {
        systemInstruction += ` Contexto visual actual: "${safeContext}"`;
      }

      // Initialize session with correct model version.
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: [saveArticlesTool, getAllArticlesTool, getNewsForTopicTool, changeTopicTool, navigateTabTool] }],
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setupAudioInput(inputAudioContext, stream);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              playAudioChunk(base64Audio);
            }

            if (message.toolCall && onToolCall) {
               const functionResponses = [];
               for (const fc of message.toolCall.functionCalls) {
                 try {
                   const result = await onToolCall(fc.name, fc.args);
                   functionResponses.push({
                     id: fc.id,
                     name: fc.name,
                     response: { result: result }
                   });
                 } catch (error) {
                   functionResponses.push({ id: fc.id, name: fc.name, response: { error: "Failed" } });
                 }
               }
               if (functionResponses.length > 0 && sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => {
                   session.sendToolResponse({ functionResponses });
                 });
               }
            }

            if (message.serverContent?.interrupted) {
               stopCurrentAudio();
               setIsSpeaking(false);
            }
          },
          onclose: () => {
             setStatus(prev => prev === 'error' ? 'error' : 'disconnected');
          },
          onerror: (error: any) => {
            console.error("Gemini Live Error:", error);
            setStatus('error');
            setErrorMessage(language === 'es' ? 'Error de conexión' : 'Connection Error');
          }
        }
      });

    } catch (error: any) {
      console.error("Failed to start voice session:", error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  const setupAudioInput = (ctx: AudioContext, stream: MediaStream) => {
    if (ctx.state === 'closed') return;
    try {
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
          const rms = Math.sqrt(sum / inputData.length);
          setIsUserSpeaking(rms > 0.02);

          const pcm16 = floatTo16BitPCM(inputData);
          const base64Data = arrayBufferToBase64(pcm16);
          
          if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
              session.sendRealtimeInput({
                media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
              });
            }).catch(() => {});
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
        sourceRef.current = source;
        processorRef.current = processor;
    } catch (error) {
        console.error("Error setting up audio input:", error);
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
    try {
      if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }
      const uint8Array = base64ToUint8Array(base64Audio);
      const audioBuffer = await createAudioBufferFromPCM(uint8Array, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) setIsSpeaking(false);
      };
      sourcesRef.current.add(source);
    } catch (error) {
      console.error("Error playing audio chunk", error);
    }
  };

  const createAudioBufferFromPCM = (data: Uint8Array, ctx: AudioContext): AudioBuffer => {
     const sampleRate = 24000;
     const frameCount = data.length / 2;
     const buffer = ctx.createBuffer(1, frameCount, sampleRate);
     const channelData = buffer.getChannelData(0);
     const dataView = new DataView(data.buffer);
     for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
     }
     return buffer;
  };

  const stopCurrentAudio = () => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(error) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const stopSession = () => {
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch(error) {} sourceRef.current = null; }
    if (processorRef.current) { try { processorRef.current.disconnect(); processorRef.current.onaudioprocess = null; } catch(error) {} processorRef.current = null; }
    if (audioContextRef.current) { if (audioContextRef.current.state !== 'closed') { try { audioContextRef.current.close(); } catch(error) {} } audioContextRef.current = null; }
    setStatus('disconnected');
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    sessionPromiseRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-end p-4 sm:p-6 pb-20 sm:pb-6">
      <div className={`pointer-events-auto transition-all duration-500 ease-in-out transform ${isMinimized ? 'w-auto' : 'w-full max-w-sm'}`}>
        <div className={`relative overflow-hidden shadow-2xl backdrop-blur-xl border transition-colors duration-300 ${
            isMinimized 
              ? (isDarkMode ? 'bg-slate-900/90 border-slate-700 rounded-full' : 'bg-white/90 border-slate-200 rounded-full')
              : (isDarkMode ? 'bg-slate-900/95 border-slate-700 rounded-3xl' : 'bg-white/95 border-slate-200 rounded-3xl')
        }`}>
            {!isMinimized && (
                 <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                    <button onClick={() => setIsMinimized(true)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <Minimize2 size={16} />
                    </button>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`}>
                        <X size={16} />
                    </button>
                 </div>
            )}

            {isMinimized ? (
                <div className="flex items-center gap-3 p-2 pr-4 cursor-pointer group" onClick={() => setIsMinimized(false)}>
                     <div className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                        status === 'connected' ? (isSpeaking ? 'bg-blue-600 animate-pulse' : 'bg-slate-800 group-hover:bg-blue-600') : 'bg-slate-200'
                     }`}>
                         {isSpeaking ? <Volume2 size={16} className="text-white"/> : <Mic size={16} className={isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-600 group-hover:text-white"}/>}
                     </div>
                     <div className="flex flex-col">
                        <span className={`text-xs font-bold leading-none mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NephroBot</span>
                        <span className={`text-[9px] font-medium leading-none ${status === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {status === 'connected' ? 'Live' : '...'}
                        </span>
                     </div>
                </div>
            ) : (
                <div className="p-6 flex flex-col items-center gap-6">
                     <div className="flex flex-col items-center">
                        <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NephroBot Live</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${status === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
                           {status === 'connecting' && (language === 'es' ? 'Conectando...' : 'Connecting...')}
                           {status === 'connected' && (language === 'es' ? 'En línea' : 'Listening...')}
                           {status === 'error' && (language === 'es' ? 'Error' : 'Error')}
                        </p>
                     </div>
                     <div className="relative w-24 h-24 flex items-center justify-center">
                        <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                            status === 'connected' ? (isSpeaking ? 'bg-blue-600 animate-pulse' : (isUserSpeaking ? 'bg-emerald-500' : 'bg-slate-800')) : 'bg-slate-200'
                        }`}>
                            {status === 'connecting' ? <Loader2 size={24} className="animate-spin text-slate-500" /> : status === 'error' ? <AlertCircle size={24} className="text-red-500" /> : (isSpeaking ? <Volume2 size={24} className="text-white" /> : isUserSpeaking ? <Mic size={24} className="text-white" /> : <BarChart2 size={24} className="text-slate-400" />)}
                        </div>
                     </div>
                     <div className="flex gap-2 w-full">
                        <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}>
                            {language === 'es' ? 'Terminar' : 'End'}
                        </button>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VoiceModal;
