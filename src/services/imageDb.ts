/**
 * IndexedDB storage for caching generated flashcard illustrations locally.
 * Prevents re-generating pictures that were already created.
 */

const DB_NAME = 'ilmisino_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'card_images';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function getCachedCardImage(cardId: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cardId);

      req.onsuccess = () => {
        if (req.result && req.result.imageUrl) {
          resolve(req.result.imageUrl);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

export async function setCachedCardImage(cardId: string, imageUrl: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key: cardId, imageUrl, cachedAt: Date.now() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Non-blocking failure
    });
  } catch (err) {
    // Non-blocking
  }
}

export async function removeCachedCardImage(cardId: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(cardId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    // Non-blocking
  }
}
