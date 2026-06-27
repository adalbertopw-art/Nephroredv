import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Bookmark,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  Settings,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  History,
  Clock,
  Trash2,
  Mic,
  Volume2,
  Key,
  Check,
  Zap,
  Database,
  Book,
  FlaskConical,
  Library,
  Building2,
  Languages,
  Palette,
  CalendarClock,
  ArrowUp,
  Info,
  BookOpen,
  Download,
  Workflow,
  StickyNote,
  Bell,
  GraduationCap,
  Quote,
  Lock,
  Unlock,
  FileText,
  SlidersHorizontal,
  Microscope,
  Radar,
  ArrowLeft,
  BrainCircuit,
  Wifi,
  CloudDownload,
  WifiOff,
  Eye,
  Plus,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  GripVertical,
  Undo2,
  User,
  Users,
  Home,
  LayoutGrid,
  ScanEye,
  Layers,
  Filter,
  Calendar,
  List,
  ArrowRight,
  RotateCcw,
  Activity,
  ExternalLink,
  ShieldCheck,
  Type,
  Newspaper,
  Globe,
  Server,
  Mail,
  Flame,
  Scale,
  Share2,
  Image as ImageIcon,
  BadgeCheck,
  Stethoscope,
  ShieldAlert,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { App as CapacitorApp } from "@capacitor/app";
import { v4 as uuidv4 } from "uuid";

// Services
import {
  fetchLatestNephrologyNews,
  verifyGeminiKey,
  generateGeminiSummary,
  refinePicoTerms,
  searchMedicalGoogle,
  fetchClinicalSuggestions,
} from "./services/geminiService";
import { fetchPubMedArticles } from "./services/pubmedService";
import { fetchOpenAlexArticles } from "./services/openAlexService";
import { translateManualQueryWithoutAI } from "./services/translationService";
import { fetchEuropePmcArticles } from "./services/europePmcService";
import { fetchSemanticScholarArticles } from "./services/semanticScholarService";
import { fetchClinicalTrials } from "./services/clinicalTrialsService";
import { fetchCoreArticles } from "./services/coreApiService";
import { fetchDoajArticles } from "./services/doajService";
import { fetchElsevierArticles } from "./services/elsevierService";
import { fetchLilacsArticles } from "./services/lilacsService";
import { generateGroqSummary, verifyGroqKey } from "./services/groqService";
import {
  getOfflineStatusMap,
  getOfflineArticle,
  clearOfflineStorage,
  saveArticleOffline,
} from "./services/storageService";
import { fetchArticleContent } from "./services/downloadService";
import { backgroundSyncService, SyncState } from "./services/backgroundSyncService";

// Constants
import { getArticleImpactTier } from "./constants/searchConstants";

// Types & Components
import {
  Article,
  ResearchUpdate,
  Topic,
  Language,
  HistorySnapshot,
  RetentionPeriod,
  TextSize,
  SearchMode,
  DataSource,
  UiLanguage,
  AIProvider,
  FontStyle,
  ForumPost,
  LayoutMode,
} from "./types";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./hooks/useDebounce";
import ArticleCard from "./components/ArticleCard";
import ArticleSkeleton from "./components/ArticleSkeleton";
import NewsTicker from "./components/NewsTicker";
import VoiceModal from "./components/VoiceModal";
import OfflineReader from "./components/OfflineReader";
import ImmersiveReader from "./components/ImmersiveReader";
import HistoryViewer from "./components/HistoryViewer";
import HistoryAnalytics from "./components/HistoryAnalytics";
import FlashcardView from "./components/FlashcardView";
import SocialJournalClub from "./components/SocialJournalClub";
import DebateDashboard from "./components/DebateDashboard";
import { AdminPanel } from "./components/AdminPanel";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { detectStudyDesign, StudyDesign } from "./utils/categoryDetection";
import { supabase } from "./lib/supabase";

const DEFAULT_TOPICS: Topic[] = [
  "General",
  "Renal Transplant",
  "Acute Kidney Injury",
  "Renal Support Therapies",
  "Chronic Kidney Disease",
  "Hypertension",
  "Glomerular Diseases",
  "Onco-Nephrology",
];

const TAB_ORDER = ["history", "discover", "saved", "community", "admin"];

const KidneyIcon = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9.5 3.5C4.5 3.5 1.5 8 1.5 13C1.5 18 5 21.5 9.5 21.5C14 21.5 17.5 19 19 16.5C20.5 14 20.5 9.5 19 7C17.5 4.5 13.5 3.5 9.5 3.5Z" />
    <path d="M6.5 8V16L10.5 8V16" strokeLinecap="square" />
    <path d="M13.5 8V13.5C13.5 15 14.5 16 16 16C17.5 16 18.5 15 18.5 13.5V8" />
    <circle cx="6.5" cy="8" r="1" fill="currentColor" fillOpacity="0.5" />
    <circle cx="10.5" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />
    <circle cx="18.5" cy="8" r="1" fill="currentColor" fillOpacity="0.5" />
    <path d="M20 12H22.5" strokeDasharray="1 1" />
    <circle cx="22.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

const translations = {
  es: {
    discover: "Descubrir",
    library: "Biblioteca",
    history: "Historial",
    searchPlaceholder: "Explorar evidencia...",
    welcome: "Bienvenido a",
    subtitle: "NephroUpdate",
    loading: "Analizando evidencia...",
    error: "Error de conexión.",
    saved: "Guardado",
    removed: "Eliminado",
    libraryTitle: "Tu Biblioteca",
    historyTitle: "Línea de Tiempo",
    communityTitle: "Comunidad Médica",
    communityDesc: "Foros clínicos y encuestas de impacto.",
    verifiedOnly: "Solo para Médicos Verificados",
    fullTextError: "No se pudo extraer el texto completo.",
    openingReader: "Obteniendo Texto Completo...",
    analysisStopped: "Análisis detenido por el usuario.",
    translating: "Traduciendo al inglés médico...",
    picoTitle: "Búsqueda Estructurada PICO",
    picoDesc:
      "Define tu pregunta clínica para generar una query booleana precisa.",
    pLabel: "Paciente / Problema",
    pPlaceholder: "ej. Nefropatía Diabética, CKD Estadio 4...",
    iLabel: "Intervención",
    iPlaceholder: "ej. Inhibidores SGLT2, Finerenone...",
    cLabel: "Comparación (Opcional)",
    cPlaceholder: "ej. Placebo, Bloqueo RAS estándar...",
    oLabel: "Resultado (Opcional)",
    oPlaceholder: "ej. Progresión a ESRD, Mortalidad...",
    searchPico: "Generar Query & Buscar",
    searchingFor: "Buscando:",
    translatedFrom: "Traducido de:",
    undo: "Deshacer (Original)",
    proposeDebate: "Proponer Debate",
    latestNews: "Últimas Noticias",
    settings: {
      title: "Configuración",
      profStatus: "ESTADO PROFESIONAL",
      verified: "Verificado",
      pending: "Pendiente",
      invalid: "Inválida",
      guest: "Invitado (Guest)",
      guestDesc: "Acceso limitado a lectura.",
      guestInitials: "US",
      createAccountTxt: "Crear Cuenta y Verificar",
      verifyDesc: "Para participar en encuestas de impacto y foros clínicos, requerimos validación de licencia profesional durante el registro.",
      pendingDesc: "Hemos recibido tus credenciales. La validación manual puede tomar hasta 24 horas.",
      verifiedDr: "DR",
      verifiedUser: "Dr.",
      verifiedDesc: "NPI Verificado • Nefrología",
      filters: "FILTROS DE BÚSQUEDA",
      fullTextOnly: "Solo Texto Completo (PMC)",
      fullTextDesc: "Muestra solo artículos disponibles en PubMed Central.",
      bentoLayout: "Diseño Bento Grid",
      bentoDesc: "Vista dinámica con tarjetas de tamaño variable.",
      searchMode: "MODO DE BÚSQUEDA",
      standardSearch: "Estándar",
      standardDesc: "Barrida técnica en 9 bases de datos (incl. LILACS).",
      aiSearch: "IA",
      aiSearchDesc: "Analiza resultados y genera síntesis ejecutiva.",
      connectivity: "CONECTIVIDAD Y SEGURIDAD",
      apiKeyRequired: "Necesaria para búsqueda IA, Voice Mode y Resúmenes.",
      groqDesc: "NLP de baja latencia para re-escritura de abstracts y lenguaje clínico directo.",
      verifyBtn: "Verificar",
      getGoogleAI: "Obtener en Google AI Studio",
      getGroq: "Obtener en console.groq.com",
      interfaceAndReading: "INTERFAZ Y LECTURA",
      darkMode: "Modo Oscuro",
      darkModeDesc: "Esquema de colores invertido.",
      language: "Idioma de la Interfaz",
      langDesc: "Afecta los menús y botones principales.",
      contentLang: "Idioma de Análisis (IA)",
      contentLangDesc: "El idioma en el que Gemini y Groq generarán síntesis.",
      aiProviderTitle: "Proveedor de IA",
      aiProviderDesc: "Motor utilizado para Análisis Crítico y Voice Mode.",
      fontStyleTitle: "Estilo de Fuente (Titles & Abstracts)",
      fontStyleStandard: "Standard (Inter)",
      fontStyleEditorial: "Editorial (Merriweather)",
      fontStyleModern: "Modern (Outfit)",
      newsTicker: "News Ticker (Noticias)",
      flashcardMode: "Modo Flashcards (Medical Shorts)",
      textSize: "TAMAÑO DE TEXTO",
      languages: "IDIOMAS",
      langEs: "Español",
      langEn: "English",
      langOriginal: "Original",
      syncWifi: "SINCRONIZACIÓN EN WI-FI",
      syncDesc: "Descargar automáticamente el texto completo de tus artículos guardados en segundo plano cuando estás en Wi-Fi.",
      syncStatus: "Estado de Sincronización:",
      syncing: "Sincronizando...",
      syncReady: "Listo / Inactivo",
      syncProcessing: "Procesando...",
      syncLast: "Última sinc:",
      syncNever: "No sincronizado aún.",
      syncNow: "Sincronizar Ya",
      autoXrayTitle: "AUTO RESALTADO",
      dataMaintenance: "DATOS Y MANTENIMIENTO",
      confirmDelete: "CONFIRMAR BORRADO",
      cancel: "Cancelar",
      clearSearchHistory: "Limpiar Historial de Bucle",
      deleteAllArticles: "Eliminar Todos los Artículos",
      factoryReset: "Reset Total (Fábrica)",
      areYouSure: "¿ESTÁS SEGURO? SE PERDERÁ TODO",
      yesReset: "SÍ, RESET TOTAL",
      noReset: "NO",
      resetVerify: "Resetear Verificación (Debug)",
      infoHelp: "INFORMACIÓN & AYUDA",
      currentVersion: "Versión Actual",
      viewFullInfo: "VER INFORMACIÓN COMPLETA",
      pwaTitle: "INSTALAR APLICACIÓN",
      pwaInstalled: "¡NephroUpdate ya está instalada!",
      pwaInstalledDesc: "Puedes abrir NephroUpdate directamente desde tu pantalla de inicio como una aplicación nativa.",
      pwaInstallBtn: "Instalar NephroUpdate",
      pwaInstallDesc: "Instala NephroUpdate en tu dispositivo para acceder rápidamente con un solo toque, pantalla completa y mejor rendimiento.",
      pwaIosTitle: "Instalación en iOS (Safari)",
      pwaIosDesc: "Toca el botón 'Compartir' en la barra inferior de Safari, luego selecciona 'Añadir a pantalla de inicio' o 'Agregar a inicio'.",
      pwaManualTitle: "Instalación manual",
      pwaManualDesc: "Si la opción automática no aparece, abre el menú de tu navegador (los tres puntos o la barra de herramientas) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'."
    },
    infoMenu: {
      navAndDock: "Navegación & Dock",
      discoverLabel: "Descubrir",
      discoverDesc: "Feed principal de artículos por tópico.",
      historyLabel: "Historial",
      historyDesc: "Línea de tiempo de búsquedas anteriores.",
      libraryLabel: "Biblioteca",
      libraryDesc: "Artículos guardados y lectura offline.",
      voiceLabel: "Voz (IA)",
      voiceDesc: "Asistente Gemini Live para comandos verbales.",
      communityLabel: "Comunidad",
      communityDesc: "Red social médica, foros y encuestas.",
      cloudSyncLabel: "Cloud Sync",
      cloudSyncDesc: "Sincronización de biblioteca en la nube.",
      studyTools: "Herramientas de Estudio",
      saveOfflineLabel: "Guardar / Offline",
      saveOfflineDesc: "Descarga para leer sin internet.",
      notesLabel: "Notas Personales",
      notesDesc: "Añade observaciones clínicas.",
      debateLabel: "Debate Clínico",
      debateDesc: "Discute artículos con otros médicos.",
      citeLabel: "Citar (APA)",
      citeDesc: "Copia la referencia bibliográfica.",
      aiEnhanceLabel: "IA Enhance (Groq)",
      aiEnhanceDesc: "Reescribe el abstract con lenguaje claro.",
      visualAbstractLabel: "Visual Abstract",
      visualAbstractDesc: "Genera diagrama de flujo (Mermaid).",
      relatedLabel: "Relacionados",
      relatedDesc: "Busca estudios similares con IA.",
      fullTextFlowLabel: "Full Text Flow",
      fullTextFlowDesc: "Intenta acceder al texto completo.",
      statusGlossary: "Glosario de Estado",
      highImpact: "Alto Impacto / Tendencia",
      openAccess: "Acceso Abierto (Gratis)",
      offlineAvailable: "Disponible Offline",
      clinicalCapsule: "Cápsula Clínica",
      clinicalTrial: "Ensayo Clínico",
      clinicalGuideline: "Guía Clínica",
      searchEngineTitle: "Motor de Búsqueda Inteligente",
      searchEngineIntro: "NephroUpdate utiliza un motor híbrido que combina la precisión de bases de datos médicas con la flexibilidad de la IA Generativa.",
      neuralTranslationTitle: "Traducción Neural:",
      neuralTranslationDesc: " Puedes escribir en español (ej. \"Nefropatía IgA\"). El sistema lo traduce internamente a términos MeSH en inglés (\"IgA Glomerulonephritis\") para maximizar resultados en PubMed y OpenAlex.",
      picoModeTitle: "Modo PICO:",
      picoModeDesc: " Utiliza la búsqueda estructurada (Paciente, Intervención, Comparación, Outcome) para generar queries booleanas complejas automáticamente.",
      groundingTitle: "Grounding:",
      groundingDesc: " Las búsquedas se verifican contra Google Search para incluir noticias de última hora que aún no están indexadas en PubMed.",
      aboutAppTitle: "Sobre la Aplicación",
      aboutAppDesc: "NephroUpdate es una herramienta de descubrimiento de investigación médica de alto nivel diseñada para nefrólogos. Utiliza inteligencia artificial para rastrear, filtrar y sintetizar la evidencia más reciente de múltiples bases de datos biomédicas.",
      medicalDirection: "Dirección Médica & Desarrollo",
      role: "Nefrólogo / Developer"
    },
    libraryEmptyTitle: "Tu Biblioteca Personal",
    libraryEmptyDesc: "Inicia sesión para guardar artículos, sincronizar tu biblioteca entre dispositivos y acceder a tus notas personales.",
    loginToContinue: "Iniciar Sesión para Continuar",
    historyEmptyTitle: "Tu Línea de Tiempo",
    historyEmptyDesc: "Tus búsquedas previas y descubrimientos aparecerán aquí automáticamente una vez que inicies sesión.",
    noArticlesFound: "No se encontraron artículos",
    noArticlesDesc: "Intenta ajustar los filtros o la búsqueda para encontrar lo que necesitas en tu biblioteca.",
    resetFilters: "Restablecer Filtros",
    legalNotice: "Aviso Legal",
    legalDesc: "Esta aplicación es una herramienta de soporte para la investigación y educación médica. Los resúmenes generados por IA pueden contener imprecisiones. Siempre verifique la fuente original antes de tomar decisiones clínicas.",
    selectColleague: "Seleccionar Colega",
    noColleagues: "No se encontraron colegas activos",
    sendingArticles: "Se enviarán {counts} artículos como mensaje directo",
    generatingReport: "Generar Reporte",
    analyzingReport: "Analizando...",
    scientificDevelopments: "¿Cuáles son los desarrollos científicos?",
    synthesizingEvidence: "Sintetizando Evidencia...",
    back: "Atrás",
    suggestions: "Sugerencias",
    author: "Autor",
    searchAuthor: "Buscar artículos del autor:",
    time: "Tiempo",
    evidenceType: "Tipo de Evidencia",
    social: {
      proposeCase: "Proponer un Caso Clínico",
      takeToMainDebate: "Llevar a Debate Principal",
      proposeArticle: "Proponer Artículo",
      articleTitlePh: "Título del artículo...",
      linkPh: "Enlace / URL (opcional)...",
      doiPh: "DOI (opcional)...",
      sendProposal: "Enviar Propuesta",
      beTheFirst: "Sé el primero en opinar",
      activeDebate: "Debate Activo",
      generalComments: "Comentarios Generales",
      aiAnalyzing: "Consultor AI analizando...",
      aiModeratorAnalyzing: "Moderador IA analizando sesgo...",
      invokeAI: "Invocar Consultor AI (Segunda Opinión)",
      invokeDevil: "Invocar Moderador (Devil's Advocate)",
      replyingTo: "Replying to @",
      writeReply: "Escribe tu respuesta...",
      shareCase: "Comparte un caso, pregunta o comentario...",
      addCritique: "Añade tu crítica o comentario...",
      loginToParticipate: "Inicia sesión para participar",
      loginToParticipateDesc: "Debes iniciar sesión para dar tu opinión en el Social Club",
      solid: "Sólido",
      biased: "Sesgado",
      novel: "Novedoso",
      limited: "Limitado",
      like: "Me gusta",
      useful: "Útil",
      doubt: "Duda"
    },
    debate: {
      noDebatesFound: "No se encontraron debates",
      tryOtherTerms: "Intenta con otros términos de búsqueda o propón un nuevo tema.",
      deleteDebate: "Eliminar debate",
      propose: "Proponer",
      proposeDebate: "Proponer Debate Clínico",
      discoverDebates: "Descubre y debate temas controversiales...",
      searchDiscussions: "Buscar discusiones, autores o temas...",
      newDebateProposal: "Nueva Propuesta de Debate",
      debateTitle: "Título del Debate",
      debateTitlePh: "Ej: Impacto de la IA en el diagnóstico radiológico",
      contentQuestion: "Contenido / Pregunta",
      contentQuestionPh: "Describe el tema o lanza una pregunta para iniciar la discusión...",
      linkOpt: "Enlace (Opcional)",
      doiOpt: "DOI (Opcional)",
      tags: "Etiquetas (Separadas por coma)",
      tagsPh: "Cardiología, IA, Ética",
      activeDebate: "Debate Activo"
    },
    apiKeyMissing: {
      title: "Configuración Necesaria",
      desc1: "Esta función avanzada requiere de una API Key de",
      desc2: "Puedes obtenerla en",
      desc3: "y luego configurarla en Ajustes.",
      optionalGroq: "Opcional: Obtén también tu clave de",
      optionalGroq2: "desde",
      optionalGroq3: "para otras funciones rápidas.",
      optionalGemini: "Opcional: Obtén también tu clave de",
      optionalGemini2: "desde",
      close: "Cerrar",
      configure: "Configurar"
    },
    auth: {
      login: "Iniciar Sesión",
      register: "Registrarse",
      createAccount: "Crear Cuenta",
      profVerification: "Verificación Profesional",
      medChallenge: "Reto Médico",
      reqSent: "¡Solicitud Enviada!",
      loginDesc: "Accede a tus artículos guardados y preferencias.",
      signupDesc1: "Únete para guardar artículos y personalizar tu experiencia.",
      signupDesc2: "Necesitamos validar tu identidad médica para darte acceso a la comunidad.",
      signupDesc3: "Demuestra tus conocimientos clínicos para completar el registro.",
      signupDesc4: "Revisa tu correo para confirmar tu cuenta. Tu perfil será validado pronto.",
      haveAccount: "¿Ya tienes cuenta? Inicia sesión",
      noAccount: "¿No tienes cuenta? Regístrate y Verifícate",
      logout: "Cerrar Sesión",
      welcomeBack: "Rápido de vuelta",
      enterEmail: "Ingresa tu email clínico",
      email: "Correo Electrónico Médico u Oficial",
      password: "Contraseña (Mínimo 6 caracteres)",
      medicalInfo: "Información Médica (Para validación)",
      continueParams: "Continuar con Registro Profesional",
      name: "Nombre Completo (Como aparece en licencia)",
      specialty: "Especialidad Médica",
      license: "Número de Licencia Médica / NPI",
      country: "País de Ejercicio",
      city: "Ciudad y Hospital Primario"
    },
    admin: {
      panel: "Panel de Administración",
      desc: "Verificación de Especialistas y Acceso",
      cantApprove: "¿No puedes aprobar usuarios o los usuarios no ven su estado?",
      sqlDesc: "Supabase usa políticas de seguridad (RLS). Si al aprobar un usuario este sigue como 'Pendiente' para él, necesitas actualizar las reglas de acceso. Ejecuta esto en tu SQL Editor:",
      copyRefresh: "Cópialo, ejecútalo en la web de Supabase y luego recarga esta tabla.",
      close: "Cerrar",
      filters: "Filtros",
      all: "Todos",
      pending: "Pendientes",
      verified: "Verificados",
      search: "Buscar usuario...",
      noUsers: "No se encontraron usuarios",
      name: "Usuario",
      country: "País",
      license: "Licencia / NPI",
      approve: "Aprobar",
      revoke: "Revocar",
      revoking: "Revocando...",
      approving: "Aprobando...",
      loading: "Cargando perfiles...",
      tip: "💡 Después de ejecutarlo, aprueba a los usuarios aquí y pídeles que recarguen la página.",
      noName: "Usuario sin nombre",
      email: "Correo:",
      licenseNum: "Licencia:",
      countryField: "País:",
      verifyAction: "Verificar",
      rejectAction: "Rechazar",
      unverifyAction: "Desverificar",
      errUpdate: "Error al actualizar el estado."
    },
    userMenu: {
      unverified: "No Verificado",
      pending: "Verificación Pendiente",
      verified: "Médico Verificado",
      digitalCard: "Credencial Digital",
      license: "Licencia:",
      country: "País:",
      logout: "Cerrar Sesión",
      unknownUser: "Usuario"
    },
    flashcard: {
      extracting: "Extrayendo PICO...",
      pLabel: "Paciente / Problema",
      iLabel: "Intervención",
      oLabel: "Resultado (Outcome)",
      noPico: "No se pudo extraer PICO",
      readFull: "Leer Completo",
      unknownAuthors: "Autores desconocidos"
    }
  },
  en: {
    discover: "Discover",
    library: "Library",
    history: "History",
    searchPlaceholder: "Search evidence...",
    welcome: "Welcome to",
    subtitle: "NephroUpdate",
    loading: "Analyzing evidence...",
    error: "Connection error.",
    saved: "Saved",
    removed: "Removed",
    libraryTitle: "Your Library",
    historyTitle: "Timeline",
    communityTitle: "Medical Community",
    communityDesc: "Clinical forums and impact surveys.",
    verifiedOnly: "Verified Physicians Only",
    fullTextError: "Could not extract full text.",
    openingReader: "Fetching Full Text...",
    analysisStopped: "Analysis stopped by user.",
    translating: "Translating to medical English...",
    picoTitle: "PICO Structured Search",
    picoDesc: "Define clinical question for precise query.",
    pLabel: "Patient / Problem",
    pPlaceholder: "e.g., Diabetic Nephropathy...",
    iLabel: "Intervention",
    iPlaceholder: "e.g., SGLT2 Inhibitors...",
    cLabel: "Comparison (Optional)",
    cPlaceholder: "e.g., Placebo...",
    oLabel: "Outcome (Optional)",
    oPlaceholder: "e.g., Outcome...",
    searchPico: "Generate & Search",
    searchingFor: "Searching for:",
    translatedFrom: "Translated from:",
    undo: "Undo (Use original)",
    proposeDebate: "Propose Debate",
    latestNews: "Latest News",
    settings: {
      title: "Settings",
      profStatus: "PROFESSIONAL STATUS",
      verified: "Verified",
      pending: "Pending",
      invalid: "Invalid",
      guest: "Guest",
      guestDesc: "Limited read-only access.",
      guestInitials: "US",
      createAccountTxt: "Create Account & Verify",
      verifyDesc: "To participate in impact surveys and clinical forums, we require professional license validation during registration.",
      pendingDesc: "We have received your credentials. Manual validation can take up to 24 hours.",
      verifiedDr: "DR",
      verifiedUser: "Dr.",
      verifiedDesc: "NPI Verified • Nephrology",
      filters: "SEARCH FILTERS",
      fullTextOnly: "Full Text Only (PMC)",
      fullTextDesc: "Show only articles available in PubMed Central.",
      bentoLayout: "Bento Grid Layout",
      bentoDesc: "Dynamic view with variable size cards.",
      searchMode: "SEARCH MODE",
      standardSearch: "Standard",
      standardDesc: "Technical sweep in 9 databases.",
      aiSearch: "AI",
      aiSearchDesc: "Analyzes results and generates executive synthesis.",
      connectivity: "CONNECTIVITY & SECURITY",
      apiKeyRequired: "Required for AI search, Voice Mode and Summaries.",
      groqDesc: "Low latency NLP for abstract re-writing and direct clinical language.",
      verifyBtn: "Verify",
      getGoogleAI: "Get from Google AI Studio",
      getGroq: "Get from console.groq.com",
      interfaceAndReading: "INTERFACE & READING",
      darkMode: "Dark Mode",
      darkModeDesc: "Inverted color scheme.",
      language: "Interface Language",
      langDesc: "Affects main menus and buttons.",
      contentLang: "Analysis Language (AI)",
      contentLangDesc: "Language Gemini and Groq use for synthesis.",
      aiProviderTitle: "AI Provider",
      aiProviderDesc: "Engine used for Critical Analysis and Voice Mode.",
      fontStyleTitle: "Font Style (Titles & Abstracts)",
      fontStyleStandard: "Standard (Inter)",
      fontStyleEditorial: "Editorial (Merriweather)",
      fontStyleModern: "Modern (Outfit)",
      newsTicker: "News Ticker",
      flashcardMode: "Flashcards Mode (Medical Shorts)",
      textSize: "TEXT SIZE",
      languages: "LANGUAGES",
      langEs: "Spanish",
      langEn: "English",
      langOriginal: "Original",
      syncWifi: "BACKGROUND WI-FI SYNC",
      syncDesc: "Automatically download full text of saved articles in the background when connected to Wi-Fi.",
      syncStatus: "Sync Status:",
      syncing: "Syncing...",
      syncReady: "Ready / Idle",
      syncProcessing: "Processing...",
      syncLast: "Last sync:",
      syncNever: "Not synced yet.",
      syncNow: "Sync Now",
      autoXrayTitle: "AUTO HIGHLIGHT",
      dataMaintenance: "DATA & MAINTENANCE",
      confirmDelete: "CONFIRM DELETION",
      cancel: "Cancel",
      clearSearchHistory: "Clear Search History",
      deleteAllArticles: "Delete All Saved Articles",
      factoryReset: "Factory Reset",
      areYouSure: "ARE YOU SURE? ALL DATA WILL BE LOST",
      yesReset: "YES, RESET",
      noReset: "NO",
      resetVerify: "Reset Verification (Debug)",
      infoHelp: "INFORMATION & HELP",
      currentVersion: "Current Version",
      viewFullInfo: "VIEW FULL INFO",
      pwaTitle: "INSTALL APPLICATION",
      pwaInstalled: "NephroUpdate is already installed!",
      pwaInstalledDesc: "You can open NephroUpdate directly from your home screen as a native app.",
      pwaInstallBtn: "Install NephroUpdate",
      pwaInstallDesc: "Install NephroUpdate on your device for quick one-tap access, full screen view, and better performance.",
      pwaIosTitle: "iOS Installation (Safari)",
      pwaIosDesc: "Tap the 'Share' button in Safari's bottom toolbar, then select 'Add to Home Screen'.",
      pwaManualTitle: "Manual installation",
      pwaManualDesc: "If the automatic option doesn't appear, open your browser menu (the three dots or toolbox) and select 'Install app' or 'Add to home screen'."
    },
    infoMenu: {
      navAndDock: "Navigation & Dock",
      discoverLabel: "Discover",
      discoverDesc: "Main article feed by topic.",
      historyLabel: "History",
      historyDesc: "Timeline of previous searches.",
      libraryLabel: "Library",
      libraryDesc: "Saved articles and offline reading.",
      voiceLabel: "Voice (AI)",
      voiceDesc: "Gemini Live assistant for voice commands.",
      communityLabel: "Community",
      communityDesc: "Medical social network, forums & surveys.",
      cloudSyncLabel: "Cloud Sync",
      cloudSyncDesc: "Cloud sync for your library.",
      studyTools: "Study Tools",
      saveOfflineLabel: "Save / Offline",
      saveOfflineDesc: "Download to read without internet.",
      notesLabel: "Personal Notes",
      notesDesc: "Add clinical observations.",
      debateLabel: "Clinical Debate",
      debateDesc: "Discuss articles with other physicians.",
      citeLabel: "Cite (APA)",
      citeDesc: "Copy bibliographic reference.",
      aiEnhanceLabel: "AI Enhance (Groq)",
      aiEnhanceDesc: "Rewrite abstract with clear language.",
      visualAbstractLabel: "Visual Abstract",
      visualAbstractDesc: "Generate flowchart (Mermaid).",
      relatedLabel: "Related",
      relatedDesc: "Search similar studies using AI.",
      fullTextFlowLabel: "Full Text Flow",
      fullTextFlowDesc: "Attempts to access the full text.",
      statusGlossary: "Status Glossary",
      highImpact: "High Impact / Trending",
      openAccess: "Open Access (Free)",
      offlineAvailable: "Available Offline",
      clinicalCapsule: "Clinical Capsule",
      clinicalTrial: "Clinical Trial",
      clinicalGuideline: "Clinical Guideline",
      searchEngineTitle: "Intelligent Search Engine",
      searchEngineIntro: "NephroUpdate uses a hybrid engine combining medical database precision with Generative AI flexibility.",
      neuralTranslationTitle: "Neural Translation:",
      neuralTranslationDesc: " You can type in Spanish (e.g. \"Nefropatía IgA\"). The system internally translates to English MeSH terms (\"IgA Glomerulonephritis\") to maximize results from PubMed and OpenAlex.",
      picoModeTitle: "PICO Mode:",
      picoModeDesc: " Uses structured search (Patient, Intervention, Comparison, Outcome) to generate complex boolean queries automatically.",
      groundingTitle: "Grounding:",
      groundingDesc: " Searches are verified against Google Search to include breaking news not yet indexed in PubMed.",
      aboutAppTitle: "About the Application",
      aboutAppDesc: "NephroUpdate is a high-level medical research discovery tool designed for nephrologists. It uses AI to crawl, filter, and synthesize the latest evidence from multiple biomedical databases.",
      medicalDirection: "Medical Direction & Development",
      role: "Nephrologist / Developer"
    },
    libraryEmptyTitle: "Your Personal Library",
    libraryEmptyDesc: "Sign in to save articles, sync your library across devices and access your personal notes.",
    loginToContinue: "Sign In to Continue",
    historyEmptyTitle: "Your Search Timeline",
    historyEmptyDesc: "Your previous searches and discoveries will automatically appear here once you sign in.",
    noArticlesFound: "No articles found",
    noArticlesDesc: "Try adjusting the filters or search to find what you need in your library.",
    resetFilters: "Reset Filters",
    legalNotice: "Legal Notice",
    legalDesc: "This application is a support tool for medical research and education. AI generated summaries may contain inaccuracies. Always verify the original source before making clinical decisions.",
    selectColleague: "Select Colleague",
    noColleagues: "No active colleagues found",
    sendingArticles: "Sending {counts} articles as direct message",
    generatingReport: "Generate Report",
    analyzingReport: "Analyzing...",
    scientificDevelopments: "What are the scientific developments?",
    synthesizingEvidence: "Synthesizing Evidence...",
    back: "Back",
    suggestions: "Suggestions",
    author: "Author",
    searchAuthor: "Search articles by author:",
    time: "Time",
    evidenceType: "Evidence Type",
    social: {
      proposeCase: "Propose a Clinical Case",
      takeToMainDebate: "Take to Main Debate",
      proposeArticle: "Propose Article",
      articleTitlePh: "Article Title...",
      linkPh: "Link / URL (optional)...",
      doiPh: "DOI (optional)...",
      sendProposal: "Send Proposal",
      beTheFirst: "Be the first to comment",
      activeDebate: "Active Debate",
      generalComments: "General Comments",
      aiAnalyzing: "AI Consultant analyzing...",
      aiModeratorAnalyzing: "AI Moderator analyzing bias...",
      invokeAI: "Invoke AI Consultant (Second Opinion)",
      invokeDevil: "Invoke Moderator (Devil's Advocate)",
      replyingTo: "Replying to @",
      writeReply: "Write your reply...",
      shareCase: "Share a case, question or comment...",
      addCritique: "Add your critique or comment...",
      loginToParticipate: "Sign in to participate",
      loginToParticipateDesc: "You must sign in to share your opinion in the Social Club",
      solid: "Solid",
      biased: "Biased",
      novel: "Novel",
      limited: "Limited",
      like: "Like",
      useful: "Useful",
      doubt: "Doubt"
    },
    debate: {
      noDebatesFound: "No debates found",
      tryOtherTerms: "Try other search terms or propose a new topic.",
      deleteDebate: "Delete debate",
      propose: "Propose",
      proposeDebate: "Propose Clinical Debate",
      discoverDebates: "Discover and debate controversial topics...",
      searchDiscussions: "Search discussions, authors or topics...",
      newDebateProposal: "New Debate Proposal",
      debateTitle: "Debate Title",
      debateTitlePh: "e.g.: Impact of AI on radiological diagnosis",
      contentQuestion: "Content / Question",
      contentQuestionPh: "Describe the topic or ask a question to start the discussion...",
      linkOpt: "Link (Optional)",
      doiOpt: "DOI (Optional)",
      tags: "Tags (Comma separated)",
      tagsPh: "Cardiology, AI, Ethics",
      activeDebate: "Active Debate"
    },
    apiKeyMissing: {
      title: "Configuration Required",
      desc1: "This advanced feature requires an API Key from",
      desc2: "You can get it at",
      desc3: "and then configure it in Settings.",
      optionalGroq: "Optional: Also get your",
      optionalGroq2: "key from",
      optionalGroq3: "for other fast features.",
      optionalGemini: "Optional: Also get your",
      optionalGemini2: "key from",
      close: "Close",
      configure: "Settings"
    },
    auth: {
      login: "Sign In",
      register: "Register",
      createAccount: "Create Account",
      profVerification: "Professional Verification",
      medChallenge: "Medical Challenge",
      reqSent: "Request Sent!",
      loginDesc: "Access your saved articles and preferences.",
      signupDesc1: "Join to save articles and personalize your experience.",
      signupDesc2: "We need to validate your medical identity to give you community access.",
      signupDesc3: "Demonstrate your clinical knowledge to complete registration.",
      signupDesc4: "Check your email to confirm your account. Your profile will be validated soon.",
      haveAccount: "Already have an account? Sign in",
      noAccount: "Don't have an account? Register and Verify",
      logout: "Sign Out",
      welcomeBack: "Welcome back",
      enterEmail: "Enter your clinical email",
      email: "Medical or Official Email",
      password: "Password (Minimum 6 characters)",
      medicalInfo: "Medical Information (For validation)",
      continueParams: "Continue with Professional Registration",
      name: "Full Name (As appears on license)",
      specialty: "Medical Specialty",
      license: "Medical License Number / NPI",
      country: "Country of Practice",
      city: "City and Primary Hospital"
    },
    admin: {
      panel: "Admin Panel",
      desc: "Specialist Verification and Access",
      cantApprove: "Can't approve users or users don't see their status?",
      sqlDesc: "Supabase uses Row Level Security (RLS). If a user remains 'Pending' after approval, you need to update access rules. Run this in your SQL Editor:",
      copyRefresh: "Copy it, run it on the Supabase website, and then reload this table.",
      close: "Close",
      filters: "Filters",
      all: "All",
      pending: "Pending",
      verified: "Verified",
      search: "Search user...",
      noUsers: "No users found",
      name: "User",
      country: "Country",
      license: "License / NPI",
      approve: "Approve",
      revoke: "Revoke",
      revoking: "Revoking...",
      approving: "Approving...",
      loading: "Loading profiles...",
      tip: "💡 After running it, approve users here and ask them to reload the page.",
      noName: "Unnamed user",
      email: "Email:",
      licenseNum: "License:",
      countryField: "Country:",
      verifyAction: "Verify",
      rejectAction: "Reject",
      unverifyAction: "Unverify",
      errUpdate: "Error updating status."
    },
    userMenu: {
      unverified: "Unverified",
      pending: "Verification Pending",
      verified: "Verified Physician",
      digitalCard: "Digital ID Card",
      license: "License:",
      country: "Country:",
      logout: "Sign Out",
      unknownUser: "User"
    },
    flashcard: {
      extracting: "Extracting PICO...",
      pLabel: "Patient / Problem",
      iLabel: "Intervention",
      oLabel: "Outcome",
      noPico: "Could not extract PICO",
      readFull: "Read Full Text",
      unknownAuthors: "Unknown authors"
    }
  },
};

const parseDateScore = (dateStr: string): number => {
  if (!dateStr || dateStr === "N/A") return 0;
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime())) return standardDate.getTime();
  const yearMatch = dateStr.match(/(20\d{2})/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[0]), 0, 1).getTime();
  }
  return 0;
};

const hybridSort = (
  articles: Article[],
  searchQuery: string = "",
  effectiveQuery: string = "",
) => {
  const currentYear = new Date().getFullYear();
  const recentThresholdYear = currentYear - 3;
  const query = searchQuery.trim().toLowerCase();

  // Extract keywords from effectiveQuery (English) or searchQuery (Spanish)
  const extractKeywords = (q: string) => {
    return Array.from(
      new Set(
        q
          .toLowerCase()
          .replace(/\b(and|or|not)\b/g, "")
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(
            (w) =>
              w.length > 2 &&
              ![
                "with",
                "this",
                "that",
                "from",
                "what",
                "when",
                "where",
                "your",
                "have",
                "were",
                "they",
                "about",
                "which",
                "the",
                "and",
                "for",
                "are",
                "was",
                "not",
                "but",
                "all",
                "any",
                "can",
                "has",
                "had",
                "how",
                "its",
                "out",
                "use",
                "who",
                "why",
                "you",
                "the",
                "and",
                "for",
                "are",
                "was",
                "not",
                "but",
                "all",
                "any",
                "can",
                "has",
                "had",
                "how",
                "its",
                "out",
                "use",
                "who",
                "why",
                "you",
                "their",
                "there",
                "then",
                "than",
                "these",
                "those",
              ].includes(w),
          ),
      ),
    );
  };

  const keywords = extractKeywords(effectiveQuery || query);

  const getKeywordScore = (a: Article) => {
    if (keywords.length === 0) return 0;
    const titleLower = a.title.toLowerCase();
    const summaryLower = a.summary.toLowerCase();
    const articleKeywords = (a.keywords || [])
      .map((k) => k.toLowerCase())
      .join(" ");

    let score = 0;
    let matchedKeywords = 0;

    keywords.forEach((kw) => {
      let matched = false;
      // Exact word boundary match in title is strongest
      if (new RegExp(`\\b${kw}\\b`).test(titleLower)) {
        score += 5;
        matched = true;
      } else if (titleLower.includes(kw)) {
        score += 3;
        matched = true;
      }

      // Keyword array match
      if (new RegExp(`\\b${kw}\\b`).test(articleKeywords)) {
        score += 4;
        matched = true;
      } else if (articleKeywords.includes(kw)) {
        score += 2;
        matched = true;
      }

      // Summary match
      if (new RegExp(`\\b${kw}\\b`).test(summaryLower)) {
        score += 2;
        matched = true;
      } else if (summaryLower.includes(kw)) {
        score += 1;
        matched = true;
      }

      if (matched) matchedKeywords++;
    });

    // Huge bonus if ALL keywords are found somewhere in the article
    if (matchedKeywords === keywords.length && keywords.length > 1) {
      score += 10;
    }

    return score;
  };

  return articles.sort((a, b) => {
    if (query) {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();

      // Exact match gets highest priority
      const exactMatchA = titleA === query;
      const exactMatchB = titleB === query;
      if (exactMatchA && !exactMatchB) return -1;
      if (!exactMatchA && exactMatchB) return 1;

      // Contains exact query as substring gets second priority
      const containsA = titleA.includes(query);
      const containsB = titleB.includes(query);
      if (containsA && !containsB) return -1;
      if (!containsA && containsB) return 1;

      // Keyword score gets third priority
      const kwScoreA = getKeywordScore(a);
      const kwScoreB = getKeywordScore(b);

      // Prioritize relevance over tier if there's a clear winner in keyword matching
      if (kwScoreA !== kwScoreB) {
        // If the difference is significant, or if one has all keywords and the other doesn't
        if (
          Math.abs(kwScoreA - kwScoreB) >= 5 ||
          (kwScoreA > 10 && kwScoreB <= 10) ||
          (kwScoreB > 10 && kwScoreA <= 10)
        ) {
          // Check if one is significantly a better journal before pushing down
          const tierA = getArticleImpactTier(a);
          const tierB = getArticleImpactTier(b);
          // Don't strongly penalize a Tier 1 or Tier 2 journal just because of missing exact keywords
          if (tierB <= 2 && tierA > 2 && kwScoreB === 0 && kwScoreA < 5) return 1;
          if (tierA <= 2 && tierB > 2 && kwScoreA === 0 && kwScoreB < 5) return -1;
          
          return kwScoreB - kwScoreA;
        }
      }
    }

    const relA = a.relevanceScore || 0;
    const relB = b.relevanceScore || 0;
    
    // Sort primarily by calculated clinical relevance (significant difference)
    if (Math.abs(relA - relB) >= 5) {
      return relB - relA;
    }

    const tierA = getArticleImpactTier(a);
    const tierB = getArticleImpactTier(b);
    if (tierA === 0 && tierB !== 0) return -1;
    if (tierB === 0 && tierA !== 0) return 1;
    const dateA = parseDateScore(a.date);
    const dateB = parseDateScore(b.date);
    const yearA = new Date(dateA).getFullYear();
    const yearB = new Date(dateB).getFullYear();
    const isRecentA = yearA >= recentThresholdYear;
    const isRecentB = yearB >= recentThresholdYear;
    if (isRecentA && !isRecentB) return -1;
    if (!isRecentA && isRecentB) return 1;
    if (tierA !== tierB) return tierA - tierB;
    return dateB - dateA;
  });
};

function MainApp() {
  const {
    user,
    signOut,
    verificationStatus,
    updateVerificationStatus,
    isAdmin,
  } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "discover" | "saved" | "history" | "community" | "admin"
  >("discover");
  const [direction, setDirection] = useState(0);
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS);
  const [topicQueries, setTopicQueries] = useState<Record<string, string>>({});
  const [selectedTopic, setSelectedTopic] = useState<Topic>("General");
  const [topicCache, setTopicCache] = useState<Record<string, ResearchUpdate>>(
    {},
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false); // New State for manual synthesis
  const [error, setError] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [readArticles, setReadArticles] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("es");
  const [contentLanguage, setContentLanguage] = useState<Language>("es");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem("nephro_layout_mode");
    return (saved as LayoutMode) || "standard";
  });
  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>(
    {},
  );
  const [syncState, setSyncState] = useState<SyncState>(backgroundSyncService.getState());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    return localStorage.getItem("hideInstallBanner") !== "true";
  });

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem("hideInstallBanner", "true");
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast("¡Aplicación instalada con éxito!", "success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = backgroundSyncService.subscribe((state) => {
      setSyncState(state);
      updateOfflineStatusMap();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (savedArticles.length > 0 && syncState.isEnabled) {
      backgroundSyncService.assessAndTriggerSync();
    }
  }, [savedArticles, syncState.isEnabled]);

  const prevUserRef = useRef(user);

  // Clear library and history on logout
  useEffect(() => {
    if (prevUserRef.current && !user) {
      setSavedArticles([]);
      setHistory([]);
      setReadArticles({});
      // Clear localStorage explicitly just in case
      localStorage.removeItem("ne_saved");
      localStorage.removeItem("ne_hist");
      localStorage.removeItem("ne_read");
    }
    prevUserRef.current = user;
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const getUserDisplayName = () => {
    if (!user) return "";
    const fullName = user.user_metadata?.full_name;
    if (fullName) return fullName;
    return user.email?.split("@")[0] || "Usuario";
  };

  const getUserInitials = () => {
    if (!user) return "";
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      return fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return user.email?.[0].toUpperCase() || "U";
  };
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const [libraryFilter, setLibraryFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDesign, setFilterDesign] = useState<StudyDesign[]>([]);
  const [filterTier, setFilterTier] = useState<number>(4);
  const [libraryTopicFilter, setLibraryTopicFilter] = useState<string>("All");
  const [historyTopicFilter, setHistoryTopicFilter] = useState<string>("All");

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("standard");
  const [activeImmersiveArticle, setActiveImmersiveArticle] =
    useState<Article | null>(null);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [searchModalTab, setSearchModalTab] = useState<"text" | "pico">("text");
  const [picoData, setPicoData] = useState({ p: "", i: "", c: "", o: "" });

  const [visibleCount, setVisibleCount] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [activeSources, setActiveSources] = useState<
    Record<DataSource, boolean>
  >({
    pubmed: true,
    openalex: true,
    europepmc: true,
    semanticscholar: true,
    clinicaltrials: true,
    core: true,
    doaj: true,
    elsevier: true,
    lilacs: true,
  });
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(
    null,
  );
  const [viewingHistorySnapshot, setViewingHistorySnapshot] =
    useState<HistorySnapshot | null>(null);

  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [communitySubTab, setCommunitySubTab] = useState<"inbox" | "debates">(
    "debates",
  );
  const [isLibrarySelectionMode, setIsLibrarySelectionMode] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [communityUsers, setCommunityUsers] = useState<
    { id: string; name: string; specialty: string }[]
  >([]);
  const [selectedLibraryArticles, setSelectedLibraryArticles] = useState<
    string[]
  >([]);
  const [readerArticle, setReaderArticle] = useState<Article | null>(null);
  const [readerHtml, setReaderHtml] = useState("");
  const [isReaderLoading, setIsReaderLoading] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [missingProvider, setMissingProvider] = useState<"gemini" | "groq" | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isLanguageSelectOpen, setIsLanguageSelectOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>("gemini");
  const [autoXray, setAutoXray] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiStatus, setGeminiStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");

  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqStatus, setGroqStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");

  const [elsevierApiKey, setElsevierApiKey] = useState("");
  const [coreApiKey, setCoreApiKey] = useState("");
  const [s2ApiKey, setS2ApiKey] = useState("");
  const [textSize, setTextSize] = useState<TextSize>("base");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) {
      showToast("La instalación automática no está disponible en este momento. Consulta las instrucciones.", "error");
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } catch (error) {
      console.error("PWA Installation failed:", error);
    }
  }, [deferredPrompt, showToast]);

  const [fontStyle, setFontStyle] = useState<FontStyle>("sans");
  const [onlyFullText, setOnlyFullText] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [showNewsFeed, setShowNewsFeed] = useState(true);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);

  const [sidebarDeletePending, setSidebarDeletePending] = useState<
    string | null
  >(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    "history" | "factory" | null
  >(null);

  const [translationNotice, setTranslationNotice] = useState<{
    original: string;
    translated: string;
  } | null>(null);

  const [topContributors, setTopContributors] = useState<
    { name: string; specialty: string; score: number }[]
  >([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    "KDIGO 2024 Implementation",
    "SGLT2i in Transplant",
    "Finerenone Real World Data",
  ]);

  const {
    data: proposedDebates = [],
    isLoading: loadingDebates,
    refetch: refetchDebates,
  } = useQuery({
    queryKey: ["debates"],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("forums")
        .select("*")
        .not("id", "ilike", "dm:%")
        .not("id", "ilike", "dm_shared:%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      const forumIds = data.map((d: any) => d.id);
      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", forumIds);

      const commentCounts =
        commentsData?.reduce((acc: any, curr: any) => {
          if (curr.post_id) {
            acc[curr.post_id] = (acc[curr.post_id] || 0) + 1;
          }
          return acc;
        }, {}) || {};

      const formattedDebates = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        author: d.author_name,
        author_id: d.author_id,
        authorSpecialty: d.author_specialty,
        createdAt: d.created_at,
        replies: commentCounts[d.id] || d.replies_count || 0,
        likes: d.likes_count || 0,
        tags: d.tags || [],
        url: d.url,
        doi: d.doi,
        article_id: d.article_id,
      }));

      // Ensure General Forum is always present
      const hasGeneral = formattedDebates.some(
        (d: any) => d.id === "general-community-forum",
      );
      if (!hasGeneral) {
        formattedDebates.unshift({
          id: "general-community-forum",
          title: "Foro Clínico General",
          content:
            "Espacio abierto para consultas, casos clínicos y discusión general de la comunidad.",
          author: "Comunidad NephroUpdate",
          author_id: "system",
          authorSpecialty: "Moderación",
          createdAt: new Date().toISOString(),
          replies: 124,
          likes: 450,
          tags: ["General", "Casos", "Consultas"],
          url: "",
          doi: "",
          article_id: "",
        });
      }

      return formattedDebates;
    },
    enabled: !!supabase,
  });

  const {
    data: collaborations = [],
    isLoading: loadingCollaborations,
    refetch: refetchCollaborations,
  } = useQuery({
    queryKey: ["collaborations", user?.id],
    enabled: !!user?.id && !!supabase,
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("forums")
        .select("*")
        .ilike("id", `dm_shared:%${user.id}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      const forumIds = data.map((d: any) => d.id);
      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", forumIds);

      const commentCounts =
        commentsData?.reduce((acc: any, curr: any) => {
          if (curr.post_id) {
            acc[curr.post_id] = (acc[curr.post_id] || 0) + 1;
          }
          return acc;
        }, {}) || {};

      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        author: d.author_name,
        specialty: d.author_specialty,
        date: d.created_at,
        replies: commentCounts[d.id] || d.replies_count || 0,
        likes: d.likes_count || 0,
        tags: d.tags || [],
      }));
    },
  });

  const [selectedDebate, setSelectedDebate] = useState<ForumPost | null>(null);
  const [selectedCollaboration, setSelectedCollaboration] = useState<
    any | null
  >(null);

  // --- SUPABASE TOPICS PERSISTENCE ---
  useEffect(() => {
    if (user && supabase) {
      fetchUserTopics(user.id);
    } else {
      setTopics(DEFAULT_TOPICS);
    }
  }, [user]);

  const fetchUserTopics = async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("user_topics")
      .select("topic")
      .eq("user_id", userId);
    if (error) {
      console.error("Error fetching topics:", error);
      return;
    }
    const customTopics = data.map((d) => d.topic);
    setTopics([...DEFAULT_TOPICS, ...customTopics]);
  };

  const addTopicToSupabase = async (topic: string) => {
    if (!supabase || !user) return;
    const { error } = await supabase
      .from("user_topics")
      .insert([{ user_id: user.id, topic }]);
    if (error) {
      console.error("Error adding topic:", error);
    }
  };

  const removeTopicFromSupabase = async (topic: string) => {
    if (!supabase || !user) return;
    const { error } = await supabase
      .from("user_topics")
      .delete()
      .eq("user_id", user.id)
      .eq("topic", topic);
    if (error) {
      console.error("Error removing topic:", error);
    }
  };
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topicRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const topicContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const touchStartY = useRef(0);

  const t = translations[uiLanguage];

  const isBackNavigationRef = useRef(false);
  const programmaticBacksRef = useRef(0);
  const activeModalsCountRef = useRef(0);

  const currentModalsCount = [
    isFlashcardMode,
    !!activeImmersiveArticle,
    isReaderOpen,
    !!viewingHistorySnapshot
  ].filter(Boolean).length;

  useEffect(() => {
    if (currentModalsCount > activeModalsCountRef.current) {
      const diff = currentModalsCount - activeModalsCountRef.current;
      for (let i = 0; i < diff; i++) {
        window.history.pushState({ modalOpen: true }, "");
      }
    } else if (currentModalsCount < activeModalsCountRef.current) {
      if (!isBackNavigationRef.current) {
        const diff = activeModalsCountRef.current - currentModalsCount;
        for (let i = 0; i < diff; i++) {
          programmaticBacksRef.current++;
          setTimeout(() => window.history.back(), 0);
        }
      }
    }
    activeModalsCountRef.current = currentModalsCount;
    isBackNavigationRef.current = false;
  }, [currentModalsCount]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (programmaticBacksRef.current > 0) {
        programmaticBacksRef.current--;
        return;
      }
      isBackNavigationRef.current = true;
      if (activeImmersiveArticle) {
        setActiveImmersiveArticle(null);
      } else if (isFlashcardMode) {
        setIsFlashcardMode(false);
      } else if (viewingHistorySnapshot) {
        setViewingHistorySnapshot(null);
      } else if (isReaderOpen) {
        setIsReaderOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeImmersiveArticle, isFlashcardMode, viewingHistorySnapshot, isReaderOpen]);

  // Prevent accidental closure of the app
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome and standard require returnValue to be set.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("nephro_layout_mode", layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeBtn = topicRefs.current[selectedTopic];
      if (activeBtn && topicContainerRef.current) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedTopic, topics]);

  // Handle Scroll to Top logic with "Liquid Crystal" button behavior
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const currentScroll = el.scrollTop;

      // Show button if scrolled down > 400px
      setShowScrollTop(currentScroll > 400);

      // Smart Scroll Logic: Hide dock/header on scroll down, show on scroll up
      if (currentScroll > lastScrollY.current + 10) {
        setIsScrollingDown(true);
      } else if (currentScroll < lastScrollY.current - 10) {
        setIsScrollingDown(false);
      }

      // Always show if near top
      if (currentScroll <= 50) {
        setIsScrollingDown(false);
      }

      lastScrollY.current = currentScroll;

      // Detect Scrolling Activity to hide button during displacement
      setIsUserScrolling(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 300); // 300ms delay to reappear after stop
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Smart Cache Writer: Automatically saves successful results to cache
  useEffect(() => {
    if (!loading && articles.length > 0 && selectedTopic && !searchQuery) {
      setTopicCache((prev) => ({
        ...prev,
        [selectedTopic]: {
          articles,
          summary,
          searchMode,
          language: contentLanguage,
        },
      }));
    }
  }, [
    articles,
    summary,
    loading,
    selectedTopic,
    searchQuery,
    searchMode,
    contentLanguage,
  ]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextTopic = useCallback(() => {
    const currentIndex = topics.indexOf(selectedTopic);
    if (currentIndex < topics.length - 1) {
      handleTopicClick(topics[currentIndex + 1]);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [selectedTopic, topics]);

  const handlePrevTopic = useCallback(() => {
    const currentIndex = topics.indexOf(selectedTopic);
    if (currentIndex > 0) {
      handleTopicClick(topics[currentIndex - 1]);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [selectedTopic, topics]);

  const startLongPress = (action: () => void) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
      action();
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const updateOfflineStatusMap = async () => {
    const map = await getOfflineStatusMap();
    setOfflineStatus(map);
  };

  const handleFetchFullText = useCallback(
    async (article: Article) => {
      const offline = await getOfflineArticle(article.id);
      if (offline && offline.hasFullText) {
        setReaderArticle(article);
        setReaderHtml(offline.htmlContent);
        setIsReaderOpen(true);
        setIsReaderLoading(false);
        return;
      }
      setReaderArticle(article);
      setReaderHtml("");
      setIsReaderOpen(true);
      setIsReaderLoading(true);
      try {
        const content = await fetchArticleContent(article);
        setReaderHtml(content.html);
      } catch (err) {
        setReaderHtml(
          `<div style="padding: 40px; text-align: center;"><h3>${t.fullTextError}</h3><p>Intenta abrirlo en la web original.</p></div>`,
        );
      } finally {
        setIsReaderLoading(false);
      }
    },
    [t.fullTextError],
  );

  const handleSaveOffline = useCallback(
    async (article: Article, html: string) => {
      await saveArticleOffline(article, html, true);
      setSavedArticles((prev) => {
        if (prev.some((a) => a.id === article.id)) return prev;
        return [article, ...prev];
      });
      await updateOfflineStatusMap();
      if (navigator.vibrate) navigator.vibrate(50);
    },
    [],
  );

  const handleManualSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsManualSearchOpen(false);
    setActiveTab("discover");
    setSearchQuery(term);
    setSuggestions([]);
    setTranslationNotice(null);
    setCurrentPage(1);

    // Reset scroll position to top
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    const newTopic = term.trim();
    if (!topics.includes(newTopic)) {
      setTopics((prev) => [...prev, newTopic]);
      if (user && !DEFAULT_TOPICS.includes(newTopic))
        addTopicToSupabase(newTopic);
    }
    setSelectedTopic(newTopic);

    setLoading(true);
    setArticles([]);
    setSummary("");

    try {
      let finalQuery = newTopic;
      if (!newTopic.toUpperCase().startsWith("AUTHOR:")) {
          finalQuery = await translateManualQueryWithoutAI(newTopic);
      }
      const translatedQuery = finalQuery;
      if (translatedQuery.toLowerCase() !== newTopic.toLowerCase()) {
        setTranslationNotice({
          original: newTopic,
          translated: translatedQuery,
        });
      }
      setTopicQueries((prev) => ({ ...prev, [newTopic]: translatedQuery }));
      await fetchNews(newTopic, translatedQuery, undefined, undefined, true);
    } catch (e) {
      setTopicQueries((prev) => ({ ...prev, [newTopic]: newTopic }));
      await fetchNews(newTopic, newTopic, undefined, undefined, true);
    }
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 3) {
      setIsFetchingSuggestions(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await fetchClinicalSuggestions(value, geminiApiKey);
          setSuggestions(results);
        } catch (error) {
          console.error("Failed to fetch suggestions", error);
          setSuggestions([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      }, 500);
    } else {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
    }
  };

  const handleToolCall = async (name: string, args: any) => {
    switch (name) {
      case 'saveArticlesByTopic': {
        const topic = args.topic.toLowerCase();
        let count = 0;
        const toSave = articles.filter(a => (a.title + " " + a.summary).toLowerCase().includes(topic));
        for (const a of toSave) {
          if (!savedArticles.some(sa => sa.id === a.id)) {
            toggleSave(a);
            count++;
          }
        }
        return { success: true, savedCount: count };
      }
      case 'getAllArticlesContent':
        return { articles: articles.map(a => ({ title: a.title, summary: a.summary })) };
      case 'getNewsForTopic':
        handleTopicClick(args.topic);
        return { result: `Navegando a ${args.topic} y buscando artículos. Informa al usuario que la búsqueda ha comenzado.` };
      case 'changeTopic':
        handleTopicClick(args.topic);
        return { success: true };
      case 'navigateTab':
        setActiveTab(args.tab);
        return { success: true };
      case 'searchArticles':
        handleManualSearch(args.query);
        return { success: true };
      default:
        return { error: 'Unknown tool' };
    }
  };

  const handlePicoSearch = async () => {
    setIsManualSearchOpen(false);
    setLoading(true);
    setArticles([]);
    setSummary("");
    setTranslationNotice(null);
    setCurrentPage(1);

    // Reset scroll position to top
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    try {
      const refined = await refinePicoTerms(
        picoData.p,
        picoData.i,
        picoData.c,
        picoData.o,
        geminiApiKey,
      );
      const query = `(${refined.p}) AND (${refined.i}) ${refined.c ? `AND (${refined.c})` : ""} ${refined.o ? `AND (${refined.o})` : ""}`;
      const shortP =
        picoData.p.length > 25
          ? picoData.p.substring(0, 25) + "..."
          : picoData.p;
      const topicName = `PICO: ${shortP}`;

      if (!topics.includes(topicName)) {
        setTopics((prev) => [...prev, topicName]);
        if (user && !DEFAULT_TOPICS.includes(topicName))
          addTopicToSupabase(topicName);
      }
      setSelectedTopic(topicName);
      setSearchQuery(query);
      setTopicQueries((prev) => ({ ...prev, [topicName]: query }));

      setTranslationNotice({
        original: `P: ${picoData.p} I: ${picoData.i}`,
        translated: query,
      });
      fetchNews(topicName, query, undefined, undefined, true);
    } catch (e) {
      const rawQuery = `(${picoData.p}) AND (${picoData.i})`;
      const shortP =
        picoData.p.length > 25
          ? picoData.p.substring(0, 25) + "..."
          : picoData.p;
      const topicName = `PICO: ${shortP}`;

      if (!topics.includes(topicName)) {
        setTopics((prev) => [...prev, topicName]);
        if (user && !DEFAULT_TOPICS.includes(topicName))
          addTopicToSupabase(topicName);
      }
      setSelectedTopic(topicName);
      setSearchQuery(rawQuery);
      setTopicQueries((prev) => ({ ...prev, [topicName]: rawQuery }));

      fetchNews(topicName, rawQuery, undefined, undefined, true);
    }
  };

  const handleUndoTranslation = () => {
    if (translationNotice) {
      // Wrap in parentheses to prevent re-translation
      const queryToPass = `(${translationNotice.original})`;
      fetchNews(selectedTopic, queryToPass, undefined, undefined, true);
      setTranslationNotice(null);
    }
  };

  const handleCloseTopic = (topic: string) => {
    finalizeTopicDeletion(topic);
  };

  const toggleFilterDesign = (design: StudyDesign) => {
    setFilterDesign((prev) =>
      prev.includes(design)
        ? prev.filter((d) => d !== design)
        : [...prev, design],
    );
  };

  const availableLibraryTopics = useMemo(() => {
    const topics = new Set(savedArticles.map((a) => a.topic || "General"));
    return ["All", ...Array.from(topics)];
  }, [savedArticles]);

  const availableHistoryTopics = useMemo(() => {
    const topics = new Set(history.map((h) => h.topic));
    return ["All", ...Array.from(topics)];
  }, [history]);

  const filteredArticles = useMemo(() => {
    let result = articles;

    if (filterDesign.length > 0) {
      result = result.filter((a) =>
        filterDesign.includes(detectStudyDesign(a)),
      );
    }
    if (filterTier < 4) {
      result = result.filter((a) => {
        const tier = getArticleImpactTier(a);
        return tier <= filterTier;
      });
    }
    return result;
  }, [
    articles,
    filterDesign,
    filterTier,
  ]);

  const debouncedLibraryFilter = useDebounce(libraryFilter, 300);
  const debouncedHistoryFilter = useDebounce(historyFilter, 300);

  const filteredSavedArticles = useMemo(() => {
    let result = savedArticles;
    if (debouncedLibraryFilter.trim()) {
      const lowSearch = debouncedLibraryFilter.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(lowSearch) ||
          a.source.toLowerCase().includes(lowSearch) ||
          (a.note && a.note.toLowerCase().includes(lowSearch)),
      );
    }
    if (filterDesign.length > 0) {
      result = result.filter((a) =>
        filterDesign.includes(detectStudyDesign(a)),
      );
    }
    if (filterTier < 4) {
      result = result.filter((a) => getArticleImpactTier(a) <= filterTier);
    }
    if (libraryTopicFilter !== "All") {
      result = result.filter(
        (a) => (a.topic || "General") === libraryTopicFilter,
      );
    }
    return hybridSort([...result], debouncedLibraryFilter);
  }, [
    savedArticles,
    debouncedLibraryFilter,
    filterDesign,
    filterTier,
    libraryTopicFilter,
  ]);

  const filteredHistory = useMemo(() => {
    let result = history;
    if (debouncedHistoryFilter.trim()) {
      const lowSearch = debouncedHistoryFilter.toLowerCase();
      result = result.filter(
        (h) =>
          h.topic.toLowerCase().includes(lowSearch) ||
          (h.query && h.query.toLowerCase().includes(lowSearch)),
      );
    }
    if (historyTopicFilter !== "All") {
      result = result.filter((h) => h.topic === historyTopicFilter);
    }
    return result;
  }, [history, debouncedHistoryFilter, historyTopicFilter]);

  const handleTopicClick = (topic: Topic) => {
    // Reset scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    const isManualTopic = !DEFAULT_TOPICS.includes(topic);
    const queryToPass = isManualTopic ? topicQueries[topic] || topic : "";

    if (selectedTopic === topic && activeTab === "discover") {
      fetchNews(topic, queryToPass, undefined, undefined, true);
    } else {
      const currentIndex = topics.indexOf(selectedTopic);
      const newIndex = topics.indexOf(topic);
      setDirection(newIndex > currentIndex ? 1 : -1);
      setSelectedTopic(topic);
      setSearchQuery(queryToPass);
      setTranslationNotice(null);
      setCurrentPage(1);
      setActiveTab("discover");
      // Fix: Pass queryToPass explicitly to ensure query is cleared or set correctly
      fetchNews(topic, queryToPass, undefined, undefined, false);
    }
  };

  useEffect(() => {
    const fetchSidebarData = async () => {
      if (!supabase) return;

      try {
        // Fetch Top Contributors (simplified: last 200 comments and group by user)
        const { data: comments, error: cError } = await supabase
          .from("comments")
          .select("user_name, user_specialty, user_id")
          .order("created_at", { ascending: false })
          .limit(200);

        if (!cError && comments) {
          const counts: Record<
            string,
            { name: string; specialty: string; count: number }
          > = {};
          comments.forEach((c) => {
            if (!counts[c.user_id]) {
              counts[c.user_id] = {
                name: c.user_name,
                specialty: c.user_specialty,
                count: 0,
              };
            }
            counts[c.user_id].count += 1;
          });

          const sorted = Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((c) => ({
              name: c.name,
              specialty: c.specialty,
              score: c.count * 10 + 5,
            }));

          if (sorted.length > 0) setTopContributors(sorted);
        }
      } catch (err) {
        console.error("Error fetching sidebar data:", err);
      }
    };

    if (activeTab === "community") {
      fetchSidebarData();
    }
  }, [activeTab]);

  const fetchNews = async (
    overrideTopic?: string,
    overrideQuery?: string,
    overrideSearchMode?: SearchMode,
    overrideLanguage?: Language,
    forceRefresh = false,
    years = 3,
    page = 1,
  ) => {
    const topicToUse = overrideTopic || selectedTopic;
    const queryToUse =
      overrideQuery !== undefined ? overrideQuery : searchQuery;
    const modeToUse = overrideSearchMode || searchMode;
    const langToUse = overrideLanguage || contentLanguage;
    const yearsToFetch = forceRefresh ? 20 : years;

    // Smart Cache Check: Must match Topic + Search Mode + Language
    const cached = topicCache[topicToUse];
    const isCacheValid =
      cached &&
      cached.searchMode === modeToUse &&
      cached.language === langToUse;

    if (!forceRefresh && page === 1 && !queryToUse && isCacheValid) {
      setArticles(cached.articles);
      setSummary(cached.summary);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);
    if (page === 1) {
      setArticles([]);
      setSummary("");
      setVisibleCount(forceRefresh ? 50 : 20);
    }

    try {
      const baseSearchTerm = queryToUse || topicToUse;
      let effectiveQuery = queryToUse;
      
      let parsedYears = yearsToFetch;
      let cleanedTerm = baseSearchTerm;
      
      if (cleanedTerm?.includes("Last 6 months")) {
          parsedYears = 1;
          cleanedTerm = cleanedTerm.replace("Last 6 months", "").replace(/\s+/g, " ").trim();
          effectiveQuery = effectiveQuery?.replace("Last 6 months", "").replace(/\s+/g, " ").trim();
      } else if (cleanedTerm?.includes("2025-2026")) {
          parsedYears = 2;
          cleanedTerm = cleanedTerm.replace("2025-2026", "").replace(/\s+/g, " ").trim();
          effectiveQuery = effectiveQuery?.replace("2025-2026", "").replace(/\s+/g, " ").trim();
      }

      const extractedDesigns: string[] = [];
      ["RCT", "Guideline", "Meta-Analysis"].forEach(design => {
          if (cleanedTerm?.includes(design)) {
              extractedDesigns.push(design);
              cleanedTerm = cleanedTerm.replace(design, "").replace(/\s+/g, " ").trim();
              effectiveQuery = effectiveQuery?.replace(design, "").replace(/\s+/g, " ").trim();
          }
      });

      const isAuthorSearch = cleanedTerm?.startsWith("AUTHOR:");
      const finalYearsToFetch = isAuthorSearch ? undefined : parsedYears;

      const needsTranslation =
        cleanedTerm &&
        !isAuthorSearch &&
        !cleanedTerm.includes("(") &&
        !cleanedTerm.includes("AND") &&
        !cleanedTerm.includes("[MeSH]") &&
        !cleanedTerm.includes("[Title]");
      const isManualSearch = !!queryToUse;

      if (needsTranslation && (isManualSearch || modeToUse === "ai")) {
        setSummary(t.translating);
        effectiveQuery = await translateManualQueryWithoutAI(cleanedTerm);
      }

      const combinedDesigns = Array.from(new Set([...filterDesign, ...extractedDesigns]));
      if (combinedDesigns.length > 0) {
        const filterTerms = combinedDesigns
          .map((d) => {
            if (d === "RCT")
              return '("Randomized Controlled Trial" OR "Clinical Trial" OR "Ensayo Clinico")';
            if (d === "Meta-Analysis")
              return '("Meta-Analysis" OR "Systematic Review" OR "Metaanalisis")';
            if (d === "Case Report")
              return '("Case Report" OR "Case Series" OR "Reporte de Caso")';
            if (d === "Guideline")
              return '("Guideline" OR "Practice Guideline" OR "Consensus" OR "Guia de Practica")';
            if (d === "Review") return '("Review" OR "Revision")';
            return "";
          })
          .filter((t) => t !== "")
          .join(" OR ");

        if (filterTerms) {
          effectiveQuery = effectiveQuery
            ? `(${effectiveQuery}) AND (${filterTerms})`
            : `(${topicToUse}) AND (${filterTerms})`;
        }
      }

      const sourcePromises: Promise<ResearchUpdate>[] = [];
      const offset = (page - 1) * 200;
      const sortPref: 'date' | 'relevance' = isManualSearch ? 'relevance' : 'date';

      if (page === 1) {
        if (activeSources.pubmed)
          sourcePromises.push(
            fetchPubMedArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              finalYearsToFetch,
              offset,
              onlyFullText,
              sortPref
            ),
          );
        if (activeSources.openalex)
          sourcePromises.push(
            fetchOpenAlexArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              finalYearsToFetch,
              offset,
              sortPref
            ),
          );
        if (activeSources.europepmc)
          sourcePromises.push(
            fetchEuropePmcArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              finalYearsToFetch,
              onlyFullText,
            ),
          );
        if (activeSources.semanticscholar)
          sourcePromises.push(
            fetchSemanticScholarArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              s2ApiKey,
              finalYearsToFetch
            )
          );
        if (activeSources.clinicaltrials)
          sourcePromises.push(
            fetchClinicalTrials(topicToUse, langToUse, effectiveQuery),
          );
        if (activeSources.core)
          sourcePromises.push(
            fetchCoreArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              coreApiKey,
              sortPref
            ),
          );
        if (activeSources.doaj)
          sourcePromises.push(
            fetchDoajArticles(topicToUse, langToUse, effectiveQuery),
          );
        if (activeSources.elsevier)
          sourcePromises.push(
            fetchElsevierArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              elsevierApiKey,
              sortPref
            ),
          );
        if (activeSources.lilacs)
          sourcePromises.push(
            fetchLilacsArticles(topicToUse, langToUse, effectiveQuery, sortPref),
          );

        if (modeToUse === "ai") {
          sourcePromises.push(
            searchMedicalGoogle(
              effectiveQuery || baseSearchTerm,
              langToUse,
              geminiApiKey,
            ),
          );
        }
      } else {
        if (activeSources.pubmed)
          sourcePromises.push(
            fetchPubMedArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              finalYearsToFetch,
              offset,
              onlyFullText,
              sortPref
            ),
          );
        if (activeSources.openalex)
          sourcePromises.push(
            fetchOpenAlexArticles(
              topicToUse,
              langToUse,
              effectiveQuery,
              finalYearsToFetch,
              offset,
              sortPref
            ),
          );
      }

      let completedCount = 0;
      sourcePromises.forEach((promise) => {
        promise
          .then((update) => {
            if (currentSignal.aborted) return;
            if (update.articles.length > 0) {
              setArticles((prev) => {
                const combined = [...prev, ...update.articles];
                const seenTitles = new Set();
                const kidneyRequired = ["kidney", "renal", "nephrology", "dialysis", "glomerular", "transplant", "urine", "AKI", "CKD"];
                const unique = combined.filter((a) => {
                  const normTitle = a.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                    .slice(0, 60);
                  if (seenTitles.has(normTitle)) return false;
                  seenTitles.add(normTitle);
                  
                  // Final aggressive safety net: If relevanceScore is extremely low and no nephrology keywords exist, drop it
                  // Skip this for author searches where papers might not explicitly mention kidney in title/abstract
                  // Also skip this for absolute manual searches to avoid hiding explicitly requested results
                  if (!isManualSearch && (a.relevanceScore || 0) < 10 && !(effectiveQuery && effectiveQuery.startsWith("AUTHOR:"))) {
                      const textToSearch = (a.title + " " + (a.summary || '')).toLowerCase();
                      const hasKidneyTerm = kidneyRequired.some(k => textToSearch.includes(k.toLowerCase()));
                      if (!hasKidneyTerm) return false;
                  }
                  
                  return true;
                });
                return hybridSort(
                  unique,
                  queryToUse || topicToUse,
                  effectiveQuery,
                );
              });
            }
          })
          .finally(() => {
            completedCount++;
            if (completedCount === sourcePromises.length) {
              if (modeToUse === "ai" && page === 1) {
                setArticles((currentArticles) => {
                  if (currentArticles.length > 0) {
                    generateGeminiSummary(
                      currentArticles,
                      topicToUse,
                      langToUse,
                      geminiApiKey,
                    ).then((aiSummary) => setSummary(aiSummary));
                  }
                  return currentArticles;
                });
              }
              setLoading(false);
              if (articles.length > 0 && page === 1) {
                setHistory((prev) => {
                  const currentQuery = queryToUse || topicToUse;
                  const latest = prev[0];

                  // Prevent duplicate history entries by checking if the latest one matches
                  if (
                    latest &&
                    latest.topic === topicToUse &&
                    latest.query === currentQuery
                  ) {
                    const updatedSnapshot = {
                      ...latest,
                      timestamp: Date.now(),
                      date: new Date().toISOString(),
                      summary: summary || latest.summary,
                      articles: articles.slice(0, 15),
                    };
                    return [updatedSnapshot, ...prev.slice(1)];
                  }

                  const snapshot: HistorySnapshot = {
                    id: `snap-${Date.now()}`,
                    date: new Date().toISOString(),
                    timestamp: Date.now(),
                    topic: topicToUse,
                    query: currentQuery,
                    summary: summary,
                    articles: articles.slice(0, 15),
                  };
                  return [snapshot, ...prev].slice(0, 50);
                });
              }
            }
          });
      });
    } catch (err: any) {
      if (!currentSignal.aborted) {
        setError(err.message || t.error);
        setLoading(false);
      }
    }
  };

  // Add reactive effect for Search Mode changes
  const isMounted = useRef(false);
  useEffect(() => {
    if (isMounted.current && activeTab === "discover" && !loading) {
      // Force refresh using current state but with new search mode
      fetchNews(selectedTopic, searchQuery, searchMode, undefined, true);
    }
    isMounted.current = true;
  }, [searchMode]);

  const handleLoadMore = () => {
    if (visibleCount < filteredArticles.length) {
      setVisibleCount((prev) => prev + 20);
    } else {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const isManualTopic = !DEFAULT_TOPICS.includes(selectedTopic);
      fetchNews(
        selectedTopic,
        searchQuery,
        undefined,
        undefined,
        false,
        isManualTopic ? 20 : 3,
        nextPage,
      );
    }
  };

  const handleMarkAsRead = useCallback((articleId: string) => {
    setReadArticles((prev) => {
      if (prev[articleId]) return prev;
      return { ...prev, [articleId]: true };
    });
  }, []);

  const handleOpenImmersive = useCallback(
    (article: Article) => {
      handleMarkAsRead(article.id);
      setActiveImmersiveArticle(article);
    },
    [handleMarkAsRead],
  );

  const handleReadFullText = useCallback(
    (article: Article) => {
      handleMarkAsRead(article.id);
      handleFetchFullText(article);
    },
    [handleMarkAsRead, handleFetchFullText],
  );

  const handleToggleExpand = useCallback(
    (articleId: string) => {
      handleMarkAsRead(articleId);
      setExpandedArticleId((prev) => (prev === articleId ? null : articleId));
    },
    [handleMarkAsRead],
  );

  const handleUpdateNote = useCallback(
    (articleId: string, note: string) => {
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, note } : a)),
      );
      setSavedArticles((prev) => {
        const existingIndex = prev.findIndex((a) => a.id === articleId);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], note };
          return next;
        } else if (note.trim().length > 0) {
          const sourceArticle = articles.find((a) => a.id === articleId);
          if (sourceArticle) return [{ ...sourceArticle, note }, ...prev];
        }
        return prev;
      });
      setActiveImmersiveArticle((prev) => 
        prev && prev.id === articleId ? { ...prev, note } : prev
      );
    },
    [articles],
  );

  const handleProposeDebate = useCallback(
    async (article: Article) => {
      if (!user) {
        setIsAuthModalOpen(true);
        return;
      }

      const doiMatch = article.url?.match(
        /10\.\d{4,9}\/[-._;()/:A-Z0-9a-zA-Z]+/i,
      );
      const doi = doiMatch ? doiMatch[0] : null;

      const forumPayload = {
        id: uuidv4(),
        title: `Debate: ${article.title}`,
        content: `Debate propuesto desde la Vista Inmersiva para análisis comunitario.\n\n${article.summary ? article.summary.substring(0, 200) + "..." : ""}`,
        url: article.url || null,
        doi: doi,
        article_id: article.id,
        author_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Usuario",
        author_specialty: user.user_metadata?.specialty || "Médico",
        author_id: user.id,
        tags: ["Artículo", "Debate"],
        created_at: new Date().toISOString(),
        replies_count: 0,
        likes_count: 0,
      };

      try {
        if (supabase) {
          const { error } = await supabase
            .from("forums")
            .insert([forumPayload]);

          if (error) {
            console.error("Error posting forum proposal:", error);
            
            // Ensure General Forum exists before inserting comment
            await supabase.from("forums").upsert([{
               id: "general-community-forum",
               title: "Foro Clínico General",
               content: "Espacio abierto para consultas, casos clínicos y discusión general de la comunidad.",
               author_name: "Sistema",
               author_specialty: "Admin",
               author_id: "system",
               tags: ["General", "Comunidad"]
            }], { onConflict: "id", ignoreDuplicates: true });

            // Fallback to comment in general forum if forum insert fails
            const commentContent = `🚀 **PROPUESTA DE DEBATE**\n\n**Artículo:** ${article.title}\n**Enlace:** ${article.url || "No provisto"}\n**DOI:** ${doi || "No provisto"}\n\n**¿Por qué discutirlo?:** Propuesto desde la Vista Inmersiva.`;
            await supabase.from("comments").insert([
              {
                post_id: "general-community-forum",
                article_id: article.id,
                user_id: user.id,
                user_name:
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "Usuario",
                user_specialty: user.user_metadata?.specialty || "Médico",
                content: commentContent,
              },
            ]);
          }

          // Success!
          setActiveImmersiveArticle(null);
          setActiveTab("community");
          setCommunitySubTab("debates");
        } else {
          console.warn("Supabase not available for proposal");
        }
      } catch (error) {
        console.error("Error posting proposal:", error);
      }
    },
    [user],
  );

  const toggleLibrarySelection = (articleId: string) => {
    console.log("toggleLibrarySelection called for:", articleId);
    setSelectedLibraryArticles((prev) => {
      const isSelected = prev.includes(articleId);
      const next = isSelected
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId];
      console.log("New selection state:", next);
      return next;
    });
  };

  const handleShareCollection = useCallback(async () => {
    console.log(
      "handleShareCollection triggered. Selected articles:",
      selectedLibraryArticles.length,
    );
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedLibraryArticles.length === 0) {
      console.log("No articles selected to share.");
      return;
    }

    const articlesToShare = savedArticles.filter((a) =>
      selectedLibraryArticles.includes(a.id),
    );
    console.log(
      "Articles to share:",
      articlesToShare.map((a) => a.title),
    );

    let content = `### 📚 COLECCIÓN DE EVIDENCIA COMPARTIDA\n\nHe seleccionado estos **${articlesToShare.length}** artículos de mi biblioteca para análisis comunitario:\n\n`;

    articlesToShare.forEach((a, idx) => {
      content += `${idx + 1}. **${a.title}**\n   * [Ver Fuente](${a.url || "#"})\n\n`;
    });

    content += `\n---\n*Compartido por un colega desde su biblioteca personal.*`;

    const payload = {
      post_id: "general-community-forum",
      user_id: user.id,
      user_name:
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario",
      user_specialty: user.user_metadata?.specialty || "Médico",
      content: content,
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        console.log("Inserting shared collection into Supabase comments...");
        
        // Ensure General Forum exists before inserting comment to prevent foreign key errors
        await supabase.from("forums").upsert([{
           id: "general-community-forum",
           title: "Foro Clínico General",
           content: "Espacio abierto para consultas, casos clínicos y discusión general de la comunidad.",
           author_name: "Sistema",
           author_specialty: "Admin",
           author_id: "system",
           tags: ["General", "Comunidad"]
        }], { onConflict: "id", ignoreDuplicates: true });

        const { error } = await supabase.from("comments").insert([payload]);
        if (error) throw error;

        console.log(
          "Successfully shared collection. Navigating to community tab.",
        );
        showToast("¡Colección compartida en el foro general!");
        // Success!
        setIsLibrarySelectionMode(false);
        setSelectedLibraryArticles([]);
        setActiveTab("community");
        setCommunitySubTab("debates");
        setSelectedDebate({
          id: "general-community-forum",
          title: "Foro General de la Comunidad",
          content: "Espacio para compartir y debatir artículos científicos.",
          author: "Sistema",
          authorSpecialty: "Admin",
          createdAt: new Date().toISOString(),
          replies: 0,
          likes: 0,
          tags: ["General", "Comunidad"],
        });
      } else {
        console.error("Supabase client is not initialized.");
        showToast(
          "Error: El servicio de base de datos no está disponible.",
          "error",
        );
      }
    } catch (error) {
      console.error("Error sharing collection:", error);
      showToast(
        "Error al compartir la colección. Por favor, intenta de nuevo.",
        "error",
      );
    }
  }, [user, selectedLibraryArticles, savedArticles]);

  const fetchCommunityUsers = useCallback(async () => {
    if (!supabase) return;
    try {
      // Fetch unique users from comments to simulate a directory
      const { data, error } = await supabase
        .from("comments")
        .select("user_id, user_name, user_specialty")
        .not("user_id", "eq", user?.id || "");

      if (error) throw error;

      const uniqueUsers = Array.from(
        new Map(data.map((item) => [item.user_id, item])).values(),
      );
      setCommunityUsers(
        uniqueUsers.map((u) => ({
          id: u.user_id,
          name: u.user_name,
          specialty: u.user_specialty,
        })),
      );
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [user]);

  const handleShareWithUser = useCallback(
    async (recipient: { id: string; name: string }) => {
      console.log(
        "handleShareWithUser triggered for recipient:",
        recipient.name,
      );
      if (!user || selectedLibraryArticles.length === 0) {
        console.log("Missing user or selected articles.");
        return;
      }

      const articlesToShare = savedArticles.filter((a) =>
        selectedLibraryArticles.includes(a.id),
      );
      console.log(
        "Articles to share privately:",
        articlesToShare.map((a) => a.title),
      );

      let content = `### 🤝 TRABAJO COLABORATIVO\n\nHola colega, he seleccionado estos artículos de mi biblioteca para nuestro trabajo colaborativo:\n\n`;

      articlesToShare.forEach((a, idx) => {
        content += `${idx + 1}. **${a.title}**\n   * [Ver Fuente](${a.url || "#"})\n\n`;
      });

      content += `\n---\n*Propuesta de colaboración enviada por **${user.user_metadata?.full_name || user.email?.split("@")[0]}***`;

      const sharedId = [user.id, recipient.id].sort().join("_");
      const postId = `dm_shared:${sharedId}`;

      const payload = {
        id: uuidv4(),
        post_id: postId,
        article_id: null,
        user_id: user.id,
        user_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Usuario",
        user_specialty: user.user_metadata?.specialty || "Médico",
        content: content,
        created_at: new Date().toISOString(),
      };

      try {
        if (supabase) {
          // Ensure the shared forum entry exists
          const { data: existingForum } = await supabase
            .from("forums")
            .select("id")
            .eq("id", postId)
            .maybeSingle();

          if (!existingForum) {
            console.log("Creating shared collaboration forum:", postId);
            const { error: forumError } = await supabase.from("forums").insert([
              {
                id: postId,
                title: `Colaboración: ${user.user_metadata?.full_name || "Colega"} & ${recipient.name}`,
                content:
                  "Espacio compartido para coordinación de trabajos y revisión de casos.",
                author_id: user.id,
                author_name:
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "Sistema",
                author_specialty: user.user_metadata?.specialty || "Médico",
                created_at: new Date().toISOString(),
                replies_count: 0,
                likes_count: 0,
                tags: ["Colaboración", "Privado"],
                article_id: null,
                url: null,
                doi: null,
              },
            ]);

            if (forumError && forumError.code !== "23505") {
              console.error("Failed to create shared forum:", forumError);
              showToast(
                `Error de base de datos (Foro): ${forumError.message}`,
                "error",
              );
              throw forumError;
            }
          }

          console.log("Inserting shared message into Supabase comments...");
          const { error } = await supabase.from("comments").insert([payload]);
          if (error) throw error;

          console.log(
            "Successfully sent shared message. Navigating to community inbox.",
          );
          showToast("¡Artículos compartidos con éxito!");
          // Success!
          setIsUserSelectorOpen(false);
          setIsLibrarySelectionMode(false);
          setSelectedLibraryArticles([]);
          setActiveTab("community");
          setCommunitySubTab("inbox");
          refetchCollaborations();
        } else {
          console.error("Supabase client is not initialized.");
          showToast(
            "Error: El servicio de base de datos no está disponible.",
            "error",
          );
        }
      } catch (error) {
        console.error("Error sharing with user:", error);
        showToast(
          "Error al compartir artículos. Por favor, intenta de nuevo.",
          "error",
        );
      }
    },
    [user, selectedLibraryArticles, savedArticles],
  );

  const handleAddHighlight = useCallback((articleId: string, text: string) => {
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId
          ? { ...a, highlights: [...(a.highlights || []), text] }
          : a,
      ),
    );
    setSavedArticles((prev) => {
      const existingIndex = prev.findIndex((a) => a.id === articleId);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          highlights: [...(next[existingIndex].highlights || []), text],
        };
        return next;
      }
      return prev;
    });
    setActiveImmersiveArticle((prev) =>
      prev && prev.id === articleId
        ? { ...prev, highlights: [...(prev.highlights || []), text] }
        : prev
    );
  }, []);

  const handleRemoveHighlight = useCallback(
    (articleId: string, index: number) => {
      setArticles((prev) =>
        prev.map((a) => {
          if (a.id === articleId && a.highlights) {
            const newH = [...a.highlights];
            newH.splice(index, 1);
            return { ...a, highlights: newH };
          }
          return a;
        }),
      );
      setSavedArticles((prev) => {
        const existingIndex = prev.findIndex((a) => a.id === articleId);
        if (existingIndex !== -1) {
          const next = [...prev];
          const newH = [...(next[existingIndex].highlights || [])];
          newH.splice(index, 1);
          next[existingIndex] = {
            ...next[existingIndex],
            highlights: newH,
          };
          return next;
        }
        return prev;
      });
      setActiveImmersiveArticle((prev) => {
        if (prev && prev.id === articleId && prev.highlights) {
          const newH = [...prev.highlights];
          newH.splice(index, 1);
          return { ...prev, highlights: newH };
        }
        return prev;
      });
    },
    [],
  );

  const handleUpdateReadingStatus = useCallback(
    (articleId: string, status: "unread" | "in_progress" | "completed") => {
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, readingStatus: status } : a,
        ),
      );
      setSavedArticles((prev) => {
        const idx = prev.findIndex((a) => a.id === articleId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], readingStatus: status };
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const handleUpdateArticle = useCallback(
    (articleId: string, updates: Partial<Article>) => {
      let resolvedArticle: Article | null = null;
      setArticles((prev) =>
        prev.map((a) => {
          if (a.id === articleId) {
             resolvedArticle = { ...a, ...updates };
             return resolvedArticle;
          }
          return a;
        })
      );
      setSavedArticles((prev) => {
        const idx = prev.findIndex((a) => a.id === articleId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updates };
          if (!resolvedArticle) resolvedArticle = next[idx];
          return next;
        }
        return prev;
      });
      setActiveImmersiveArticle((prev) => {
        if (prev && prev.id === articleId) {
           const next = { ...prev, ...updates };
           if (!resolvedArticle) resolvedArticle = next;
           return next;
        }
        return prev;
      });
      setViewingHistorySnapshot((prev) => {
        if (!prev) return null;
        const updatedArticles = prev.articles.map((a) => {
          if (a.id === articleId) {
             const next = { ...a, ...updates };
             if (!resolvedArticle) resolvedArticle = next;
             return next;
          }
          return a;
        });
        return { ...prev, articles: updatedArticles };
      });

      // Persist the pdf to IndexedDB if it was updated
      if (updates.localPdfData) {
         setTimeout(() => {
             if (resolvedArticle) {
                 saveArticleOffline(resolvedArticle, resolvedArticle.fullTextContent || '', !!resolvedArticle.fullTextContent)
                   .then(() => {
                       setOfflineStatus(prev => ({ ...prev, [articleId]: true }));
                   })
                   .catch((e) => console.error("Error offline save:", e));
             }
         }, 0);
      }
    },
    [],
  );

  const toggleSave = useCallback(
    async (article: Article) => {
      console.log(
        "toggleSave triggered for article:",
        article.id,
        article.title,
      );
      const isAlreadySaved = savedArticles.some((a) => a.id === article.id);
      console.log("Is already saved?", isAlreadySaved);

      // Optimistic UI update
      if (isAlreadySaved) {
        setSavedArticles((prev) => prev.filter((a) => a.id !== article.id));
      } else {
        setSavedArticles((prev) => [article, ...prev]);
      }

      if (user && supabase) {
        try {
          if (isAlreadySaved) {
            console.log("Deleting from Supabase...");
            const { error } = await supabase
              .from("saved_articles")
              .delete()
              .eq("user_id", user.id)
              .eq("article_id", article.id);

            if (error) {
              console.error(
                "Error removing saved article from Supabase:",
                error,
              );
              showToast("Error al eliminar el artículo guardado.", "error");
              // Revert optimistic update on error
              setSavedArticles((prev) => [article, ...prev]);
            } else {
              console.log("Successfully deleted from Supabase");
            }
          } else {
            console.log("Inserting into Supabase...");
            const { error } = await supabase.from("saved_articles").upsert(
              {
                user_id: user.id,
                article_id: article.id,
                article_data: article,
              },
              { onConflict: "user_id, article_id" },
            );

            if (error) {
              console.error("Error saving article to Supabase:", error);
              showToast("Error al guardar el artículo.", "error");
              // Revert optimistic update on error
              setSavedArticles((prev) =>
                prev.filter((a) => a.id !== article.id),
              );
            } else {
              console.log("Successfully inserted into Supabase");
            }
          }
        } catch (err) {
          console.error("Unexpected error in toggleSave:", err);
          showToast("Error inesperado al guardar/eliminar.", "error");
          // Revert optimistic update on error
          if (isAlreadySaved) {
            setSavedArticles((prev) => [article, ...prev]);
          } else {
            setSavedArticles((prev) => prev.filter((a) => a.id !== article.id));
          }
        }
      }
    },
    [user, savedArticles],
  );

  const navigateToTab = (
    tab: "discover" | "saved" | "history" | "community" | "admin",
  ) => {
    const fromIdx = TAB_ORDER.indexOf(activeTab as any);
    const toIdx = TAB_ORDER.indexOf(tab);
    setDirection(toIdx > fromIdx ? 1 : -1);
    setActiveTab(tab as any);
  };

  useEffect(() => {
    if (!isAdmin && activeTab === "admin") {
      navigateToTab("discover");
    }
  }, [isAdmin, activeTab]);

  const handleBack = useCallback(() => {
    // 1. Close Modals/Overlays
    if (activeImmersiveArticle) {
      setActiveImmersiveArticle(null);
      return true;
    }
    if (isReaderOpen) {
      setIsReaderOpen(false);
      return true;
    }
    if (viewingHistorySnapshot) {
      setViewingHistorySnapshot(null);
      return true;
    }
    if (isFlashcardMode) {
      setIsFlashcardMode(false);
      return true;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }
    if (isAuthModalOpen) {
      setIsAuthModalOpen(false);
      return true;
    }
    if (isManualSearchOpen) {
      setIsManualSearchOpen(false);
      return true;
    }
    if (voiceModalOpen) {
      setVoiceModalOpen(false);
      return true;
    }
    if (isInfoModalOpen) {
      setIsInfoModalOpen(false);
      return true;
    }

    // 2. Sub-views within tabs
    if (activeTab === "community") {
      if (selectedDebate) {
        setSelectedDebate(null);
        return true;
      }
    }

    // 3. Tab navigation
    if (activeTab !== "discover") {
      navigateToTab("discover");
      return true;
    }

    // 4. Default: Let the system handle it (exit/minimize) if possible,
    // or just do nothing if we are at the root
    return false;
  }, [
    activeImmersiveArticle,
    selectedDebate,
    isReaderOpen,
    viewingHistorySnapshot,
    isFlashcardMode,
    isSettingsOpen,
    isAuthModalOpen,
    isManualSearchOpen,
    voiceModalOpen,
    isInfoModalOpen,
    activeTab,
  ]);

  useEffect(() => {
    const handleRequireApiKey = (e: Event) => {
      const customEvent = e as CustomEvent;
      setMissingProvider(customEvent.detail?.provider || aiProvider);
      setShowApiKeyWarning(true);
    };
    window.addEventListener('REQUIRE_API_KEY', handleRequireApiKey);
    return () => {
      window.removeEventListener('REQUIRE_API_KEY', handleRequireApiKey);
    };
  }, [aiProvider]);

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener(
      "backButton",
      ({ canGoBack }) => {
        const handled = handleBack();
        if (!handled) {
          if (canGoBack) {
            window.history.back();
          } else {
            const confirmExit = window.confirm(
              "¿Seguro que quieres salir de la aplicación?",
            );
            if (confirmExit) {
              CapacitorApp.exitApp();
            }
          }
        }
      },
    );

    return () => {
      backButtonListener.then((l) => l.remove());
    };
  }, [handleBack]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!("touches" in e) && e.button !== 0) return;
    const clientX = "touches" in e ? e.targetTouches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.targetTouches[0].clientY : e.clientY;
    setTouchStart(clientX);
    touchStartY.current = clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStart === null) return;
    
    if (window.getSelection()?.toString().length) {
      setTouchStart(null);
      return;
    }

    const endX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const endY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;

    const distance = touchStart - endX;
    const deltaY = Math.abs(endY - touchStartY.current);
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const isRightEdgeSwipe = touchStart > screenWidth * 0.85;
    const isLeftEdgeSwipe = touchStart < screenWidth * 0.15;

    if (isLeftEdgeSwipe && distance < -50 && Math.abs(distance) > deltaY) {
      if (handleBack()) {
        if (navigator.vibrate) navigator.vibrate(15);
      }
      setTouchStart(null);
      return;
    }

    if (activeImmersiveArticle || isSettingsOpen || isManualSearchOpen || isReaderOpen) {
      setTouchStart(null);
      return;
    }

    if (isRightEdgeSwipe && distance > 50 && distance > deltaY) {
      setIsSettingsOpen(true);
      if (navigator.vibrate) navigator.vibrate(15);
      setTouchStart(null);
      return;
    }

    if (!isRightEdgeSwipe && !isLeftEdgeSwipe && activeTab === "discover") {
      const startY = touchStartY.current;
      const isSafeZone = startY > 120 && startY < screenHeight - 100;

      if (
        isSafeZone &&
        Math.abs(distance) > 60 &&
        Math.abs(distance) > deltaY
      ) {
        if (distance > 0) handleNextTopic();
        else handlePrevTopic();
      }
    }
    setTouchStart(null);
  };

  const handleAddTopic = () => {
    const val = newTopicInput.trim();
    if (val && !topics.includes(val)) {
      setTopics((prev) => [...prev, val]);
      setNewTopicInput("");
      if (navigator.vibrate) navigator.vibrate(20);
      if (user) addTopicToSupabase(val);
    }
  };

  const handleMoveTopic = (index: number, direction: "up" | "down") => {
    const newTopics = [...topics];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTopics.length) return;
    [newTopics[index], newTopics[targetIndex]] = [
      newTopics[targetIndex],
      newTopics[index],
    ];
    setTopics(newTopics);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const finalizeTopicDeletion = (topic: string) => {
    if (topics.length <= 1) return;
    setTopics((prev) => prev.filter((t) => t !== topic));
    setSidebarDeletePending(null);
    if (selectedTopic === topic) handleTopicClick(topics[0]);
    if (navigator.vibrate) navigator.vibrate(20);
    if (user && !DEFAULT_TOPICS.includes(topic)) removeTopicFromSupabase(topic);
  };

  const handleResetTopics = async () => {
    setTopics(DEFAULT_TOPICS);
    setSelectedTopic(DEFAULT_TOPICS[0]);
    setSearchQuery("");
    setCurrentPage(1);

    // Reset scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    // Fix: Explicitly pass empty query string
    fetchNews(DEFAULT_TOPICS[0], "");
    if (navigator.vibrate) navigator.vibrate(50);

    if (user && supabase) {
      await supabase.from("user_topics").delete().eq("user_id", user.id);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("ne_hist");
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleFactoryReset = async () => {
    localStorage.clear();
    await clearOfflineStorage();
    window.location.reload();
  };

  const setSearchChip = (term: string) => {
    setSearchQuery(term);
    handleManualSearch(term);
  };

  const handleVerifyGemini = async () => {
    if (!geminiApiKey.trim()) return;
    setGeminiStatus("checking");
    const isValid = await verifyGeminiKey(geminiApiKey);
    setGeminiStatus(isValid ? "valid" : "invalid");
    if (isValid && navigator.vibrate) navigator.vibrate([10, 30]);
  };

  const handleVerifyGroq = async () => {
    if (!groqApiKey.trim()) return;
    setGroqStatus("checking");
    const isValid = await verifyGroqKey(groqApiKey);
    setGroqStatus(isValid ? "valid" : "invalid");
    if (isValid && navigator.vibrate) navigator.vibrate([10, 30]);
  };

  const handleManualSynthesis = async () => {
    if (articles.length === 0) return;
    setIsSynthesizing(true);
    try {
      const aiSummary = await generateGeminiSummary(
        articles,
        selectedTopic,
        contentLanguage,
        geminiApiKey,
      );
      setSummary(aiSummary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // --- VERIFICATION HANDLERS ---
  // Verification is now handled entirely within AuthModal

  // Sync saved articles with Supabase on login
  useEffect(() => {
    const syncSavedArticles = async () => {
      if (!user || !supabase) return;

      try {
        const { data, error } = await supabase
          .from("saved_articles")
          .select("article_data")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching saved articles:", error);
          return;
        }

        if (data) {
          const remoteArticles = data.map((row) => row.article_data as Article);

          setSavedArticles((prevLocal) => {
            const combined = [...remoteArticles];
            const combinedIds = new Set(combined.map((a) => a.id));

            const localOnly = prevLocal.filter((a) => !combinedIds.has(a.id));

            // Upload local-only to Supabase
            if (localOnly.length > 0) {
              const inserts = localOnly.map((a) => ({
                user_id: user.id,
                article_id: a.id,
                article_data: a,
              }));
              supabase
                .from("saved_articles")
                .upsert(inserts, { onConflict: "user_id, article_id" })
                .then(({ error }) => {
                  if (error)
                    console.error("Error syncing local articles:", error);
                });
            }

            return [...combined, ...localOnly];
          });
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    syncSavedArticles();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      const hasSelectedLang = localStorage.getItem("ne_lang_selected");
      if (!hasSelectedLang) {
        setIsLanguageSelectOpen(true);
      } else {
        const hasSeenIntro = localStorage.getItem("ne_intro_seen");
        if (!hasSeenIntro) {
          setIsInfoModalOpen(true);
          localStorage.setItem("ne_intro_seen", "true");
        }
      }

      const saved = localStorage.getItem("ne_saved");
      const hist = localStorage.getItem("ne_hist");
      const pref = localStorage.getItem("ne_pref");
      const read = localStorage.getItem("ne_read");
      if (saved) setSavedArticles(JSON.parse(saved));
      if (hist) setHistory(JSON.parse(hist));
      if (read) setReadArticles(JSON.parse(read));
      if (pref) {
        const p = JSON.parse(pref);
        setIsDarkMode(p.isDarkMode || false);
        setUiLanguage(p.uiLanguage || "es");
        setSearchMode(p.searchMode || "standard");
        setTextSize(p.textSize || "base");
        setAiProvider(p.aiProvider || "gemini");
        setGeminiApiKey(p.geminiApiKey || "");
        if (p.geminiApiKey) setGeminiStatus("idle");
        setGroqApiKey(p.groqApiKey || "");
        if (p.groqApiKey) setGroqStatus("idle");
        setElsevierApiKey(p.elsevierApiKey || "");
        setCoreApiKey(p.coreApiKey || "");
        setS2ApiKey(p.s2ApiKey || "");
        setAutoXray(p.autoXray !== undefined ? p.autoXray : true);
        setShowNewsFeed(p.showNewsFeed !== undefined ? p.showNewsFeed : true);
        setIsFlashcardMode(
          p.isFlashcardMode !== undefined ? p.isFlashcardMode : false,
        );
        setOnlyFullText(p.onlyFullText !== undefined ? p.onlyFullText : false);
        setFontStyle(p.fontStyle || "sans");
      }
      updateOfflineStatusMap();
      fetchNews("General");
    };
    load();
  }, []);

  useEffect(() => {
    try {
      // Strip localPdfData before saving to avoid quota issues
      const strippedSavedArticles = savedArticles.map((a) => {
        const { localPdfData, ...rest } = a;
        return rest;
      });
      localStorage.setItem("ne_saved", JSON.stringify(strippedSavedArticles));
      localStorage.setItem("ne_hist", JSON.stringify(history));
      localStorage.setItem("ne_read", JSON.stringify(readArticles));
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        console.error("LocalStorage quota exceeded", e);
      } else {
        console.error("Error saving to localStorage", e);
      }
    }
  }, [savedArticles, history, readArticles]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem(
      "ne_pref",
      JSON.stringify({
        isDarkMode,
        uiLanguage,
        contentLanguage,
        searchMode,
        aiProvider,
        autoXray,
        textSize,
        geminiApiKey,
        groqApiKey,
        elsevierApiKey,
        coreApiKey,
        s2ApiKey,
        showNewsFeed,
        fontStyle,
        isFlashcardMode,
        onlyFullText, // Persist status
      }),
    );
  }, [
    isDarkMode,
    uiLanguage,
    contentLanguage,
    searchMode,
    aiProvider,
    autoXray,
    textSize,
    geminiApiKey,
    groqApiKey,
    elsevierApiKey,
    coreApiKey,
    s2ApiKey,
    showNewsFeed,
    fontStyle,
    isFlashcardMode,
    onlyFullText,
  ]);

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isDarkMode ? "#020617" : "#f8fafc",
        color: isDarkMode ? "#f1f5f9" : "#0f172a",
      }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen font-sans overflow-hidden flex flex-col noise-bg ${isDarkMode ? "bg-[#020617] text-slate-100" : "bg-[#f8fafc] text-slate-900"}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <style>{`
        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${isDarkMode ? "0.015" : "0.03"}'/%3E%3C/svg%3E");
        }
      `}</style>

      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-white/90 backdrop-blur-xl border-b border-slate-100 lg:hidden transition-transform duration-300 ${isScrollingDown ? "-translate-y-full" : "translate-y-0"} ${isDarkMode ? "bg-slate-950/90 border-slate-800" : ""}`}
      >
        {activeImmersiveArticle ||
        selectedDebate ||
        isReaderOpen ||
        isSettingsOpen ||
        isAuthModalOpen ||
        viewingHistorySnapshot ||
        isFlashcardMode ||
        isManualSearchOpen ||
        voiceModalOpen ||
        isInfoModalOpen ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-blue-600 font-bold transition-transform active:scale-95 h-full"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">{t.back}</span>
          </button>
        ) : (
          <button
            onClick={() => navigateToTab("discover")}
            className="flex items-center gap-2 h-full"
          >
            <div className="rounded-lg bg-blue-600 p-1 text-white shadow-lg">
              <KidneyIcon size={18} />
            </div>
            {!showNewsFeed && (
              <span
                className={`font-black text-sm tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
              >
                NephroUpdate
              </span>
            )}
          </button>
        )}
        {showNewsFeed ? (
          <div className="mx-2 flex-1 overflow-hidden min-w-0 h-full flex items-center">
            <NewsTicker
              isDarkMode={isDarkMode}
              title={t.latestNews}
              className="bg-transparent border-0 px-0 py-0 w-full"
            />
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        <div className="flex items-center gap-0.5 h-full relative">
          <button
            onClick={() =>
              user
                ? setIsUserMenuOpen(!isUserMenuOpen)
                : setIsAuthModalOpen(true)
            }
            className={`p-2 sm:p-2.5 flex items-center justify-center transition-colors ${user ? "text-blue-500" : "text-slate-400"}`}
          >
            {user ? (
              <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 font-bold text-[9px]">
                {getUserInitials()}
              </div>
            ) : (
              <User size={18} />
            )}
          </button>
          <UserMenu
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            isDarkMode={isDarkMode}
            t={t.userMenu}
          />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 sm:p-2.5 flex items-center justify-center text-slate-400"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="flex h-screen overflow-hidden">
        <aside
          className={`hidden w-64 flex-col border-r z-30 transition-colors backdrop-blur-xl lg:flex ${isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white/70 border-slate-200"}`}
        >
          <div className="p-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg">
                <KidneyIcon size={28} />
              </div>
              <h1 className="text-xl font-black">NephroUpdate</h1>
            </div>
            <nav className="space-y-1">
              {[
                { id: "discover", icon: Radar, label: t.discover },
                { id: "saved", icon: Bookmark, label: t.library },
                { id: "history", icon: History, label: t.history },
                { id: "community", icon: Building2, label: t.communityTitle },
                ...(isAdmin
                  ? [{ id: "admin", icon: ShieldCheck, label: "Admin" }]
                  : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id as any)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold transition-all ${activeTab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "opacity-60 hover:opacity-100"}`}
                >
                  <item.icon size={18} /> <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="relative flex h-full flex-1 flex-col overflow-hidden">
          {(!isInstalled && showInstallBanner && (deferredPrompt || /iPhone|iPad|iPod/i.test(navigator.userAgent))) && (
            <div className={`flex items-center justify-between p-3 px-4 z-50 text-sm ${isDarkMode ? "bg-blue-900/50 text-blue-100 border-b border-blue-900" : "bg-blue-50 text-blue-900 border-b border-blue-100"}`}>
              <div className="flex items-center gap-3">
                <Download size={18} className="text-blue-500" />
                <span className="font-medium">
                  {t.settings.pwaInstallBtn || "Instalar Aplicación"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDarkMode ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  Ver Instrucciones
                </button>
                <button onClick={dismissInstallBanner} className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <header
            className={`hidden h-16 items-center justify-between gap-4 border-b px-8 z-50 lg:flex ${isDarkMode ? "bg-slate-950/70 border-slate-800" : "bg-white/70 border-slate-200"} backdrop-blur-sm`}
          >
            <motion.div
              layout
              className={`group relative max-w-2xl flex-1 transition-all ${isSearchFocused ? "shadow-lg rounded-2xl" : ""}`}
            >
              <Search
                className="absolute left-4 top-2.5 text-slate-400 pointer-events-none"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={handleSearchInputChange}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleManualSearch(searchQuery)
                }
                placeholder={t.searchPlaceholder}
                className={`w-full rounded-2xl border outline-none pl-11 pr-10 py-2.5 transition-colors ${isDarkMode ? "bg-slate-900 border-slate-700 focus:bg-slate-800" : "bg-slate-50 border-slate-200 focus:bg-white"}`}
              />

              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl shadow-xl border z-[60] ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
                  >
                    <div className="space-y-3">
                      {suggestions.length > 0 && (
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1 block mb-1">
                            {t.suggestions}
                          </span>
                          <div className="space-y-1">
                            {suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onMouseDown={() => {
                                  setSearchQuery(suggestion);
                                  setSuggestions([]);
                                  handleManualSearch(suggestion);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"}`}
                              >
                                <Search size={12} className="opacity-50" />
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {searchQuery.trim().length >= 3 && !searchQuery.toUpperCase().startsWith("AUTHOR:") && (
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1 block mb-1">
                            {t.author}
                          </span>
                          <button
                            onMouseDown={() => {
                              const authorTerm = `AUTHOR:"${searchQuery.trim()}"`;
                              setSearchQuery(authorTerm);
                              setSuggestions([]);
                              handleManualSearch(authorTerm);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 text-blue-600 ${isDarkMode ? "hover:bg-slate-800 bg-slate-800/50" : "hover:bg-blue-50 bg-slate-50"} border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}
                          >
                            <User size={14} className="opacity-70" />
                            {t.searchAuthor} "{searchQuery.trim()}"
                          </button>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          {t.time}
                        </span>
                        <div className="flex gap-2 mt-1">
                          {["Last 6 months", "2025-2026", "Last 5 years"].map(
                            (chip) => (
                              <button
                                key={chip}
                                onMouseDown={() => setSearchChip(chip)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"}`}
                              >
                                {chip}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          {t.evidenceType}
                        </span>
                        <div className="flex gap-2 mt-1">
                          {["RCT", "Guideline", "Meta-Analysis", "Review"].map(
                            (chip) => (
                              <button
                                key={chip}
                                onMouseDown={() => setSearchChip(chip)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"}`}
                              >
                                {chip}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() =>
                  user
                    ? setIsUserMenuOpen(!isUserMenuOpen)
                    : setIsAuthModalOpen(true)
                }
                className={`p-2.5 rounded-xl border dark:border-white/10 transition-all ${user ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50" : "hover:bg-slate-100 dark:hover:bg-white/5"}`}
              >
                {user ? (
                  <div className="flex items-center justify-center w-5 h-5 font-bold text-[10px]">
                    {getUserInitials()}
                  </div>
                ) : (
                  <User size={20} />
                )}
              </button>
              <UserMenu
                isOpen={isUserMenuOpen}
                onClose={() => setIsUserMenuOpen(false)}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                isDarkMode={isDarkMode}
                t={t.userMenu}
              />
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-xl border dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => fetchNews()}
                disabled={loading}
                className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg"
              >
                <RefreshCw
                  size={20}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </header>

          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto px-4 transition-all duration-300 ${activeTab === "discover" || activeTab === "saved" ? "pb-32 pt-0 lg:pt-0" : "pb-32 pt-20 lg:pt-8"} lg:px-8 lg:pb-8`}
            style={{ touchAction: "pan-y" }}
          >
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              {activeTab === "discover" && (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                  className="mx-auto max-w-6xl min-h-full w-full"
                >
                  {/* Explicit Spacer for Mobile Header */}
                  <div className="h-11 w-full lg:hidden" />

                  <div
                    className={`sticky z-40 -mx-4 border-b bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${isScrollingDown ? "top-0" : "top-11 lg:top-0"} lg:mx-0 lg:rounded-none lg:mb-6 lg:border-x-0`}
                  >
                    <div
                      ref={topicContainerRef}
                      className="no-scrollbar flex items-center gap-0 overflow-x-auto px-4 py-2 scroll-px-20"
                    >
                      {topics.map((topic) => (
                        <div key={topic} className="relative group shrink-0">
                          <button
                            ref={(el) => {
                              topicRefs.current[topic] = el;
                            }}
                            onClick={() => handleTopicClick(topic)}
                            className={`px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all ${selectedTopic === topic ? "bg-blue-600 text-white rounded-full shadow-sm" : "text-slate-500"}`}
                          >
                            {topic.startsWith("AUTHOR:") ? topic.replace("AUTHOR:", `${t.author.toUpperCase()}: `).replace(/"/g, '') : topic}
                          </button>
                          {!DEFAULT_TOPICS.includes(topic) &&
                            selectedTopic === topic && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseTopic(topic);
                                }}
                                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white shadow-md hover:scale-110 transition-transform"
                              >
                                <X size={8} />
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2
                        className={`text-xl font-black ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
                      >
                        {searchQuery 
                            ? `${t.searchingFor} ${searchQuery.toUpperCase().startsWith("AUTHOR:") ? searchQuery.replace(/AUTHOR:/i, "").replace(/"/g, '') : searchQuery}` 
                            : (selectedTopic.toUpperCase().startsWith("AUTHOR:") ? selectedTopic.replace(/AUTHOR:/i, `${t.author}: `).replace(/"/g, '') : selectedTopic)}
                      </h2>
                      {filteredArticles.length > 0 && (
                        <button
                          onClick={() => setIsFlashcardMode(!isFlashcardMode)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isFlashcardMode ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30" : isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
                        >
                          <Layers size={14} />
                          <span className="hidden sm:inline">
                            Medical Shorts
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2 mt-[-10px]">
                      {[
                        "Last 6 months",
                        "2025-2026",
                        "RCT",
                        "Guideline",
                        "Meta-Analysis"
                      ].map((chip) => {
                        const isActive = searchQuery.includes(chip);
                        return (
                          <button
                            key={chip}
                            onClick={() => {
                              let newQuery = searchQuery || "";
                              if (isActive) {
                                newQuery = newQuery.replace(chip, "").replace(/\s+/g, " ").trim();
                              } else {
                                newQuery = newQuery ? `${newQuery} ${chip}` : chip;
                              }
                              setSearchQuery(newQuery);
                              fetchNews(selectedTopic, newQuery, undefined, undefined, true);
                            }}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                              isActive
                                ? isDarkMode
                                  ? "bg-white/20 border-white/30 text-white"
                                  : "bg-slate-200 border-slate-300 text-slate-900"
                                : isDarkMode
                                  ? "border-white/10 hover:bg-white/5 text-slate-400"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-500"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>

                    {translationNotice && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium border ${isDarkMode ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-200" : "bg-indigo-50 border-indigo-200 text-indigo-800"}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <div className="flex items-center gap-2">
                            <Globe
                              size={14}
                              className="text-indigo-500 shrink-0"
                            />
                            <span>
                              {t.searchingFor}{" "}
                              <strong>"{translationNotice.translated}"</strong>
                            </span>
                          </div>
                          <span className="opacity-60 text-[10px] sm:text-xs ml-6 sm:ml-0">
                            ({t.translatedFrom} "{translationNotice.original}")
                          </span>
                        </div>
                        <button
                          onClick={handleUndoTranslation}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${isDarkMode ? "bg-white/10 hover:bg-white/20 text-indigo-100" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"}`}
                        >
                          {t.undo}
                        </button>
                      </motion.div>
                    )}

                    {loading && searchMode === "ai" && (
                      <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-[shimmer_2s_infinite] rounded-full opacity-50 mb-4"></div>
                    )}

                    {summary ? (
                      <div className="rounded-[2rem] border p-7 bg-blue-50/20 dark:bg-slate-900/40 border-blue-100 dark:border-slate-800 font-serif text-lg leading-relaxed animate-in fade-in">
                        {summary}
                      </div>
                    ) : (
                      articles.length > 0 &&
                      !loading && (
                        <div className="mb-6 flex justify-center">
                          <button
                            onClick={handleManualSynthesis}
                            disabled={isSynthesizing}
                            className={`group relative flex items-center gap-3 pl-4 pr-6 py-3 rounded-2xl border shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 ${isDarkMode ? "bg-slate-900 border-indigo-500/30 text-indigo-300" : "bg-white border-indigo-100 text-indigo-600"}`}
                          >
                            {isSynthesizing ? (
                              <Loader2
                                size={20}
                                className="animate-spin text-indigo-500"
                              />
                            ) : (
                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                                <Sparkles size={18} />
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                {isSynthesizing
                                  ? t.analyzingReport
                                  : t.generatingReport}
                              </span>
                              <span className="text-sm font-bold">
                                {isSynthesizing
                                  ? t.synthesizingEvidence
                                  : t.scientificDevelopments}
                              </span>
                            </div>
                          </button>
                        </div>
                      )
                    )}

                    <div
                      className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 items-start ${loading && searchMode === "ai" ? "opacity-70 grayscale transition-all" : ""}`}
                    >
                      {loading && articles.length === 0
                        ? Array(6)
                            .fill(0)
                            .map((_, i) => (
                              <ArticleSkeleton
                                key={i}
                                isDarkMode={isDarkMode}
                              />
                            ))
                        : (() => {
                            const visibleArticles = filteredArticles.slice(
                              0,
                              visibleCount,
                            );
                            let separatorIndex = -1;
                            let hasUnread = false;
                            for (let i = 0; i < visibleArticles.length; i++) {
                              if (!readArticles[visibleArticles[i].id]) {
                                hasUnread = true;
                              } else if (
                                hasUnread &&
                                readArticles[visibleArticles[i].id]
                              ) {
                                separatorIndex = i;
                                break;
                              }
                            }
                            return visibleArticles.map((article, index) => {
                              const isLarge =
                                layoutMode === "bento" &&
                                (index === 0 ||
                                  (article.relevanceScore &&
                                    article.relevanceScore > 95));
                              return (
                                <React.Fragment key={article.id}>
                                  {index === separatorIndex && (
                                    <div className="col-span-1 md:col-span-2 xl:col-span-3 flex items-center gap-4 my-2 opacity-60">
                                      <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                        {t.historyTitle ||
                                          "Visto anteriormente"}
                                      </span>
                                      <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                                    </div>
                                  )}
                                  <ArticleCard
                                    key={article.id}
                                    article={article}
                                    isSaved={savedArticles.some(
                                      (a) => a.id === article.id,
                                    )}
                                    onToggleSave={toggleSave}
                                    isDarkMode={isDarkMode}
                                    onOpenImmersive={handleOpenImmersive}
                                    onUpdateNote={handleUpdateNote}
                                    onReadFullText={handleReadFullText}
                                    isDownloaded={!!offlineStatus[article.id]}
                                    textSize={textSize}
                                    groqApiKey={groqApiKey}
                                    geminiApiKey={geminiApiKey}
                                    language={contentLanguage}
                                    defaultXrayMode={autoXray}
                                    onAddHighlight={handleAddHighlight}
                                    fontStyle={fontStyle}
                                    onUpdateArticle={handleUpdateArticle}
                                    isExpanded={
                                      expandedArticleId === article.id
                                    }
                                    onToggleExpand={handleToggleExpand}
                                    isUnread={!readArticles[article.id]}
                                    className={
                                      isLarge
                                        ? "md:col-span-2 xl:col-span-2"
                                        : ""
                                    }
                                  />
                                </React.Fragment>
                              );
                            });
                          })()}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
                      <button
                        onClick={handleLoadMore}
                        className="group relative flex items-center gap-3 pl-2 pr-6 py-2 rounded-full border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xl transition-all hover:scale-105 active:scale-95"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:rotate-90 transition-transform">
                          <Plus size={20} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-black uppercase tracking-widest opacity-60">
                            {t.discover}
                          </span>
                          <span className="text-sm font-bold flex items-center gap-2">
                            {visibleCount < filteredArticles.length
                              ? `Cargar Más Localmente (${filteredArticles.length - visibleCount})`
                              : `Buscar más en Servidores (Página ${currentPage + 1})`}
                            {visibleCount >= filteredArticles.length && (
                              <Server size={14} />
                            )}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "saved" && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto max-w-6xl px-4"
                >
                  {/* Explicit Spacer for Mobile Header */}
                  <div className="h-11 w-full lg:hidden" />
                  {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
                        <Bookmark size={40} className="text-blue-500" />
                      </div>
                      <h2 className="text-2xl font-black mb-2">
                        {t.libraryEmptyTitle}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        {t.libraryEmptyDesc}
                      </p>
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        {t.loginToContinue}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`sticky z-40 -mx-4 px-4 py-4 border-b bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${isScrollingDown ? "top-0" : "top-11 lg:top-0"} lg:mx-0 lg:rounded-none lg:mb-6 lg:border-x-0 border-slate-200 dark:border-slate-800`}
                      >
                        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                          <div className="space-y-2">
                            <h2 className="text-3xl font-black">
                              {t.libraryTitle}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold uppercase tracking-widest opacity-40">
                                {filteredSavedArticles.length} Artículos
                                guardados
                              </p>
                              {syncState.isSyncing && (
                                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                  <RefreshCw size={10} className="animate-spin text-blue-500" />
                                  Sincronizando Wi-Fi ({syncState.completed}/{syncState.total})
                                </span>
                              )}
                              {(filterDesign.length > 0 ||
                                filterTier < 4 ||
                                libraryTopicFilter !== "All" ||
                                libraryFilter.trim()) && (
                                <button
                                  onClick={() => {
                                    setFilterDesign([]);
                                    setFilterTier(4);
                                    setLibraryTopicFilter("All");
                                    setLibraryFilter("");
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                                >
                                  <RotateCcw size={10} />
                                  Limpiar Filtros
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              onClick={() => {
                                setIsLibrarySelectionMode(
                                  !isLibrarySelectionMode,
                                );
                                if (isLibrarySelectionMode)
                                  setSelectedLibraryArticles([]);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                                isLibrarySelectionMode
                                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                                  : "text-slate-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <List size={16} />
                              <span>
                                {isLibrarySelectionMode
                                  ? "Cancelar"
                                  : "Seleccionar"}
                              </span>
                            </button>

                            {isLibrarySelectionMode &&
                              filteredSavedArticles.length > 0 && (
                                <button
                                  onClick={() => {
                                    if (
                                      selectedLibraryArticles.length ===
                                      filteredSavedArticles.length
                                    ) {
                                      setSelectedLibraryArticles([]);
                                    } else {
                                      setSelectedLibraryArticles(
                                        filteredSavedArticles.map((a) => a.id),
                                      );
                                    }
                                  }}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                                    selectedLibraryArticles.length ===
                                    filteredSavedArticles.length
                                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                      : "text-slate-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  }`}
                                >
                                  <CheckCircle size={16} />
                                  <span>
                                    {selectedLibraryArticles.length ===
                                    filteredSavedArticles.length
                                      ? "Deseleccionar Todo"
                                      : "Seleccionar Todo"}
                                  </span>
                                </button>
                              )}

                            {isLibrarySelectionMode &&
                              selectedLibraryArticles.length > 0 && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleShareCollection}
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 animate-in zoom-in-95"
                                  >
                                    <Share2 size={16} />
                                    <span>
                                      Foro General (
                                      {selectedLibraryArticles.length})
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      fetchCommunityUsers();
                                      setIsUserSelectorOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 animate-in zoom-in-95"
                                  >
                                    <Users size={16} />
                                    <span>
                                      Colaborar (
                                      {selectedLibraryArticles.length})
                                    </span>
                                  </button>
                                </div>
                              )}

                            <button
                              onClick={() => setIsFilterOpen(!isFilterOpen)}
                              className={`relative flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                                filterDesign.length > 0 ||
                                filterTier < 4 ||
                                libraryTopicFilter !== "All"
                                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                                  : "text-slate-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <Filter size={16} />
                              {(filterDesign.length > 0 ||
                                filterTier < 4 ||
                                libraryTopicFilter !== "All") && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
                              )}
                            </button>

                            <div className="relative group flex-1 md:flex-none">
                              <Search
                                size={16}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                              />
                              <input
                                type="text"
                                value={libraryFilter}
                                onChange={(e) =>
                                  setLibraryFilter(e.target.value)
                                }
                                placeholder="Buscar en biblioteca..."
                                className={`w-full md:w-72 rounded-2xl border text-sm outline-none pl-11 pr-4 py-2 transition-all ${
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    : "bg-white border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isFilterOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xl mt-4"
                            >
                              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">
                                    Study Design
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "RCT",
                                      "Meta-Analysis",
                                      "Guideline",
                                      "Cohort",
                                      "Case Report",
                                    ].map((d) => (
                                      <button
                                        key={d}
                                        onClick={() =>
                                          toggleFilterDesign(d as StudyDesign)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                          filterDesign.includes(
                                            d as StudyDesign,
                                          )
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">
                                    Journal Impact
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => setFilterTier(4)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 4 ? "bg-blue-50 text-blue-600 border-blue-200" : "border-slate-200 dark:border-slate-700"}`}
                                    >
                                      All
                                    </button>
                                    <button
                                      onClick={() => setFilterTier(2)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 2 ? "bg-blue-50 text-blue-600 border-blue-200" : "border-slate-200 dark:border-slate-700"}`}
                                    >
                                      High Impact
                                    </button>
                                    <button
                                      onClick={() => setFilterTier(1)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${filterTier === 1 ? "bg-blue-50 text-blue-600 border-blue-200" : "border-slate-200 dark:border-slate-700"}`}
                                    >
                                      Top Tier
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">
                                    Topic / Nicho
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {availableLibraryTopics.map((t) => (
                                      <button
                                        key={t}
                                        onClick={() => setLibraryTopicFilter(t)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                          libraryTopicFilter === t
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {filteredSavedArticles.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-start">
                          {filteredSavedArticles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              isSaved={true}
                              onToggleSave={toggleSave}
                              isDarkMode={isDarkMode}
                              onOpenImmersive={handleOpenImmersive}
                              onUpdateNote={handleUpdateNote}
                              onReadFullText={handleReadFullText}
                              isCompact={true}
                              isDownloaded={!!offlineStatus[article.id]}
                              textSize={textSize}
                              groqApiKey={groqApiKey}
                              geminiApiKey={geminiApiKey}
                              language={contentLanguage}
                              defaultXrayMode={autoXray}
                              onAddHighlight={handleAddHighlight}
                              fontStyle={fontStyle}
                              onUpdateArticle={handleUpdateArticle}
                              isExpanded={expandedArticleId === article.id}
                              onToggleExpand={handleToggleExpand}
                              isUnread={!readArticles[article.id]}
                              isSelectionMode={isLibrarySelectionMode}
                              isSelected={selectedLibraryArticles.includes(
                                article.id,
                              )}
                              onSelect={() =>
                                toggleLibrarySelection(article.id)
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                            <Search size={40} className="text-slate-400" />
                          </div>
                          <h3 className="text-xl font-black mb-2">
                            {t.noArticlesFound}
                          </h3>
                          <p className="text-sm font-bold max-w-xs">
                            {t.noArticlesDesc}
                          </p>
                          {(filterDesign.length > 0 ||
                            filterTier < 4 ||
                            libraryTopicFilter !== "All" ||
                            libraryFilter.trim()) && (
                            <button
                              onClick={() => {
                                setFilterDesign([]);
                                setFilterTier(4);
                                setLibraryTopicFilter("All");
                                setLibraryFilter("");
                              }}
                              className="mt-6 px-6 py-2 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                            >
                              {t.resetFilters}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto max-w-6xl space-y-6 px-4"
                >
                  {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
                        <History size={40} className="text-blue-500" />
                      </div>
                      <h2 className="text-2xl font-black mb-2">
                        {t.historyEmptyTitle}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        {t.historyEmptyDesc}
                      </p>
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        {t.loginToContinue}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black">{t.historyTitle}</h2>

                      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                        {availableHistoryTopics.map((t) => (
                          <button
                            key={t}
                            onClick={() => setHistoryTopicFilter(t)}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${historyTopicFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <HistoryAnalytics
                        history={filteredHistory}
                        isDarkMode={isDarkMode}
                      />

                      <div className="relative border-l-2 border-dashed border-slate-200 dark:border-slate-800 ml-4 space-y-8 pl-8 py-4">
                        {filteredHistory.map((snapshot, idx) => (
                          <div key={snapshot.id} className="relative group">
                            <div
                              className={`absolute -left-[39px] top-6 w-5 h-5 rounded-full border-4 transition-colors ${isDarkMode ? "bg-slate-950 border-slate-700 group-hover:border-blue-500" : "bg-white border-slate-300 group-hover:border-blue-500"}`}
                            ></div>

                            <div
                              onClick={() =>
                                setViewingHistorySnapshot(snapshot)
                              }
                              className={`cursor-pointer rounded-3xl border p-5 transition-all relative overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-lg"}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-lg">
                                  {snapshot.topic}
                                </h4>
                                <ArrowRight
                                  size={18}
                                  className="opacity-30 group-hover:translate-x-1 transition-transform"
                                />
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />{" "}
                                  {new Date(
                                    snapshot.timestamp,
                                  ).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />{" "}
                                  {new Date(
                                    snapshot.timestamp,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {snapshot.query &&
                                snapshot.query !== snapshot.topic && (
                                  <div
                                    className={`text-xs p-2 rounded-lg font-mono mb-2 ${isDarkMode ? "bg-black/20 text-slate-400" : "bg-slate-50 text-slate-600"}`}
                                  >
                                    {">"} {snapshot.query}
                                  </div>
                                )}
                              <div className="flex -space-x-2 overflow-hidden py-1">
                                {snapshot.articles.slice(0, 5).map((a, i) => (
                                  <div
                                    key={i}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${isDarkMode ? "border-slate-900 bg-slate-800" : "border-white bg-slate-100"}`}
                                    title={a.title}
                                  >
                                    {a.source.charAt(0)}
                                  </div>
                                ))}
                                {snapshot.articles.length > 5 && (
                                  <div
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${isDarkMode ? "border-slate-900 bg-slate-800" : "border-white bg-slate-100"}`}
                                  >
                                    +{snapshot.articles.length - 5}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "community" && (
                <motion.div
                  key="community"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto max-w-7xl space-y-8 px-4 py-6 lg:py-12"
                >
                  <div className="text-center space-y-4 lg:hidden">
                    <div className="inline-flex p-3 rounded-3xl bg-blue-600/10 text-blue-600 mb-2">
                      <Building2 size={32} />
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                      {t.communityTitle}
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                      {t.communityDesc}
                    </p>
                  </div>

                  {!user ? (
                    <div
                      className={`p-8 rounded-[3rem] border text-center space-y-6 max-w-2xl mx-auto ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-xl"}`}
                    >
                      <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto text-blue-500">
                        <Lock size={40} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black">
                          Inicia Sesión Requerida
                        </h3>
                        <p className="text-xs opacity-60 max-w-xs mx-auto">
                          El intercambio de casos clínicos y encuestas de
                          impacto está reservado para miembros de la comunidad.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
                      >
                        <User size={18} /> Iniciar Sesión / Registrarse
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 items-start">
                      {/* Main Feed Column */}
                      <div className="lg:col-span-8 space-y-6">
                        {/* Community Sub-tabs */}
                        <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/50 w-fit overflow-x-auto max-w-full no-scrollbar">
                          <button
                            onClick={() => setCommunitySubTab("debates")}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${communitySubTab === "debates" ? "bg-white dark:bg-slate-800 shadow-md text-emerald-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                          >
                            <div className="flex items-center gap-2">
                              <MessageCircle size={14} />
                              <span>Debates y Foro</span>
                            </div>
                          </button>
                          <button
                            onClick={() => setCommunitySubTab("inbox")}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${communitySubTab === "inbox" ? "bg-white dark:bg-slate-800 shadow-md text-indigo-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                          >
                            <div className="flex items-center gap-2">
                              <Users size={14} />
                              <span>Trabajo Colaborativo</span>
                            </div>
                          </button>
                        </div>

                        {/* Unified Community View */}
                        {communitySubTab === "inbox" ? (
                          <div
                            className={`rounded-3xl border overflow-hidden h-[700px] lg:h-[calc(100vh-12rem)] flex flex-col ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                          >
                            {selectedCollaboration ? (
                              <div className="flex flex-col h-full">
                                <div
                                  className={`p-3 border-b flex items-center gap-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                                >
                                  <button
                                    onClick={() =>
                                      setSelectedCollaboration(null)
                                    }
                                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <ArrowLeft size={18} />
                                  </button>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-black truncate">
                                      {selectedCollaboration.title}
                                    </h4>
                                    <p className="text-[10px] opacity-50">
                                      Colaboración activa
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <SocialJournalClub
                                    article={
                                      {
                                        id: selectedCollaboration.id,
                                        title: selectedCollaboration.title,
                                        summary: selectedCollaboration.content,
                                        source: selectedCollaboration.author,
                                        url: "",
                                        date: selectedCollaboration.date,
                                        category: "Community",
                                        relevanceScore: 100,
                                        isFree: true,
                                      } as Article
                                    }
                                    isDarkMode={isDarkMode}
                                    geminiApiKey={geminiApiKey}
                                    onOpenAuth={() => setIsAuthModalOpen(true)}
                                    isGeneralForum={true}
                                    onRefresh={() => refetchCollaborations()}
                                    t={t.social}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col h-full">
                                <div
                                  className={`p-6 border-b ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50/50 border-slate-200"}`}
                                >
                                  <h3 className="text-lg font-black flex items-center gap-2">
                                    <Users
                                      className="text-indigo-500"
                                      size={20}
                                    />
                                    Mis Colaboraciones
                                  </h3>
                                  <p className="text-xs opacity-60">
                                    Espacios privados para trabajar con otros
                                    colegas.
                                  </p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                  {loadingCollaborations ? (
                                    <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                      <Loader2
                                        className="animate-spin text-indigo-500"
                                        size={32}
                                      />
                                      <p className="text-xs font-bold animate-pulse">
                                        Cargando colaboraciones...
                                      </p>
                                    </div>
                                  ) : collaborations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-40">
                                      <Users size={48} />
                                      <div className="space-y-1">
                                        <p className="text-sm font-black">
                                          No hay colaboraciones activas
                                        </p>
                                        <p className="text-[10px] max-w-[200px]">
                                          Comparte artículos desde tu biblioteca
                                          con otros usuarios para iniciar un
                                          trabajo colaborativo.
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    collaborations.map((collab: any) => (
                                      <button
                                        key={collab.id}
                                        onClick={() =>
                                          setSelectedCollaboration(collab)
                                        }
                                        className={`w-full text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-4 ${isDarkMode ? "bg-slate-800/50 border-white/5 hover:bg-slate-800" : "bg-white border-slate-100 hover:shadow-md"}`}
                                      >
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                          <MessageCircle size={24} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-sm font-black truncate">
                                            {collab.title}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold uppercase tracking-wider">
                                              Colaboración
                                            </span>
                                            <span className="text-[10px] opacity-40 font-medium">
                                              {collab.replies} mensajes
                                            </span>
                                          </div>
                                        </div>
                                        <ChevronRight
                                          size={18}
                                          className="opacity-20"
                                        />
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`rounded-3xl border overflow-hidden h-[700px] lg:h-[calc(100vh-12rem)] flex flex-col ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                          >
                            {selectedDebate ? (
                              <div className="flex flex-col h-full">
                                <div
                                  className={`p-3 border-b flex items-center gap-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                                >
                                  <button
                                    onClick={() => setSelectedDebate(null)}
                                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <ArrowLeft size={18} />
                                  </button>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-black truncate">
                                      {selectedDebate.title}
                                    </h4>
                                    <p className="text-[10px] opacity-50">
                                      Debate iniciado por @
                                      {selectedDebate.author
                                        .toLowerCase()
                                        .replace(/\s+/g, "")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <SocialJournalClub
                                    article={
                                      {
                                        id: selectedDebate.id,
                                        title: selectedDebate.title,
                                        summary: selectedDebate.content,
                                        source: selectedDebate.author,
                                        url: selectedDebate.url || "",
                                        doi: selectedDebate.doi,
                                        article_id: selectedDebate.article_id,
                                        date: selectedDebate.createdAt,
                                        category: "Community",
                                        relevanceScore: 100,
                                        isFree: true,
                                      } as Article
                                    }
                                    isDarkMode={isDarkMode}
                                    geminiApiKey={geminiApiKey}
                                    onOpenAuth={() => setIsAuthModalOpen(true)}
                                    isGeneralForum={
                                      selectedDebate.id ===
                                      "general-community-forum"
                                    }
                                    isDebate={
                                      selectedDebate.id !==
                                      "general-community-forum"
                                    }
                                    onRefresh={() => refetchDebates()}
                                    t={t.social}
                                  />
                                </div>
                              </div>
                            ) : (
                              <DebateDashboard
                                debates={proposedDebates}
                                onSelectDebate={setSelectedDebate}
                                isDarkMode={isDarkMode}
                                user={user}
                                isAdmin={isAdmin}
                                onRefresh={() => refetchDebates()}
                                t={t.debate}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sidebar Column */}
                      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto no-scrollbar pb-10">
                        {/* Profile Summary Card */}
                        <div
                          className={`p-6 rounded-3xl border ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl">
                              {user.user_metadata?.full_name?.charAt(0) ||
                                user.email?.charAt(0) ||
                                "U"}
                            </div>
                            <div>
                              <h4 className="font-black text-sm flex items-center gap-1">
                                {user.user_metadata?.full_name ||
                                  user.email?.split("@")[0] ||
                                  "Usuario Médico"}
                                <BadgeCheck
                                  size={14}
                                  className="text-blue-500"
                                />
                              </h4>
                              <p className="text-[10px] opacity-60 uppercase tracking-widest">
                                {user.user_metadata?.specialty ||
                                  "Especialista"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="text-center">
                              <div className="text-lg font-black text-blue-500">
                                12
                              </div>
                              <div className="text-[9px] uppercase tracking-widest opacity-50">
                                Aportes
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-black text-emerald-500">
                                48
                              </div>
                              <div className="text-[9px] uppercase tracking-widest opacity-50">
                                Impacto
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Trending Topics */}
                        <div
                          className={`p-6 rounded-3xl border ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                              <Flame size={20} />
                            </div>
                            <h4 className="font-black text-sm uppercase tracking-widest">
                              Trending Topics
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {trendingTopics.map((topic) => (
                              <div
                                key={topic}
                                className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                              >
                                <span className="text-xs font-bold">
                                  #{topic.replace(/\s+/g, "")}
                                </span>
                                <ArrowRight size={14} className="opacity-30" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Encuesta de Impacto */}
                        <div
                          className={`p-6 rounded-3xl border ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                              <Activity size={20} />
                            </div>
                            <h4 className="font-black text-sm uppercase tracking-widest">
                              Encuesta Clínica
                            </h4>
                          </div>
                          <p className="text-xs opacity-60 mb-4">
                            ¿Cuál es su primera línea en pacientes con CKD y
                            albuminuria &gt;300mg/g?
                          </p>
                          <div className="space-y-2">
                            {[
                              "ACEi/ARB + SGLT2i",
                              "Triple Terapia (inc. nsMRA)",
                              "Solo Bloqueo RAS",
                            ].map((opt) => (
                              <button
                                key={opt}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase text-left hover:bg-blue-600 hover:text-white transition-all"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Top Contributors */}
                        <div
                          className={`p-6 rounded-3xl border ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                              <ShieldCheck size={20} />
                            </div>
                            <h4 className="font-black text-sm uppercase tracking-widest">
                              Top Contributors
                            </h4>
                          </div>
                          <div className="space-y-4">
                            {(topContributors.length > 0
                              ? topContributors
                              : [
                                  {
                                    name: "Dr. Carlos M.",
                                    specialty: "Nefrología",
                                    score: 156,
                                  },
                                  {
                                    name: "Dra. Ana R.",
                                    specialty: "Trasplante",
                                    score: 142,
                                  },
                                  {
                                    name: "Dr. Luis F.",
                                    specialty: "Medicina Interna",
                                    score: 98,
                                  },
                                ]
                            ).map((contributor, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">
                                    {contributor.name
                                      .split(" ")
                                      .pop()
                                      ?.charAt(0) || contributor.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold">
                                      {contributor.name}
                                    </p>
                                    <p className="text-[9px] opacity-50 uppercase">
                                      {contributor.specialty}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                  {contributor.score} pts
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "admin" && isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto max-w-7xl h-full pb-20 pt-4"
                >
                  <AdminPanel
                    onClose={() => navigateToTab("discover")}
                    isDarkMode={isDarkMode}
                    t={t.admin}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <div
        className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 lg:hidden transition-all duration-500 w-[92%] max-w-[360px] ${isManualSearchOpen ? "opacity-0 pointer-events-none translate-y-10" : isScrollingDown ? "opacity-0 pointer-events-none translate-y-20" : "opacity-100 translate-y-0"}`}
      >
        <div
          className={`relative flex items-center justify-between p-1.5 rounded-[2.5rem] border shadow-2xl backdrop-blur-[40px] saturate-[2] ${isDarkMode ? "bg-slate-950/50 border-white/10 shadow-black/50" : "bg-white/50 border-white/40 shadow-blue-200/40 ring-1 ring-white/40"}`}
        >
          <LayoutGroup>
            <div className="flex flex-1 justify-around items-center px-1">
              {[
                {
                  id: "history",
                  icon: History,
                  action: () => navigateToTab("history"),
                },
                {
                  id: "discover",
                  icon: Radar,
                  action: () => handleTopicClick(selectedTopic),
                  onHold: () =>
                    fetchNews(
                      selectedTopic,
                      !DEFAULT_TOPICS.includes(selectedTopic)
                        ? topicQueries[selectedTopic] || selectedTopic
                        : "",
                      undefined,
                      undefined,
                      true,
                      20,
                    ),
                },
                {
                  id: "saved",
                  icon: Bookmark,
                  action: () => navigateToTab("saved"),
                },
                {
                  id: "community",
                  icon: Building2,
                  action: () => navigateToTab("community"),
                },
                ...(isAdmin
                  ? [
                      {
                        id: "admin",
                        icon: ShieldCheck,
                        action: () => navigateToTab("admin"),
                      },
                    ]
                  : []),
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onPointerDown={() => {
                      if (item.onHold) startLongPress(item.onHold);
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onClick={item.action}
                    className={`relative rounded-full p-3 lg:p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 ${isActive ? "text-white" : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="dock-active"
                        className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30"
                        transition={{
                          type: "spring",
                          bounce: 0.25,
                          duration: 0.5,
                        }}
                      />
                    )}
                    <item.icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className="relative z-10"
                    />
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className={`w-px h-8 mx-1 ${isDarkMode ? "bg-white/10" : "bg-slate-200"}`}
            ></div>

            <div className="flex items-center gap-1 pr-1">
              <button
                onPointerDown={() => {
                  startLongPress(() => setIsManualSearchOpen(true));
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onClick={() => {
                  setIsManualSearchOpen(true);
                  setSearchModalTab("text");
                }}
                className={`p-3.5 rounded-full transition-all active:scale-90 ${isDarkMode ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Search size={22} strokeWidth={2.5} />
              </button>

              <button
                onClick={() => {
                  setVoiceModalOpen(true);
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                className={`relative p-3.5 rounded-full transition-all active:scale-90 overflow-hidden group ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
              >
                <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-0 rounded-full border border-indigo-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <Mic size={22} strokeWidth={2.5} className="relative z-10" />
              </button>
            </div>
          </LayoutGroup>
        </div>
      </div>

      {/* Liquid Crystal Scroll To Top Button */}
      <AnimatePresence>
        {showScrollTop && !isUserScrolling && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className={`fixed z-[55] p-3 rounded-full border shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[12px] transition-all duration-500 hover:scale-110 active:scale-95 ${
              isDarkMode
                ? "bg-slate-800/30 border-white/10 text-blue-400"
                : "bg-white/30 border-white/40 text-blue-600"
            } right-4 lg:bottom-10 lg:right-10 ${isScrollingDown ? "bottom-6" : "bottom-24"}`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
            <ArrowUp size={24} strokeWidth={2.5} className="relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManualSearchOpen && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className={`fixed inset-x-0 bottom-0 z-[70] p-6 pb-12 rounded-t-[3rem] shadow-2xl border-t max-h-[95vh] overflow-y-auto no-scrollbar ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-slate-100"}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setSearchModalTab("text")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchModalTab === "text" ? "bg-white dark:bg-slate-700 shadow-sm" : "opacity-50"}`}
                >
                  Texto Libre
                </button>
                <button
                  onClick={() => setSearchModalTab("pico")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchModalTab === "pico" ? "bg-white dark:bg-slate-700 shadow-sm" : "opacity-50"}`}
                >
                  Estructurada PICO
                </button>
              </div>
              <button
                onClick={() => setIsManualSearchOpen(false)}
                className="p-2 opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {searchModalTab === "text" ? (
              <div className="relative">
                <div className="mb-4 flex items-center gap-4">
                  <Search size={24} className="text-blue-500" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleManualSearch(searchQuery)
                    }
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-transparent text-lg font-bold outline-none"
                  />
                  {isFetchingSuggestions && (
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  )}
                </div>

                <AnimatePresence>
                  {(suggestions.length > 0 || searchQuery.trim().length >= 3) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`absolute top-12 left-10 right-0 z-50 rounded-xl shadow-lg border overflow-hidden ${isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-200"}`}
                    >
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setSuggestions([]);
                            handleManualSearch(suggestion);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${isDarkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-50 text-slate-700"} ${idx !== suggestions.length - 1 ? (isDarkMode ? "border-b border-white/5" : "border-b border-slate-100") : ""}`}
                        >
                          <Search size={14} className="opacity-50" />
                          {suggestion}
                        </button>
                      ))}
                      
                      {searchQuery.trim().length >= 3 && !searchQuery.toUpperCase().startsWith("AUTHOR:") && (
                          <button
                            onClick={() => {
                              const authorTerm = `AUTHOR:"${searchQuery.trim()}"`;
                              setSearchQuery(authorTerm);
                              setSuggestions([]);
                              handleManualSearch(authorTerm);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center gap-2 text-blue-600 ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-blue-50"} border-t ${isDarkMode ? "border-white/5" : "border-slate-100"}`}
                          >
                            <User size={14} className="opacity-70" />
                            {t.searchAuthor} "{searchQuery.trim()}"
                          </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                  {[
                    "Last 6 months",
                    "2025-2026",
                    "RCT",
                    "Guideline",
                    "Meta-Analysis",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onMouseDown={() => setSearchChip(chip)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"}`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleManualSearch(searchQuery)}
                  className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl transition-transform active:scale-[0.98]"
                >
                  BUSCAR EVIDENCIA
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { id: "p", label: t.pLabel, ph: t.pPlaceholder },
                    { id: "i", label: t.iLabel, ph: t.iPlaceholder },
                    { id: "c", label: t.cLabel, ph: t.cPlaceholder },
                    { id: "o", label: t.oLabel, ph: t.oPlaceholder },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5 ml-1">
                        {f.label}
                      </label>
                      <input
                        type="text"
                        value={(picoData as any)[f.id]}
                        onChange={(e) =>
                          setPicoData({ ...picoData, [f.id]: e.target.value })
                        }
                        placeholder={f.ph}
                        className={`w-full p-4 rounded-2xl border text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? "bg-slate-800 border-white/5" : "bg-slate-50 border-slate-200"}`}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handlePicoSearch}
                  className="w-full mt-4 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all"
                >
                  {t.searchPico}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApiKeyWarning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${isDarkMode ? "bg-slate-900 border border-white/10" : "bg-white"}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <ShieldAlert size={32} />
                </div>
                <h2 className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{t.apiKeyMissing.title}</h2>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {t.apiKeyMissing.desc1} <strong>{missingProvider === "groq" ? "Groq" : "Gemini"}</strong>. 
                  {t.apiKeyMissing.desc2} <a href={missingProvider === "groq" ? "https://console.groq.com/keys" : "https://aistudio.google.com/app/apikey"} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-bold">{missingProvider === "groq" ? "console.groq.com" : "Google AI Studio"}</a> {t.apiKeyMissing.desc3}
                  <br /><br />
                  {missingProvider === "gemini" && (
                     <>{t.apiKeyMissing.optionalGroq} <strong>Groq</strong> {t.apiKeyMissing.optionalGroq2} <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-bold">console.groq.com</a> {t.apiKeyMissing.optionalGroq3}</>
                  )}
                  {missingProvider === "groq" && (
                     <>{t.apiKeyMissing.optionalGemini} <strong>Gemini</strong> {t.apiKeyMissing.optionalGemini2} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-bold">Google AI Studio</a>.</>
                  )}
                </p>
                <div className="flex items-center gap-3 w-full pt-4">
                  <button
                    onClick={() => setShowApiKeyWarning(false)}
                    className={`flex-1 py-3 rounded-xl font-bold border transition-colors ${isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                  >
                    {t.apiKeyMissing.close}
                  </button>
                  <button
                    onClick={() => {
                      setShowApiKeyWarning(false);
                      setIsSettingsOpen(true);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    {t.apiKeyMissing.configure}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 right-0 z-[110] w-full max-w-sm flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border-l border-white/5" : "bg-white"}`}
            >
              <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 sticky top-0 z-10 border-b dark:border-white/5">
                <h2 className="text-xl font-black">{t.settings.title}</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
                {/* 1. PROFESSIONAL VERIFICATION SECTION */}
                <div
                  className={`relative overflow-hidden rounded-3xl border shadow-sm transition-all ${
                    verificationStatus === "verified"
                      ? isDarkMode
                        ? "bg-emerald-900/10 border-emerald-500/30"
                        : "bg-emerald-50 border-emerald-200"
                      : isDarkMode
                        ? "bg-slate-800/50 border-white/5"
                        : "bg-white border-slate-100"
                  }`}
                >
                  {/* Header */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {verificationStatus === "verified" ? (
                        <BadgeCheck className="text-emerald-500" size={18} />
                      ) : (
                        <Stethoscope className="text-blue-500" size={18} />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {t.settings.profStatus}
                      </span>
                    </div>
                    {verificationStatus === "verified" && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                        {t.settings.verified}
                      </span>
                    )}
                    {verificationStatus === "pending" && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                        {t.settings.pending}
                      </span>
                    )}
                  </div>

                  {/* Content Body based on Step */}
                  <div className="px-5 pb-5">
                    {verificationStatus === "unverified" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500">
                            {user ? (
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-200 dark:border-blue-800 shadow-sm">
                                {getUserInitials()}
                              </div>
                            ) : (
                              <User size={18} />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold">
                              {t.settings.guest}
                            </div>
                            <div className="text-[10px] opacity-60">
                              {t.settings.guestDesc}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsAuthModalOpen(true)}
                          className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                          <BadgeCheck size={16} /> {t.settings.createAccountTxt}
                        </button>
                        <p className="text-[9px] text-center opacity-40 leading-tight px-4">
                          {t.settings.verifyDesc}
                        </p>
                      </div>
                    )}

                    {/* STATE 4: SUCCESS / PENDING */}
                    {verificationStatus === "pending" && (
                      <div className="text-center py-4 animate-in zoom-in-95">
                        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
                          <ShieldAlert size={32} />
                        </div>
                        <h4 className="font-black text-sm mb-1">
                          {t.settings.pending}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-relaxed max-w-[200px] mx-auto">
                          {t.settings.pendingDesc}
                        </p>
                      </div>
                    )}

                    {/* STATE 5: VERIFIED */}
                    {verificationStatus === "verified" && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-emerald-500">
                          <div className="h-full w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                            {t.settings.verifiedDr}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold flex items-center gap-1">
                            {t.settings.verifiedUser} {user?.user_metadata?.full_name || "User"}{" "}
                            <BadgeCheck
                              size={14}
                              className="text-emerald-500"
                            />
                          </div>
                          <div className="text-[10px] opacity-60">
                            {t.settings.verifiedDesc}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.filters}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-tight">
                          {t.settings.fullTextOnly}
                        </span>
                        <p className="text-[9px] opacity-60 italic">
                          {t.settings.fullTextDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setOnlyFullText(!onlyFullText);
                          if (navigator.vibrate) navigator.vibrate(10);
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${onlyFullText ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                      >
                        <div
                          className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${onlyFullText ? "left-6" : "left-1"}`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t dark:border-white/5">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-tight">
                          {t.settings.bentoLayout}
                        </span>
                        <p className="text-[9px] opacity-60 italic">
                          {t.settings.bentoDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setLayoutMode(
                            layoutMode === "bento" ? "standard" : "bento",
                          );
                          if (navigator.vibrate) navigator.vibrate(10);
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${layoutMode === "bento" ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                      >
                        <div
                          className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${layoutMode === "bento" ? "left-6" : "left-1"}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="space-y-3">
                    <button
                      onClick={() => setSearchMode("standard")}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${searchMode === "standard" ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm uppercase tracking-tight">
                          {t.settings.standardSearch}
                        </span>
                        {searchMode === "standard" && <Check size={16} />}
                      </div>
                      <p
                        className={`text-[10px] leading-relaxed ${searchMode === "standard" ? "text-blue-100" : "opacity-60 italic"}`}
                      >
                        {t.settings.standardDesc}
                      </p>
                    </button>
                    <button
                      onClick={() => setSearchMode("ai")}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${searchMode === "ai" ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm uppercase tracking-tight">
                          {t.settings.aiSearch}
                        </span>
                        {searchMode === "ai" && <Check size={16} />}
                      </div>
                      <p
                        className={`text-[10px] leading-relaxed ${searchMode === "ai" ? "text-blue-100" : "opacity-60 italic"}`}
                      >
                        {t.settings.aiSearchDesc}
                      </p>
                    </button>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Key size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.connectivity}
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-tight">
                          Gemini API Key (Google)
                        </span>
                        {geminiStatus === "valid" && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase flex items-center gap-1">
                            <Check size={10} /> {t.settings.verified}
                          </span>
                        )}
                        {geminiStatus === "invalid" && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase flex items-center gap-1">
                            <X size={10} /> {t.settings.invalid}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] leading-relaxed opacity-60 italic">
                        {t.settings.apiKeyRequired}
                      </p>
                      <div className="relative">
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => {
                            setGeminiApiKey(e.target.value);
                            setGeminiStatus("idle");
                          }}
                          placeholder="AIzaSy..."
                          className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-[11px] font-mono outline-none dark:border-white/10 pr-20"
                        />
                        <button
                          onClick={handleVerifyGemini}
                          disabled={
                            !geminiApiKey || geminiStatus === "checking"
                          }
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[10px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {geminiStatus === "checking" ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            t.settings.verifyBtn
                          )}
                        </button>
                      </div>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-500 group hover:bg-blue-500/10 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t.settings.getGoogleAI}
                        </span>
                        <ExternalLink
                          size={12}
                          className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                        />
                      </a>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-tight">
                          Groq Key (Llama 3)
                        </span>
                        {groqStatus === "valid" && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase flex items-center gap-1">
                            <Check size={10} /> {t.settings.verified}
                          </span>
                        )}
                        {groqStatus === "invalid" && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase flex items-center gap-1">
                            <X size={10} /> {t.settings.invalid}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] leading-relaxed opacity-60 italic">
                        {t.settings.groqDesc}
                      </p>
                      <div className="relative">
                        <input
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => {
                            setGroqApiKey(e.target.value);
                            setGroqStatus("idle");
                          }}
                          placeholder="gsk_..."
                          className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-[11px] font-mono outline-none dark:border-white/10 pr-20"
                        />
                        <button
                          onClick={handleVerifyGroq}
                          disabled={!groqApiKey || groqStatus === "checking"}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[10px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {groqStatus === "checking" ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            t.settings.verifyBtn
                          )}
                        </button>
                      </div>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-500/5 border border-slate-500/20 text-slate-500 group"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t.settings.getGroq}
                        </span>
                        <ExternalLink
                          size={12}
                          className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                        />
                      </a>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.aiProviderTitle}
                    </span>
                  </div>
                  <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                    <button
                      onClick={() => setAiProvider("gemini")}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${aiProvider === "gemini" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                    >
                      Gemini
                    </button>
                    <button
                      onClick={() => setAiProvider("groq")}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${aiProvider === "groq" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                    >
                      Groq (Llama 3)
                    </button>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        BASES DE DATOS
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(activeSources).every(Boolean);
                        const nextState = !allSelected;
                        setActiveSources({
                          pubmed: nextState,
                          openalex: nextState,
                          europepmc: nextState,
                          semanticscholar: nextState,
                          clinicaltrials: nextState,
                          core: nextState,
                          doaj: nextState,
                          elsevier: nextState,
                          lilacs: nextState,
                        });
                      }}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
                    >
                      {Object.values(activeSources).every(Boolean) ? (uiLanguage === "es" ? "Desmarcar Todas" : "Deselect All") : (uiLanguage === "es" ? "Seleccionar Todas" : "Select All")}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      { id: 'pubmed', label: 'PubMed' },
                      { id: 'openalex', label: 'OpenAlex' },
                      { id: 'europepmc', label: 'Europe PMC' },
                      { id: 'semanticscholar', label: 'Semantic Scholar' },
                      { id: 'clinicaltrials', label: 'ClinicalTrials.gov' },
                      { id: 'core', label: 'CORE' },
                      { id: 'doaj', label: 'DOAJ' },
                      { id: 'elsevier', label: 'Elsevier' },
                      { id: 'lilacs', label: 'LILACS' },
                    ].map(db => (
                      <label key={db.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${activeSources[db.id as DataSource] ? (isDarkMode ? 'bg-blue-900/20 border-blue-500 shadow-sm' : 'bg-blue-50 border-blue-200 shadow-sm') : (isDarkMode ? 'bg-transparent border-white/5 opacity-60 hover:opacity-100 hover:border-white/20' : 'bg-transparent border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300')}`}>
                         <input
                           type="checkbox"
                           className="hidden"
                           checked={activeSources[db.id as DataSource]}
                           onChange={(e) => setActiveSources(prev => ({...prev, [db.id]: e.target.checked}))}
                         />
                         <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${activeSources[db.id as DataSource] ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                           {activeSources[db.id as DataSource] && <CheckCircle size={12} strokeWidth={3} />}
                         </div>
                         <span className="text-[11px] font-bold tracking-wide">{db.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      FILTROS DE EVIDENCIA (Reactive)
                    </span>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
                        Diseño del Estudio (Smart Inject)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "RCT",
                          "Meta-Analysis",
                          "Guideline",
                          "Cohort",
                          "Case Report",
                        ].map((d) => (
                          <button
                            key={d}
                            onClick={() => toggleFilterDesign(d as StudyDesign)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                              filterDesign.includes(d as StudyDesign)
                                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                : isDarkMode
                                  ? "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
                        Impacto de Revista
                      </h4>
                      <div className="space-y-2">
                        {[
                          { val: 4, label: "Todas las Revistas" },
                          { val: 2, label: "Alto Impacto (Tier 1 & 2)" },
                          { val: 1, label: "Top Tier (NEJM, Lancet...)" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setFilterTier(opt.val)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-bold ${
                              filterTier === opt.val
                                ? "bg-blue-500/10 border-blue-500 text-blue-500"
                                : isDarkMode
                                  ? "bg-slate-900 border-slate-700 text-slate-400"
                                  : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {filterTier === opt.val && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        GESTIÓN DE TÓPICOS
                      </span>
                    </div>
                    <button
                      onClick={handleResetTopics}
                      className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  </div>
                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      placeholder="Añadir nicho (ej. IgA)..."
                      className="flex-1 p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs font-bold outline-none dark:border-white/10 shadow-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                    />
                    <button
                      onClick={handleAddTopic}
                      className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg active:scale-95"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                    {topics.map((topic, idx) => (
                      <div
                        key={topic}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border dark:border-white/5 shadow-sm"
                      >
                        <span className="text-[11px] font-bold truncate max-w-[120px]">
                          {topic}
                        </span>

                        <div className="flex items-center gap-1">
                          {sidebarDeletePending === topic ? (
                            <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                              <button
                                onClick={() => finalizeTopicDeletion(topic)}
                                className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button
                                onClick={() => setSidebarDeletePending(null)}
                                className="p-1.5 bg-slate-500/10 text-slate-400 rounded-lg"
                              >
                                <X size={14} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMoveTopic(idx, "up")}
                                disabled={idx === 0}
                                className={`p-1 rounded-md ${idx === 0 ? "opacity-20" : "text-blue-500 hover:bg-blue-500/10"}`}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                onClick={() => handleMoveTopic(idx, "down")}
                                disabled={idx === topics.length - 1}
                                className={`p-1 rounded-md ${idx === topics.length - 1 ? "opacity-20" : "text-blue-500 hover:bg-blue-500/10"}`}
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                onClick={() => setSidebarDeletePending(topic)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-md ml-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Palette size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.interfaceAndReading}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold">
                      {t.settings.darkMode}
                    </span>
                    <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 w-32">
                      <button
                        onClick={() => setIsDarkMode(false)}
                        className={`flex-1 py-1.5 rounded-lg flex justify-center items-center transition-all ${!isDarkMode ? "bg-white text-blue-600 shadow-sm" : "opacity-40"}`}
                      >
                        <Sun size={14} />
                      </button>
                      <button
                        onClick={() => setIsDarkMode(true)}
                        className={`flex-1 py-1.5 rounded-lg flex justify-center items-center transition-all ${isDarkMode ? "bg-slate-700 text-white" : "opacity-40"}`}
                      >
                        <Moon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 pt-4 border-t border-dashed dark:border-white/5 border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Type
                        size={14}
                        className={
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }
                      />
                      <span className="text-xs font-bold">
                        {t.settings.fontStyleTitle}
                      </span>
                    </div>
                    <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                      <button
                        onClick={() => setFontStyle("sans")}
                        className={`flex-1 py-2 text-[10px] font-sans font-bold rounded-lg transition-all ${fontStyle === "sans" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                      >
                        {t.settings.fontStyleStandard}
                      </button>
                      <button
                        onClick={() => setFontStyle("serif")}
                        className={`flex-1 py-2 text-[10px] font-serif font-bold rounded-lg transition-all ${fontStyle === "serif" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                      >
                        {t.settings.fontStyleEditorial}
                      </button>
                      <button
                        onClick={() => setFontStyle("modern")}
                        className={`flex-1 py-2 text-[10px] font-modern font-bold rounded-lg transition-all ${fontStyle === "modern" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                      >
                        {t.settings.fontStyleModern}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dashed dark:border-white/5 border-slate-100">
                    <div className="flex items-center gap-2">
                      <Newspaper
                        size={14}
                        className={
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }
                      />
                      <span className="text-xs font-bold">
                        {t.settings.newsTicker}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNewsFeed(!showNewsFeed)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showNewsFeed ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <div
                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showNewsFeed ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-dashed dark:border-white/5 border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers
                        size={14}
                        className={
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }
                      />
                      <span className="text-xs font-bold">
                        {t.settings.flashcardMode}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsFlashcardMode(!isFlashcardMode)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isFlashcardMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <div
                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFlashcardMode ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Type size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.textSize}
                    </span>
                  </div>
                  <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                    {[
                      { id: "sm", label: "A" },
                      { id: "base", label: "AA" },
                      { id: "lg", label: "AAA" },
                      { id: "xl", label: "AAAA" },
                    ].map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setTextSize(size.id as TextSize)}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${textSize === size.id ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Languages size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.languages}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase opacity-40 mb-2">
                        {t.settings.language}
                      </label>
                      <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                        <button
                          onClick={() => setUiLanguage("es")}
                          className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${uiLanguage === "es" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                        >
                          {t.settings.langEs}
                        </button>
                        <button
                          onClick={() => setUiLanguage("en")}
                          className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${uiLanguage === "en" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                        >
                          {t.settings.langEn}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase opacity-40 mb-2">
                        {t.settings.contentLang}
                      </label>
                      <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
                        <button
                          onClick={() => setContentLanguage("es")}
                          className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${contentLanguage === "es" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                        >
                          {t.settings.langEs}
                        </button>
                        <button
                          onClick={() => setContentLanguage("original")}
                          className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${contentLanguage === "original" ? "bg-blue-600 text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
                        >
                          {t.settings.langOriginal}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wifi size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {t.settings.syncWifi}
                      </span>
                    </div>
                    <button
                      onClick={() => backgroundSyncService.setEnabled(!syncState.isEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${syncState.isEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <div
                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${syncState.isEnabled ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>
                  
                  <p className="text-[10px] opacity-60 leading-relaxed mb-4">
                    {t.settings.syncDesc}
                  </p>

                  {/* Sync status / action */}
                  <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="opacity-60">{t.settings.syncStatus}</span>
                      <span className={`font-bold flex items-center gap-1 ${syncState.isSyncing ? "text-blue-500" : "text-emerald-500"}`}>
                        {syncState.isSyncing ? (
                          <>
                            <RefreshCw size={10} className="animate-spin text-blue-500" />
                            {t.settings.syncing}
                          </>
                        ) : (
                          <>
                            <CheckCircle size={10} className="text-emerald-500" />
                            {t.settings.syncReady}
                          </>
                        )}
                      </span>
                    </div>

                    {syncState.isSyncing && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] opacity-80">
                          <span className="truncate max-w-[150px]">
                            {syncState.currentArticleTitle || t.settings.syncProcessing}
                          </span>
                          <span>
                            {syncState.completed}/{syncState.total}
                          </span>
                        </div>
                        <div className="h-1 text-xs flex rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            style={{ width: `${(syncState.completed / (syncState.total || 1)) * 100}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                          />
                        </div>
                      </div>
                    )}

                    {!syncState.isSyncing && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] opacity-50">
                          {syncState.lastSyncedAt 
                            ? `${t.settings.syncLast} ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : t.settings.syncNever
                          }
                        </span>
                        
                        <button
                          onClick={() => backgroundSyncService.runSync(savedArticles)}
                          disabled={savedArticles.length === 0}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {t.settings.syncNow}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ScanEye size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {t.settings.autoXrayTitle}
                      </span>
                    </div>
                    <button
                      onClick={() => setAutoXray(!autoXray)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${autoXray ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <div
                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoXray ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* PWA INSTALLATION SECTION */}
                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Download size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.pwaTitle}
                    </span>
                  </div>

                  {isInstalled ? (
                    <div className="space-y-2 text-center py-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle size={24} />
                      </div>
                      <h4 className="font-black text-xs uppercase tracking-tight text-emerald-500">
                        {t.settings.pwaInstalled}
                      </h4>
                      <p className="text-[10px] opacity-60 leading-relaxed">
                        {t.settings.pwaInstalledDesc}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[10px] opacity-60 leading-relaxed italic">
                        {t.settings.pwaInstallDesc}
                      </p>

                      {deferredPrompt ? (
                        <button
                          onClick={handleInstallApp}
                          className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> {t.settings.pwaInstallBtn}
                        </button>
                      ) : (
                        <div className="space-y-3 pt-2 border-t border-dashed dark:border-white/5 border-slate-100">
                          {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                            <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1 text-left">
                              <h5 className="font-black text-[10px] uppercase text-blue-500 flex items-center gap-1">
                                <span className="text-base">📱</span> {t.settings.pwaIosTitle}
                              </h5>
                              <p className="text-[10px] opacity-70 leading-relaxed">
                                {t.settings.pwaIosDesc}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1 text-left">
                              <h5 className="font-black text-[10px] uppercase opacity-70 flex items-center gap-1">
                                <span className="text-base">⚙️</span> {t.settings.pwaManualTitle}
                              </h5>
                              <p className="text-[10px] opacity-60 leading-relaxed">
                                {t.settings.pwaManualDesc}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4 text-red-500">
                    <Trash2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.dataMaintenance}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {deleteConfirmTarget === "history" ? (
                      <div className="flex gap-2 animate-in zoom-in-95">
                        <button
                          onClick={() => {
                            handleClearHistory();
                            setDeleteConfirmTarget(null);
                          }}
                          className="flex-1 p-4 rounded-2xl bg-red-600 text-white font-black text-sm"
                        >
                          {t.settings.confirmDelete}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTarget(null)}
                          className="p-4 rounded-2xl bg-slate-200 dark:bg-slate-800 font-bold text-sm"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmTarget("history")}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold text-sm hover:bg-red-500/20"
                      >
                        <span>{t.settings.clearSearchHistory}</span>
                        <RotateCcw size={16} />
                      </button>
                    )}

                    {deleteConfirmTarget === "factory" ? (
                      <div className="p-4 rounded-2xl border-2 border-red-600 space-y-3 animate-in shake-1">
                        <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-tighter">
                          {t.settings.areYouSure}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleFactoryReset}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase"
                          >
                            {t.settings.yesReset}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget(null)}
                            className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-black text-xs"
                          >
                            {t.settings.noReset}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmTarget("factory")}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-500 text-red-500 font-black text-xs uppercase tracking-tighter hover:bg-red-500 hover:text-white"
                      >
                        <span>{t.settings.factoryReset}</span>
                        <AlertCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        updateVerificationStatus("unverified");
                      }}
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all opacity-30 hover:opacity-100"
                    >
                      {t.settings.resetVerify}
                    </button>
                  </div>
                </div>

                <div
                  className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Info size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.settings.infoHelp}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? "bg-slate-800/50" : "bg-slate-100"}`}
                    >
                      <span className="text-xs font-bold opacity-70">
                        {t.settings.currentVersion}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                        v1.0 Alpha
                      </span>
                    </div>
                    <button
                      onClick={() => setIsInfoModalOpen(true)}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      <Info size={14} />
                      {t.settings.viewFullInfo}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLanguageSelectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div
                className={`p-6 border-b text-center ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}
              >
                <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 mb-3 flex items-center justify-center text-white shadow-lg">
                  <Globe size={24} />
                </div>
                <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Select Language<br/>Seleccionar Idioma</h2>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => {
                     setUiLanguage("en");
                     setContentLanguage("en");
                     localStorage.setItem("ne_lang_selected", "en");
                     setIsLanguageSelectOpen(false);
                     const hasSeenIntro = localStorage.getItem("ne_intro_seen");
                     if (!hasSeenIntro) {
                       setIsInfoModalOpen(true);
                       localStorage.setItem("ne_intro_seen", "true");
                     }
                  }}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold border-2 transition-all ${isDarkMode ? "border-slate-800 hover:border-blue-500 hover:bg-slate-800 text-white" : "border-slate-200 hover:border-blue-500 hover:bg-slate-50 text-slate-900"}`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  English
                </button>
                <button
                  onClick={() => {
                     setUiLanguage("es");
                     setContentLanguage("es");
                     localStorage.setItem("ne_lang_selected", "es");
                     setIsLanguageSelectOpen(false);
                     const hasSeenIntro = localStorage.getItem("ne_intro_seen");
                     if (!hasSeenIntro) {
                       setIsInfoModalOpen(true);
                       localStorage.setItem("ne_intro_seen", "true");
                     }
                  }}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold border-2 transition-all ${isDarkMode ? "border-slate-800 hover:border-blue-500 hover:bg-slate-800 text-white" : "border-slate-200 hover:border-blue-500 hover:bg-slate-50 text-slate-900"}`}
                >
                  <span className="text-2xl">🇪🇸</span>
                  Español
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInfoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setIsInfoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div
                className={`p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-600 p-2 text-white shadow-lg">
                    <KidneyIcon size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      NephroUpdate
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      v1.0 Alpha
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">
                    {t.infoMenu.navAndDock}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-blue-600/10 text-blue-500">
                        <Radar size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.discoverLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.discoverDesc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-blue-600/10 text-blue-500">
                        <History size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.historyLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.historyDesc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-blue-600/10 text-blue-500">
                        <Bookmark size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.libraryLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.libraryDesc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500">
                        <Mic size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.voiceLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.voiceDesc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                        <Building2 size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.communityLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.communityDesc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
                        <Database size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase">
                          {t.infoMenu.cloudSyncLabel}
                        </h4>
                        <p className="text-[10px] opacity-60 leading-tight mt-1">
                          {t.infoMenu.cloudSyncDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">
                    {t.infoMenu.studyTools}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: Bookmark,
                        label: t.infoMenu.saveOfflineLabel,
                        desc: t.infoMenu.saveOfflineDesc,
                      },
                      {
                        icon: StickyNote,
                        label: t.infoMenu.notesLabel,
                        desc: t.infoMenu.notesDesc,
                      },
                      {
                        icon: MessageCircle,
                        label: t.infoMenu.debateLabel,
                        desc: t.infoMenu.debateDesc,
                      },
                      {
                        icon: Quote,
                        label: t.infoMenu.citeLabel,
                        desc: t.infoMenu.citeDesc,
                      },
                      {
                        icon: Zap,
                        label: t.infoMenu.aiEnhanceLabel,
                        desc: t.infoMenu.aiEnhanceDesc,
                      },
                      {
                        icon: ImageIcon,
                        label: t.infoMenu.visualAbstractLabel,
                        desc: t.infoMenu.visualAbstractDesc,
                      },
                      {
                        icon: Sparkles,
                        label: t.infoMenu.relatedLabel,
                        desc: t.infoMenu.relatedDesc,
                      },
                      {
                        icon: Workflow,
                        label: t.infoMenu.fullTextFlowLabel,
                        desc: t.infoMenu.fullTextFlowDesc,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}
                      >
                        <item.icon
                          size={14}
                          className="text-blue-500 shrink-0"
                        />
                        <div>
                          <span
                            className={`text-[10px] font-bold block ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {item.label}
                          </span>
                          <span className="text-[8px] opacity-50 block leading-tight">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">
                    {t.infoMenu.statusGlossary}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: Flame,
                        color: "text-orange-500",
                        label: t.infoMenu.highImpact,
                      },
                      {
                        icon: Unlock,
                        color: "text-emerald-500",
                        label: t.infoMenu.openAccess,
                      },
                      {
                        icon: WifiOff,
                        color: "text-emerald-500",
                        label: t.infoMenu.offlineAvailable,
                      },
                      {
                        icon: Activity,
                        color: "text-blue-500",
                        label: t.infoMenu.clinicalCapsule,
                      },
                      {
                        icon: FlaskConical,
                        color: "text-blue-400",
                        label: t.infoMenu.clinicalTrial,
                      },
                      {
                        icon: Scale,
                        color: "text-emerald-400",
                        label: t.infoMenu.clinicalGuideline,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}
                      >
                        <item.icon size={14} className={item.color} />
                        <span
                          className={`text-[10px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className={`p-5 rounded-3xl border ${isDarkMode ? "bg-blue-900/10 border-blue-800/30" : "bg-blue-50 border-blue-100"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit size={16} className="text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      {t.infoMenu.searchEngineTitle}
                    </h3>
                  </div>
                  <div className="space-y-3 text-[11px] leading-relaxed opacity-80">
                    <p>
                      {t.infoMenu.searchEngineIntro}
                    </p>
                    <ul className="space-y-2 list-disc list-inside">
                      <li>
                        <strong>{t.infoMenu.neuralTranslationTitle}</strong>{t.infoMenu.neuralTranslationDesc}
                      </li>
                      <li>
                        <strong>{t.infoMenu.picoModeTitle}</strong>{t.infoMenu.picoModeDesc}
                      </li>
                      <li>
                        <strong>{t.infoMenu.groundingTitle}</strong>{t.infoMenu.groundingDesc}
                      </li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">
                    {t.infoMenu.aboutAppTitle}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {t.infoMenu.aboutAppDesc}
                  </p>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">
                    {t.infoMenu.medicalDirection}
                  </h3>
                  <div
                    className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-blue-100"}`}
                  >
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}
                    >
                      DP
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        Dr. Adalberto Peña Wilches
                      </h4>
                      <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider mb-1">
                        {t.infoMenu.role}
                      </p>
                      <a
                        href="mailto:adalberto.pw@gmail.com"
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:underline"
                      >
                        <Mail size={12} /> adalberto.pw@gmail.com
                      </a>
                    </div>
                  </div>
                </section>

                <section
                  className={`p-4 rounded-2xl border border-dashed ${isDarkMode ? "border-amber-500/30 bg-amber-500/5" : "border-amber-200 bg-amber-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <AlertCircle size={16} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">
                      {t.legalNotice}
                    </h3>
                  </div>
                  <p
                    className={`text-[10px] leading-relaxed ${isDarkMode ? "text-amber-200/70" : "text-amber-800/70"}`}
                  >
                    {t.legalDesc}
                  </p>
                </section>

                <div className="text-center opacity-30 text-[9px] font-mono">
                  Build: 2026.1.0-alpha • React Native / Capacitor
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isUserSelectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black flex items-center gap-2">
                <User size={20} className="text-indigo-500" />
                {t.selectColleague}
              </h3>
              <button
                onClick={() => setIsUserSelectorOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {communityUsers.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <User size={48} className="mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">
                    {t.noColleagues}
                  </p>
                </div>
              ) : (
                communityUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleShareWithUser(u)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? "bg-slate-800 border-slate-700 hover:border-indigo-500/50" : "bg-slate-50 border-slate-200 hover:border-indigo-500/50 hover:shadow-md"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{u.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">
                        {u.specialty}
                      </p>
                    </div>
                    <ChevronRight size={16} className="opacity-30" />
                  </button>
                ))
              )}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 text-center">
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                {t.sendingArticles.replace('{counts}', selectedLibraryArticles.length.toString())}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        contextText={summary}
        isDarkMode={isDarkMode}
        language={uiLanguage === "es" ? "es" : "original"}
        apiKey={geminiApiKey}
        onToolCall={handleToolCall}
      />
      <AnimatePresence>
        {activeImmersiveArticle && (
          <ImmersiveReader
            article={activeImmersiveArticle}
            onClose={() => setActiveImmersiveArticle(null)}
            isDarkMode={isDarkMode}
            onUpdateNote={handleUpdateNote}
            onAddHighlight={handleAddHighlight}
            onRemoveHighlight={handleRemoveHighlight}
            onUpdateReadingStatus={handleUpdateReadingStatus}
            onProposeDebate={handleProposeDebate}
            onUpdateArticle={(updatedArticle) => {
              handleUpdateArticle(updatedArticle.id, updatedArticle);
              setActiveImmersiveArticle(updatedArticle);
            }}
            fontStyle={fontStyle}
            language={uiLanguage === "es" ? "es" : "en"}
            geminiApiKey={geminiApiKey}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}
      </AnimatePresence>
      <OfflineReader
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        article={readerArticle}
        htmlContent={readerHtml}
        isDarkMode={isDarkMode}
        isLoading={isReaderLoading}
        onSaveOffline={handleSaveOffline}
        isAlreadyDownloaded={
          readerArticle ? !!offlineStatus[readerArticle.id] : false
        }
        onUpdateReadingStatus={handleUpdateReadingStatus}
      />
      {viewingHistorySnapshot && (
        <HistoryViewer
          snapshot={viewingHistorySnapshot}
          onClose={() => setViewingHistorySnapshot(null)}
          isDarkMode={isDarkMode}
          onToggleSave={toggleSave}
          savedArticles={savedArticles}
          language={uiLanguage === "es" ? "es" : "original"}
          textSize={textSize}
          fontStyle={fontStyle}
          apiKey={geminiApiKey}
          groqApiKey={groqApiKey}
          offlineStatus={offlineStatus}
          onReadOffline={() => {}}
          onReadFullText={handleFetchFullText}
          onUpdateArticle={handleUpdateArticle}
          onOpenImmersive={setActiveImmersiveArticle}
        />
      )}
      <AnimatePresence>
        {isFlashcardMode && filteredArticles.length > 0 && (
          <FlashcardView
            articles={filteredArticles}
            isDarkMode={isDarkMode}
            onClose={() => setIsFlashcardMode(false)}
            onOpenImmersive={setActiveImmersiveArticle}
            onToggleSave={toggleSave}
            savedArticles={savedArticles}
            geminiApiKey={geminiApiKey}
            fontStyle={fontStyle}
            t={t.flashcard}
          />
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDarkMode={isDarkMode}
        t={t.auth}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border font-black text-xs uppercase tracking-widest"
            style={{
              backgroundColor:
                toast.type === "success"
                  ? isDarkMode
                    ? "#064e3b"
                    : "#ecfdf5"
                  : isDarkMode
                    ? "#7f1d1d"
                    : "#fef2f2",
              borderColor:
                toast.type === "success"
                  ? isDarkMode
                    ? "#059669"
                    : "#10b981"
                  : isDarkMode
                    ? "#dc2626"
                    : "#ef4444",
              color:
                toast.type === "success"
                  ? isDarkMode
                    ? "#34d399"
                    : "#047857"
                  : isDarkMode
                    ? "#f87171"
                    : "#b91c1c",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <ShieldAlert size={18} />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
