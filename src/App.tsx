import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileGrid } from './components/FileGrid';
import { FileViewer } from './components/FileViewer';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import type { Folder, FileItem, GithubConfig, SupabaseConfig } from './types';
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
  getCachedFileKeys,
  downloadFileFromGithub,
  downloadFileFromUrl,
  isDefaultFile,
  uploadToSupabase,
} from './utils/db';
import { FolderPlus, AlertCircle, Cloud } from 'lucide-react';

const DEFAULT_GIT_CONFIG: GithubConfig = {
  token: '',
  owner: '',
  repo: '',
  branch: 'main',
  enabled: false,
};

const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  projectRef: '',
  apiKey: '',
  bucketName: 'classroom-assets',
  enabled: true,
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
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(DEFAULT_SUPABASE_CONFIG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingFileTitle, setLoadingFileTitle] = useState<string | null>(null);

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
              const cachedKeys = await getCachedFileKeys();
              const processedFiles = remote.files.map(f => ({
                ...f,
                isLocal: cachedKeys.includes(f.file)
              }));

              setFolders(remote.folders);
              setFiles(processedFiles);
              await saveLibrary(remote.folders, processedFiles);
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

      // Load Supabase config
      const savedSupabaseConfig = localStorage.getItem('library_supabase_config');
      if (savedSupabaseConfig) {
        try {
          const parsed = JSON.parse(savedSupabaseConfig) as SupabaseConfig;
          setSupabaseConfig(parsed);
        } catch (e) {
          console.error('Failed to parse Supabase config', e);
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
        const cachedKeys = await getCachedFileKeys();
        const processedFiles = remote.files.map(f => ({
          ...f,
          isLocal: cachedKeys.includes(f.file)
        }));

        setFolders(remote.folders);
        setFiles(processedFiles);
        await saveLibrary(remote.folders, processedFiles);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Sync config saved, but could not download lists from repository. Check token/repo names.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveSupabaseConfig = (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    localStorage.setItem('library_supabase_config', JSON.stringify(newConfig));
  };

  const handleManualSync = async () => {
    if (!githubConfig.token) throw new Error('Token is required');
    const remote = await fetchLibraryFromGithub(githubConfig);
    const cachedKeys = await getCachedFileKeys();
    const processedFiles = remote.files.map(f => ({
      ...f,
      isLocal: cachedKeys.includes(f.file)
    }));
    setFolders(remote.folders);
    setFiles(processedFiles);
    await saveLibrary(remote.folders, processedFiles);
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
    // If GitHub is enabled but Supabase is disabled, enforce 25MB file size limit for GitHub REST API commits
    if (githubConfig.enabled && !supabaseConfig.enabled && file.size > 25 * 1024 * 1024) {
      alert('GitHub REST API only supports files up to 25MB. For larger files (especially videos), please configure Supabase Storage in Library Settings.');
      return;
    }

    setIsSyncing(true);
    try {
      const timestamp = Date.now();
      const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      let fileUrl = '';
      let isLocal = true;

      if (supabaseConfig.enabled && supabaseConfig.projectRef && supabaseConfig.apiKey) {
        // Upload to Supabase Storage
        const folderPrefix = type === 'video' ? 'videos' : type === 'pdf' ? 'files' : 'ppts';
        const key = `${folderPrefix}/${timestamp}-${cleanFilename}`;
        fileUrl = await uploadToSupabase(supabaseConfig, file, key);
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
        if (!supabaseConfig.enabled) {
          // Only upload file to GitHub if Supabase is NOT enabled
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

  // Downloads and caches a file in IndexedDB if it is not yet local
  const ensureFileCached = async (file: FileItem): Promise<string> => {
    if (file.isLocal) {
      const blob = await getFileBlob(file.file);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }

    if (isDefaultFile(file)) {
      return getFullFileUrl(file.file);
    }

    // Resolve remote cloud files
    setLoadingFileTitle(file.title);
    try {
      let blob: Blob;
      if (file.file.startsWith('http')) {
        // Fetch from public R2/cloud storage
        blob = await downloadFileFromUrl(file.file);
      } else if (githubConfig.enabled && githubConfig.token) {
        // Fetch from GitHub
        blob = await downloadFileFromGithub(githubConfig, file.file);
      } else {
        throw new Error('No cloud configuration active to download this remote file. Please check settings.');
      }

      // Save blob to IndexedDB
      await saveFileBlob(file.file, blob);

      // Update state and IndexedDB metadata
      const updatedFiles = files.map((f) =>
        f.file === file.file ? { ...f, isLocal: true } : f
      );
      setFiles(updatedFiles);
      await saveLibrary(folders, updatedFiles);

      const cachedBlob = await getFileBlob(file.file);
      if (!cachedBlob) {
        throw new Error('Blob could not be read back from IndexedDB after save.');
      }
      return URL.createObjectURL(cachedBlob);
    } catch (err: any) {
      console.error('Failed to download cloud file:', err);
      throw new Error(`Cloud download failed: ${err.message || 'Check your network connectivity.'}`);
    } finally {
      setLoadingFileTitle(null);
    }
  };

  const handleOpenFile = async (file: FileItem) => {
    try {
      const fileUrl = await ensureFileCached(file);
      setViewerFile({ ...file, file: fileUrl });
    } catch (err: any) {
      alert(err.message || 'Failed to open file.');
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    try {
      const fileUrl = await ensureFileCached(file);
      
      const a = document.createElement('a');
      a.href = fileUrl;
      const extension = file.type === 'pdf' ? '.pdf' : file.type === 'ppt' ? '.pptx' : '.mp4';
      a.download = file.title + extension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (fileUrl.startsWith('blob:')) {
        // Delay revoking to allow browser download to start
        setTimeout(() => URL.revokeObjectURL(fileUrl), 100);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to download file.');
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
          isCloudEnabled={githubConfig.enabled || supabaseConfig.enabled}
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
          supabaseConfig={supabaseConfig}
          onSaveSupabaseConfig={handleSaveSupabaseConfig}
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

      {/* Loading overlay for downloading files from cloud */}
      {loadingFileTitle && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <Cloud className="absolute text-brand-600 w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">Fetching teaching material...</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
                We are downloading <strong className="text-slate-700">"{loadingFileTitle}"</strong> from the repository / cloud storage to this device.
              </p>
            </div>
            <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-500 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
