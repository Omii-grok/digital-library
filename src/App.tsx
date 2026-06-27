import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileGrid } from './components/FileGrid';
import { FileViewer } from './components/FileViewer';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import type { Folder, FileItem, GithubConfig, R2Config } from './types';
import {
  loadLibrary,
  saveLibrary,
  saveFileBlob,
  getFileBlob,
  deleteFileBlob,
  blobToBase64,
  commitToGithub,
  deleteFromGithub,
  fetchLibraryFromGithub,
  getFullFileUrl,
  uploadToR2,
} from './utils/db';
import { FolderPlus, AlertCircle } from 'lucide-react';

const DEFAULT_GIT_CONFIG: GithubConfig = {
  token: '',
  owner: '',
  repo: '',
  branch: 'main',
  enabled: false,
};

const DEFAULT_R2_CONFIG: R2Config = {
  accountId: '',
  accessKeyId: '',
  secretAccessKey: '',
  bucketName: '',
  publicDomain: '',
  enabled: false,
};

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Smart Board Mode toggles large layouts
  const [smartBoardMode, setSmartBoardMode] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  
  // Selected viewer document
  const [viewerFile, setViewerFile] = useState<FileItem | null>(null);

  // GitHub integration states
  const [githubConfig, setGithubConfig] = useState<GithubConfig>(DEFAULT_GIT_CONFIG);
  const [r2Config, setR2Config] = useState<R2Config>(DEFAULT_R2_CONFIG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Initial Load
  useEffect(() => {
    async function init() {
      // Load files and folders from local DB (IndexedDB/Seeds)
      const data = await loadLibrary();
      setFolders(data.folders);
      setFiles(data.files);

      // Load Git config
      const savedConfig = localStorage.getItem('library_github_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig) as GithubConfig;
          setGithubConfig(parsed);
          
          // Auto sync from GitHub if enabled
          if (parsed.enabled && parsed.token && parsed.owner && parsed.repo) {
            setIsSyncing(true);
            try {
              const remote = await fetchLibraryFromGithub(parsed);
              setFolders(remote.folders);
              setFiles(remote.files);
              await saveLibrary(remote.folders, remote.files);
            } catch (err) {
              console.warn('Failed to auto-sync with GitHub, using local cache:', err);
            } finally {
              setIsSyncing(false);
            }
          }
        } catch (e) {
          console.error('Failed to parse github config', e);
        }
      }

      // Load R2 config
      const savedR2Config = localStorage.getItem('library_r2_config');
      if (savedR2Config) {
        try {
          const parsed = JSON.parse(savedR2Config) as R2Config;
          setR2Config(parsed);
        } catch (e) {
          console.error('Failed to parse R2 config', e);
        }
      }
    }
    init();
  }, []);

  // Sync state handler
  const handleSaveGithubConfig = async (newConfig: GithubConfig) => {
    setGithubConfig(newConfig);
    localStorage.setItem('library_github_config', JSON.stringify(newConfig));

    if (newConfig.enabled && newConfig.token && newConfig.owner && newConfig.repo) {
      setIsSyncing(true);
      setErrorMsg(null);
      try {
        const remote = await fetchLibraryFromGithub(newConfig);
        setFolders(remote.folders);
        setFiles(remote.files);
        await saveLibrary(remote.folders, remote.files);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Sync config saved, but could not download lists from repository. Check token/repo names.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveR2Config = (newConfig: R2Config) => {
    setR2Config(newConfig);
    localStorage.setItem('library_r2_config', JSON.stringify(newConfig));
  };

  const handleManualSync = async () => {
    if (!githubConfig.token) throw new Error('Token is required');
    const remote = await fetchLibraryFromGithub(githubConfig);
    setFolders(remote.folders);
    setFiles(remote.files);
    await saveLibrary(remote.folders, remote.files);
  };

  // Helper to commit DB lists to GitHub
  const pushDatabaseToGithub = async (updatedFolders: Folder[], updatedFiles: FileItem[]) => {
    if (!githubConfig.enabled || !githubConfig.token) return;
    
    // Clean data (strip local specific fields)
    const cleanFolders = updatedFolders.map(({ name }) => ({ name }));
    const cleanFiles = updatedFiles.map(({ title, folder, type, file }) => ({ title, folder, type, file }));

    const foldersB64 = window.btoa(JSON.stringify(cleanFolders, null, 2));
    const filesB64 = window.btoa(JSON.stringify(cleanFiles, null, 2));

    await commitToGithub(githubConfig, 'data/folders.json', foldersB64, 'Update folders list database');
    await commitToGithub(githubConfig, 'data/files.json', filesB64, 'Update files list database');
  };

  // 2. Folder Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      alert('A subject folder with this name already exists.');
      return;
    }

    const updatedFolders = [...folders, { name }];
    setFolders(updatedFolders);
    await saveLibrary(updatedFolders, files);

    setIsSyncing(true);
    try {
      await pushDatabaseToGithub(updatedFolders, files);
    } catch (err) {
      console.error('GitHub Sync failed, saved locally:', err);
      alert('Saved locally, but failed to upload to GitHub repo.');
    } finally {
      setIsSyncing(false);
      setNewFolderName('');
      setIsCreateFolderOpen(false);
    }
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (folders.some((f) => f.name.toLowerCase() === newName.toLowerCase())) {
      alert('A folder with that name already exists.');
      return;
    }

    // Update folder list
    const updatedFolders = folders.map((f) => (f.name === oldName ? { name: newName } : f));
    
    // Update files mapping
    const updatedFiles = files.map((file) =>
      file.folder === oldName ? { ...file, folder: newName } : file
    );

    setFolders(updatedFolders);
    setFiles(updatedFiles);
    await saveLibrary(updatedFolders, updatedFiles);

    setIsSyncing(true);
    try {
      await pushDatabaseToGithub(updatedFolders, updatedFiles);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    const updatedFolders = folders.filter((f) => f.name !== folderName);
    
    // Extract files inside this folder to delete blobs
    const filesToDelete = files.filter((f) => f.folder === folderName);
    const updatedFiles = files.filter((f) => f.folder !== folderName);

    setFolders(updatedFolders);
    setFiles(updatedFiles);
    await saveLibrary(updatedFolders, updatedFiles);

    // Delete local blobs
    for (const file of filesToDelete) {
      if (file.isLocal) {
        await deleteFileBlob(file.file);
      }
    }

    setIsSyncing(true);
    try {
      // Delete files from GitHub if Sync is active
      if (githubConfig.enabled && githubConfig.token) {
        for (const file of filesToDelete) {
          if (!file.file.startsWith('http') && !file.file.startsWith('blob:')) {
            await deleteFromGithub(githubConfig, `/public` + file.file, `Delete file: ${file.title}`);
          }
        }
      }
      await pushDatabaseToGithub(updatedFolders, updatedFiles);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
      if (currentFolder === folderName) {
        setCurrentFolder(null);
      }
    }
  };

  // 3. File Actions
  const handleUploadFile = async (title: string, folder: string, type: 'pdf' | 'ppt' | 'video', file: File) => {
    setIsSyncing(true);
    try {
      const timestamp = Date.now();
      const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      let fileUrl = '';
      let isLocal = true;

      if (r2Config.enabled && r2Config.accountId && r2Config.accessKeyId) {
        // Upload to Cloudflare R2
        const folderPrefix = type === 'video' ? 'videos' : type === 'pdf' ? 'files' : 'ppts';
        const r2Key = `${folderPrefix}/${timestamp}-${cleanFilename}`;
        fileUrl = await uploadToR2(r2Config, file, r2Key);
        isLocal = false;
      } else {
        // Standard local + git upload
        const relativePath = type === 'video'
          ? `/public/videos/${timestamp}-${cleanFilename}`
          : type === 'pdf'
          ? `/public/files/${timestamp}-${cleanFilename}`
          : `/public/ppts/${timestamp}-${cleanFilename}`;
        
        fileUrl = relativePath.replace('/public', ''); // Serve path relative to public folder in Vite

        // Save blob to IndexedDB
        await saveFileBlob(fileUrl, file);
      }

      // Create new file object
      const newFileItem: FileItem = {
        title,
        folder,
        type,
        file: fileUrl,
        isLocal,
        createdAt: new Date().toISOString(),
      };

      const updatedFiles = [...files, newFileItem];
      setFiles(updatedFiles);
      await saveLibrary(folders, updatedFiles);

      // Commit to GitHub if enabled
      if (githubConfig.enabled && githubConfig.token) {
        if (!r2Config.enabled) {
          // Only upload file to GitHub if R2 is NOT enabled
          const relativePath = type === 'video'
            ? `/public/videos/${timestamp}-${cleanFilename}`
            : type === 'pdf'
            ? `/public/files/${timestamp}-${cleanFilename}`
            : `/public/ppts/${timestamp}-${cleanFilename}`;
          const fileBase64 = await blobToBase64(file);
          await commitToGithub(githubConfig, relativePath, fileBase64, `Upload file: ${title}`);
        }
        // Update database lists
        await pushDatabaseToGithub(folders, updatedFiles);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message || 'Check your settings.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFile = async (fileItem: FileItem) => {
    const updatedFiles = files.filter((f) => f.file !== fileItem.file);
    setFiles(updatedFiles);
    await saveLibrary(folders, updatedFiles);

    // Delete local blob
    if (fileItem.isLocal) {
      await deleteFileBlob(fileItem.file);
    }

    setIsSyncing(true);
    try {
      if (githubConfig.enabled && githubConfig.token) {
        // Delete actual asset from repo only if it was hosted on GitHub (not R2 or blob URLs)
        if (!fileItem.file.startsWith('http') && !fileItem.file.startsWith('blob:')) {
          const repoPath = `/public` + fileItem.file;
          await deleteFromGithub(githubConfig, repoPath, `Delete file: ${fileItem.title}`);
        }
        await pushDatabaseToGithub(folders, updatedFiles);
      }
    } catch (err) {
      console.error('GitHub delete failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenFile = async (file: FileItem) => {
    if (file.isLocal) {
      setIsSyncing(true);
      try {
        const blob = await getFileBlob(file.file);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          setViewerFile({ ...file, file: blobUrl });
        } else {
          alert('Local file data not found in browser storage.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load file.');
      } finally {
        setIsSyncing(false);
      }
    } else {
      setViewerFile({ ...file, file: getFullFileUrl(file.file) });
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    let downloadUrl = file.file;
    let isTempUrl = false;

    if (file.isLocal) {
      const blob = await getFileBlob(file.file);
      if (blob) {
        downloadUrl = URL.createObjectURL(blob);
        isTempUrl = true;
      } else {
        alert('File content not found in browser.');
        return;
      }
    } else {
      downloadUrl = getFullFileUrl(downloadUrl);
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    const extension = file.type === 'pdf' ? '.pdf' : file.type === 'ppt' ? '.pptx' : '.mp4';
    a.download = file.title + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (isTempUrl) {
      // Delay revoking to allow browser download to start
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }
  };

  return (
    <div className={`flex h-screen bg-slate-50 font-sans overflow-hidden ${
      smartBoardMode ? 'smart-board-mode' : ''
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        folders={folders}
        currentFolder={currentFolder}
        setCurrentFolder={setCurrentFolder}
        smartBoardMode={smartBoardMode}
        setSmartBoardMode={setSmartBoardMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Toolbar */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentFolder={currentFolder}
          setCurrentFolder={setCurrentFolder}
          smartBoardMode={smartBoardMode}
          onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          githubConfig={githubConfig}
          isSyncing={isSyncing}
        />

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-150 p-3 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto font-bold underline hover:text-rose-900">Dismiss</button>
          </div>
        )}

        {/* Loading Spinner Overlays */}
        {isSyncing && !viewerFile && (
          <div className="absolute top-2 right-4 z-40 bg-white border border-slate-200 shadow-md py-1.5 px-3.5 rounded-full flex items-center gap-2 animate-fade-in text-xs font-bold text-slate-700">
            <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span>GitHub Sync active...</span>
          </div>
        )}

        {/* Files Grid Viewport */}
        <FileGrid
          folders={folders}
          files={files}
          currentFolder={currentFolder}
          setCurrentFolder={setCurrentFolder}
          searchQuery={searchQuery}
          smartBoardMode={smartBoardMode}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onDeleteFile={handleDeleteFile}
          onOpenFile={handleOpenFile}
          onDownloadFile={handleDownloadFile}
        />
      </div>

      {/* Fullscreen Document Viewer */}
      {viewerFile && (
        <FileViewer
          file={viewerFile}
          onClose={() => {
            // Revoke temporary Blob ObjectURL to prevent memory leaks
            if (viewerFile.isLocal && viewerFile.file.startsWith('blob:')) {
              URL.revokeObjectURL(viewerFile.file);
            }
            setViewerFile(null);
          }}
          onDownload={() => handleDownloadFile(viewerFile)}
          smartBoardMode={smartBoardMode}
        />
      )}

      {/* Upload File Modal */}
      {isUploadOpen && (
        <UploadModal
          folders={folders}
          currentFolder={currentFolder}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleUploadFile}
          smartBoardMode={smartBoardMode}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          config={githubConfig}
          onSaveConfig={handleSaveGithubConfig}
          r2Config={r2Config}
          onSaveR2Config={handleSaveR2Config}
          onClose={() => setIsSettingsOpen(false)}
          files={files}
          folders={folders}
          smartBoardMode={smartBoardMode}
          onSyncNow={handleManualSync}
          onDownloadFile={handleDownloadFile}
        />
      )}

      {/* Create Subject Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 p-6 ${
            smartBoardMode ? 'p-8 max-w-lg' : ''
          }`}>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <FolderPlus className="text-brand-500 w-5 h-5" />
              <h3 className={`font-extrabold text-slate-800 font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
                Create Subject Folder
              </h3>
            </div>
            
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`block font-bold text-slate-600 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  Subject / Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. MS Excel Basics"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-4 text-lg' : 'p-2 text-sm'
                  }`}
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateFolderOpen(false);
                    setNewFolderName('');
                  }}
                  className={`font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-all ${
                    smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-md shadow-brand-500/10 ${
                    smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                  }`}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
