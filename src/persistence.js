const DB_NAME = "flashframe";
const DB_VERSION = 1;

let dbPromise;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("content")) {
        db.createObjectStore("content", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore(storeName, mode, work) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;

    try {
      result = work(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveSnapshot(snapshot) {
  await withStore("snapshots", "readwrite", (store) => store.put(snapshot));
}

export async function listSnapshots() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshots", "readonly");
    const request = transaction.objectStore("snapshots").getAll();

    request.onsuccess = () => {
      const snapshots = request.result ?? [];
      snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(snapshots);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getSnapshot(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshots", "readonly");
    const request = transaction.objectStore("snapshots").get(id);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function putHandle(id, handle) {
  await withStore("handles", "readwrite", (store) => store.put({ id, handle }));
}

export async function getHandle(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("handles", "readonly");
    const request = transaction.objectStore("handles").get(id);

    request.onsuccess = () => resolve(request.result?.handle ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function listHandles() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("handles", "readonly").objectStore("handles").getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function putContent(id, value) {
  await withStore("content", "readwrite", (store) => store.put({ id, value }));
}

export async function getContent(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("content", "readonly");
    const request = transaction.objectStore("content").get(id);

    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}
