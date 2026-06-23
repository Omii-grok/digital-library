import foldersSeed from '../../data/folders.json';
import filesSeed from '../../data/files.json';
import type { Folder, FileItem, GithubConfig } from '../types';

const DB_NAME = 'DigitalLibraryDB';
const DB_VERSION = 1;
const BLOB_STORE = 'files_blobs';
const STATE_STORE = 'library_state';

// Helper to check if a file is a default seed file
export const isDefaultFile = (fileItem: FileItem) => {
  return !fileItem.isLocal && (fileItem.file.startsWith('/files/') || fileItem.file.startsWith('/ppts/'));
};

// Initialize IndexedDB
export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
    };
  });
}

// Get item from library_state store
export async function getState<T>(key: string): Promise<T | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATE_STORE, 'readonly');
    const store = transaction.objectStore(STATE_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Set item in library_state store
export async function setState<T>(key: string, value: T): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATE_STORE, 'readwrite');
    const store = transaction.objectStore(STATE_STORE);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save binary file blob to IndexedDB
export async function saveFileBlob(path: string, blob: Blob): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readwrite');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.put(blob, path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get binary file blob from IndexedDB
export async function getFileBlob(path: string): Promise<Blob | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readonly');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.get(path);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Delete binary file blob from IndexedDB
export async function deleteFileBlob(path: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readwrite');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.delete(path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Load current folders and files (either local storage, indexedDB, or seeds)
export async function loadLibrary(): Promise<{ folders: Folder[]; files: FileItem[] }> {
  try {
    let folders = await getState<Folder[]>('folders');
    let files = await getState<FileItem[]>('files');

    // If local DB is empty, initialize with seed data
    if (!folders) {
      folders = foldersSeed as Folder[];
      await setState('folders', folders);
    }
    if (!files) {
      files = filesSeed as FileItem[];
      await setState('files', files);
    }

    return { folders, files };
  } catch (error) {
    console.error('Failed to load library from db, falling back to seed data:', error);
    return {
      folders: foldersSeed as Folder[],
      files: filesSeed as FileItem[]
    };
  }
}

// Save library lists
export async function saveLibrary(folders: Folder[], files: FileItem[]): Promise<void> {
  await setState('folders', folders);
  await setState('files', files);
}

// Convert Blob to Base64 (for GitHub API uploads)
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Strip out the data URL header e.g. "data:application/pdf;base64,"
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read blob as Base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Base64 to Blob helper
export function base64ToBlob(base64: string, type: string): Blob {
  const binStr = window.atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type });
}

// GitHub REST API: Commits a file content to the repository
export async function commitToGithub(
  config: GithubConfig,
  path: string,
  contentBase64: string,
  message: string
): Promise<void> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}`;

  let sha: string | undefined;

  // 1. Get SHA if the file already exists on GitHub
  try {
    const res = await fetch(`${url}?ref=${config.branch}`, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch (err) {
    console.log('File does not exist or fetch error:', err);
  }

  // 2. Put file contents
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      sha,
      branch: config.branch,
    }),
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`GitHub API commit failed: ${errorText}`);
  }
}

// GitHub REST API: Deletes a file from the repository
export async function deleteFromGithub(
  config: GithubConfig,
  path: string,
  message: string
): Promise<void> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}`;

  // 1. Get SHA
  const res = await fetch(`${url}?ref=${config.branch}`, {
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    // If it doesn't exist on remote, it might have been only local, return success
    return;
  }

  const data = await res.json();
  const sha = data.sha;

  // 2. Delete the file
  const delRes = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message,
      sha,
      branch: config.branch,
    }),
  });

  if (!delRes.ok) {
    const errorText = await delRes.text();
    throw new Error(`GitHub API delete failed: ${errorText}`);
  }
}

// Sync local DB with the actual GitHub Repository configuration files
export async function fetchLibraryFromGithub(config: GithubConfig): Promise<{ folders: Folder[]; files: FileItem[] }> {
  const fetchFile = async (path: string) => {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/vnd.github.v3.raw', // Request raw content directly
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${path} from repository`);
    }
    return res.json();
  };

  const folders = await fetchFile('data/folders.json');
  const files = await fetchFile('data/files.json');

  return { folders, files };
}
