
import { Browser } from '@capacitor/browser';

/**
 * Abre una URL en el navegador interno del sistema (Chrome Custom Tabs en Android, 
 * SFSafariViewController en iOS).
 * 
 * Características:
 * - Sesión Compartida: El usuario permanece logueado en sitios como Google/Facebook.
 * - Barra de Herramientas Personalizada: Usa el color primario de la app.
 * - Controles Nativos: Botones de cerrar y compartir nativos.
 */
export const openExternalUrl = async (url: string, isDarkMode: boolean = false) => {
    if (!url) return;

    // Colores de la marca para la Toolbar
    // Blue-600 (#2563eb) para Modo Claro
    // Slate-950 (#020617) para Modo Oscuro
    const toolbarColor = isDarkMode ? '#020617' : '#2563eb';

    try {
        await Browser.open({
            url: url,
            toolbarColor: toolbarColor,
            // 'fullscreen' presentation style on iOS feels most like an in-app browser
            presentationStyle: 'fullscreen', 
            windowName: '_self' // Try to hint self-opening context
        });
    } catch (error) {
        console.warn('In-App Browser no disponible, usando fallback estándar.', error);
        // Fallback seguro para entornos web puros donde Capacitor no esté inyectado
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

/**
 * Cierra el navegador interno si está abierto (útil para deep links o control programático).
 */
export const closeInAppBrowser = async () => {
    try {
        await Browser.close();
    } catch (e) {
        // Ignorar si no está abierto
    }
};
