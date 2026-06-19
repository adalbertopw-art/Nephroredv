import { Network, ConnectionStatus } from "@capacitor/network";
import { Article } from "../types";
import { fetchArticleContent } from "./downloadService";
import { saveArticleOffline, getOfflineStatusMap } from "./storageService";

export interface SyncState {
    isEnabled: boolean;
    isSyncing: boolean;
    total: number;
    completed: number;
    failed: number;
    currentArticleTitle?: string;
    lastSyncedAt?: number;
}

type SyncStateListener = (state: SyncState) => void;

class BackgroundSyncService {
    private isEnabledKey = "ne_wifi_sync";
    private lastSyncedKey = "ne_wifi_sync_last_time";
    private listeners = new Set<SyncStateListener>();
    private isSyncing = false;
    private state: SyncState = {
        isEnabled: true,
        isSyncing: false,
        total: 0,
        completed: 0,
        failed: 0,
    };

    constructor() {
        // Load settings from localStorage
        const savedEnabled = localStorage.getItem(this.isEnabledKey);
        this.state.isEnabled = savedEnabled !== null ? savedEnabled === "true" : true;
        
        const lastSynced = localStorage.getItem(this.lastSyncedKey);
        if (lastSynced) {
            this.state.lastSyncedAt = parseInt(lastSynced, 10);
        }

        // Initialize connection listening
        this.initNetworkListener();
    }

    private async initNetworkListener() {
        try {
            // Initial check
            const status = await Network.getStatus();
            this.handleConnectionChange(status);

            // Listen to network changes
            await Network.addListener("networkStatusChange", (status: ConnectionStatus) => {
                this.handleConnectionChange(status);
            });
        } catch (e) {
            console.warn("[Sync] Capacitor Network not fully initialized, using browser connection fallback.", e);
            
            // Web fallback
            if (window.navigator && "connection" in window.navigator) {
                const conn = (window.navigator as any).connection;
                if (conn) {
                    conn.addEventListener("change", () => {
                        this.assessAndTriggerSync();
                    });
                }
            }
            
            window.addEventListener("online", () => {
                this.assessAndTriggerSync();
            });
        }
    }

    private handleConnectionChange(status: ConnectionStatus) {
        console.log(`[Sync] Connection changed: ${status.connected}, type: ${status.connectionType}`);
        this.assessAndTriggerSync(status);
    }

    /**
     * Toggles whether the background sync on Wi-Fi is enabled.
     */
    public setEnabled(enabled: boolean) {
        this.state.isEnabled = enabled;
        localStorage.setItem(this.isEnabledKey, String(enabled));
        this.notify();

        if (enabled) {
            this.assessAndTriggerSync();
        } else if (this.isSyncing) {
            this.stopSync();
        }
    }

    /**
     * Subscribes to sync state changes.
     */
    public subscribe(listener: SyncStateListener): () => void {
        this.listeners.add(listener);
        listener({ ...this.state });
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        const snapshot = { ...this.state };
        this.listeners.forEach((listener) => listener(snapshot));
    }

    /**
     * Determines if the connection is currently Wi-Fi or compatible high-speed.
     */
    public async isWifiConnection(): Promise<boolean> {
        try {
            const status = await Network.getStatus();
            if (!status.connected) return false;
            return status.connectionType === "wifi";
        } catch {
            // Fallback for browser
            if (window.navigator && !window.navigator.onLine) return false;
            
            if (window.navigator && "connection" in window.navigator) {
                const conn = (window.navigator as any).connection;
                if (conn) {
                    if (conn.type) {
                        return conn.type === "wifi" || conn.type === "ethernet";
                    }
                    if (conn.saveData) return false;
                    // On desktop/browser without typings support, let's treat it as high speed
                    return true;
                }
            }
            return true; // Default to true on web for testing simulator
        }
    }

    /**
     * Decides whether to start background sync.
     */
    public async assessAndTriggerSync(status?: ConnectionStatus) {
        if (!this.state.isEnabled || this.isSyncing) return;

        let onWifi = false;
        if (status) {
            onWifi = status.connected && status.connectionType === "wifi";
        } else {
            onWifi = await this.isWifiConnection();
        }

        if (onWifi) {
            console.log("[Sync] Device is on Wi-Fi, initiating automatic full-text caching check.");
            // Trigger background sync inside a microtask so it won't block main UI load
            setTimeout(() => this.runSync(), 1000);
        } else {
            console.log("[Sync] Background sync bypassed: Not on Wi-Fi.");
        }
    }

    private stopSync() {
        this.isSyncing = false;
        this.state.isSyncing = false;
        this.notify();
    }

    /**
     * Scans for saved articles that aren't downloaded offline and downloads them.
     */
    public async runSync(savedArticlesList?: Article[]): Promise<void> {
        if (this.isSyncing) return;
        
        let articles: Article[] = [];
        
        if (savedArticlesList) {
            articles = savedArticlesList;
        } else {
            // Retrieve saved articles list from localStorage
            try {
                const saved = localStorage.getItem("ne_saved");
                if (saved) {
                    articles = JSON.parse(saved);
                }
            } catch (e) {
                console.error("[Sync] Error loading saved articles from localStorage for sync", e);
                return;
            }
        }

        if (!articles || articles.length === 0) {
            console.log("[Sync] No saved articles to sync.");
            return;
        }

        // Check offline status map to find which ones are missing
        let statusMap: Record<string, boolean> = {};
        try {
            statusMap = await getOfflineStatusMap();
        } catch (e) {
            console.error("[Sync] Failed to get offline status map", e);
            return;
        }

        const missingArticles = articles.filter(art => !statusMap[art.id]);
        if (missingArticles.length === 0) {
            console.log("[Sync] All saved articles are already offline. Sync complete.");
            return;
        }

        // Start Sync flow
        this.isSyncing = true;
        this.state.isSyncing = true;
        this.state.total = missingArticles.length;
        this.state.completed = 0;
        this.state.failed = 0;
        this.notify();

        console.log(`[Sync] Syncing ${missingArticles.length} missing articles in background...`);

        for (const art of missingArticles) {
            if (!this.isSyncing || !this.state.isEnabled) {
                console.log("[Sync] Sync aborted mid-run.");
                break;
            }

            // Check if connection changed to non-wifi mid-sync
            const onWifiNow = await this.isWifiConnection();
            if (!onWifiNow) {
                console.log("[Sync] Device disconnected from Wi-Fi. Pausing sync.");
                break;
            }

            this.state.currentArticleTitle = art.title;
            this.notify();

            try {
                console.log(`[Sync] Automatically downloading: "${art.title}"`);
                const content = await fetchArticleContent(art);
                await saveArticleOffline(art, content.html, content.isFullText);
                
                this.state.completed++;
            } catch (err) {
                console.error(`[Sync] Failed downloading "${art.title}"`, err);
                this.state.failed++;
            }

            this.notify();
            // Stagger downloads to prevent rate-limiting or blocking UI
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        this.isSyncing = false;
        this.state.isSyncing = false;
        this.state.currentArticleTitle = undefined;
        this.state.lastSyncedAt = Date.now();
        localStorage.setItem(this.lastSyncedKey, String(this.state.lastSyncedAt));
        this.notify();

        console.log(`[Sync] Sync loop finished. Completed: ${this.state.completed}, Failed: ${this.state.failed}`);
    }

    public getState(): SyncState {
        return { ...this.state };
    }
}

export const backgroundSyncService = new BackgroundSyncService();
