
import { Article } from "../types";

const DB_NAME = 'NephroUpdateDB';
const STORE_NAME = 'offline_articles';
const DB_VERSION = 1;

export interface OfflineRecord {
    id: string;
    article: Article;
    htmlContent: string;
    timestamp: number;
    hasFullText?: boolean; // New flag
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const saveArticleOffline = async (article: Article, htmlContent: string, isFullText: boolean = false): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const record: OfflineRecord = {
            id: article.id,
            article: article,
            htmlContent: htmlContent,
            timestamp: Date.now(),
            hasFullText: isFullText
        };

        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getOfflineArticle = async (id: string): Promise<OfflineRecord | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getAllOfflineIds = async (): Promise<Set<string>> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
            const keys = request.result as string[];
            resolve(new Set(keys));
        };
        request.onerror = () => reject(request.error);
    });
};

// New function to get status of all downloads
export const getOfflineStatusMap = async (): Promise<Record<string, boolean>> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const records = request.result as OfflineRecord[];
            const statusMap: Record<string, boolean> = {};
            records.forEach(rec => {
                statusMap[rec.id] = !!rec.hasFullText;
            });
            resolve(statusMap);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteOfflineArticle = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearOfflineStorage = async (): Promise<void> => {
     const db = await openDB();
     return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
