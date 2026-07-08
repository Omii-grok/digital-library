import React, { useState } from 'react';
import { X, Cloud, Save, Download, Info, HardDrive, RefreshCw } from 'lucide-react';
import type { GithubConfig, FileItem, R2Config, SupabaseConfig } from '../types';

interface SettingsModalProps {
  config: GithubConfig;
  onSaveConfig: (config: GithubConfig) => void;
  r2Config: R2Config;
  onSaveR2Config: (config: R2Config) => void;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (config: SupabaseConfig) => void;
  onClose: () => void;
  files: FileItem[];
  folders: any[];
  smartBoardMode: boolean;
  onSyncNow: () => Promise<void>;
  onDownloadFile: (file: FileItem) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  r2Config,
  onSaveR2Config,
  supabaseConfig,
  onSaveSupabaseConfig,
  onClose,
  files,
  folders,
  smartBoardMode,
  onSyncNow,
  onDownloadFile,
}) => {
  const [token, setToken] = useState(config.token);
  const [owner, setOwner] = useState(config.owner);
  const [repo, setRepo] = useState(config.repo);
  const [branch, setBranch] = useState(config.branch);
  const [enabled, setEnabled] = useState(config.enabled);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Cloudflare R2 State
  const [r2AccountId, setR2AccountId] = useState(r2Config?.accountId || '');
  const [r2AccessKeyId, setR2AccessKeyId] = useState(r2Config?.accessKeyId || '');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState(r2Config?.secretAccessKey || '');
  const [r2BucketName, setR2BucketName] = useState(r2Config?.bucketName || '');
  const [r2PublicDomain, setR2PublicDomain] = useState(r2Config?.publicDomain || '');
  const [r2Enabled, setR2Enabled] = useState(r2Config?.enabled || false);

  // Supabase Storage State
  const [supabaseProjectRef, setSupabaseProjectRef] = useState(supabaseConfig?.projectRef || '');
  const [supabaseAccessKeyId, setSupabaseAccessKeyId] = useState(supabaseConfig?.accessKeyId || '');
  const [supabaseSecretAccessKey, setSupabaseSecretAccessKey] = useState(supabaseConfig?.secretAccessKey || '');
  const [supabaseBucketName, setSupabaseBucketName] = useState(supabaseConfig?.bucketName || '');
  const [supabaseEnabled, setSupabaseEnabled] = useState(supabaseConfig?.enabled || false);

  const localFiles = files.filter((f) => f.isLocal);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
      enabled: enabled && !!token,
    });
    onClose();
  };

  const handleR2Save = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveR2Config({
      accountId: r2AccountId.trim(),
      accessKeyId: r2AccessKeyId.trim(),
      secretAccessKey: r2SecretAccessKey.trim(),
      bucketName: r2BucketName.trim(),
      publicDomain: r2PublicDomain.trim(),
      enabled: r2Enabled && !!r2AccountId,
    });
    onClose();
  };

  const handleSupabaseSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSupabaseConfig({
      projectRef: supabaseProjectRef.trim(),
      accessKeyId: supabaseAccessKeyId.trim(),
      secretAccessKey: supabaseSecretAccessKey.trim(),
      bucketName: supabaseBucketName.trim(),
      enabled: supabaseEnabled && !!supabaseProjectRef,
    });
    onClose();
  };

  const handleSync = async () => {
    setIsSyncingNow(true);
    setSyncStatus('Syncing lists with remote repository...');
    try {
      await onSyncNow();
      setSyncStatus('Sync complete! The library has been successfully updated with the repository files.');
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`Sync failed: ${err.message || 'Check your token and repo details.'}`);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Helper to trigger JSON file download
  const downloadJson = (data: any, filename: string) => {
    // Format JSON with 2-space indentation
    const cleanData = data.map((item: any) => {
      // Remove local client-only properties before exporting
      const { isLocal, blobPath, ...rest } = item;
      return rest;
    });
    
    const jsonStr = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 flex flex-col max-h-[90vh] transition-all duration-300 ${
          smartBoardMode ? 'p-8 max-w-3xl' : 'p-6'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="text-brand-500 w-6 h-6" />
            <h2 className={`font-extrabold text-slate-800 font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
              Library Settings & Git Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ${
              smartBoardMode ? 'p-3' : 'p-1.5'
            }`}
          >
            <X className={smartBoardMode ? 'w-6 h-6' : 'w-5 h-5'} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          
          {/* GitHub Sync Form */}
          <div>
            <h3 className={`font-bold text-slate-700 font-display mb-3 ${smartBoardMode ? 'text-xl' : 'text-sm'}`}>
              GitHub Repository Syncing (Multi-Device Access)
            </h3>
            
            <div className={`bg-brand-50 border border-brand-100 text-brand-800 rounded-xl flex gap-3 mb-4 leading-relaxed ${
              smartBoardMode ? 'p-5 text-lg' : 'p-3.5 text-xs'
            }`}>
              <Info className={`flex-shrink-0 text-brand-500 ${smartBoardMode ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />
              <div>
                <p className="font-semibold">How this works:</p>
                <p className="mt-1">
                  Input a GitHub Personal Access Token (PAT). Any folder creations, renames, deletes, or file uploads will commit directly to your GitHub repo.
                  Your site (on Vercel/GitHub Pages) will auto-redeploy so changes appear on all devices!
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Repository Owner (Username)
                </label>
                <input
                  type="text"
                  placeholder="e.g. teaching-materials"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Repository Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. computer-subject-library"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="enable-git-sync"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="enable-git-sync" className={`font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  Enable active GitHub Sync (Auto-commits modifications)
                </label>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  className={`font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center gap-2 transition-all ${
                    smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                  }`}
                >
                  <Save className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                  Save Configurations
                </button>

                {config.token && config.owner && config.repo && (
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={isSyncingNow}
                    className={`font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2 transition-all ${
                      smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                    }`}
                  >
                    <RefreshCw className={`${smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${isSyncingNow ? 'animate-spin' : ''}`} />
                    <span>{isSyncingNow ? 'Syncing...' : 'Sync Data Now'}</span>
                  </button>
                )}
              </div>
            </form>

            {syncStatus && (
              <p className={`mt-2 font-medium ${syncStatus.includes('failed') ? 'text-rose-600' : 'text-emerald-600'} ${
                smartBoardMode ? 'text-md' : 'text-xs'
              }`}>
                {syncStatus}
              </p>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Cloudflare R2 Sync Form */}
          <div>
            <div className="flex items-center gap-2 text-slate-800 mb-2">
              <HardDrive className="text-indigo-500 w-5 h-5" />
              <h3 className={`font-bold text-slate-700 font-display ${smartBoardMode ? 'text-xl' : 'text-sm'}`}>
                Cloudflare R2 Object Storage (Video & Large Document Hosting)
              </h3>
            </div>
            
            <div className={`bg-indigo-50/50 border border-indigo-100 text-indigo-900 rounded-xl flex gap-3 mb-4 leading-relaxed ${
              smartBoardMode ? 'p-5 text-lg' : 'p-3.5 text-xs'
            }`}>
              <Info className={`flex-shrink-0 text-indigo-500 ${smartBoardMode ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />
              <div>
                <p className="font-semibold">Store PDF, PPT, and Video files for free:</p>
                <p className="mt-1">
                  Commiting massive video files directly to GitHub will fail (GitHub limit is 100MB per file).
                  Configure Cloudflare R2 storage to upload files directly from your browser. R2 offers a 10GB free tier and zero download/egress bandwidth charges!
                </p>
              </div>
            </div>

            <form onSubmit={handleR2Save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 842xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  R2 Access Key ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. f01e0xxxxxxxxxxxxxxx"
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  R2 Secret Access Key
                </label>
                <input
                  type="password"
                  placeholder="e.g. 5d7e8xxxxxxxxxxxxxxxxxxxxxx"
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  R2 Bucket Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. classroom-assets"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  R2 Public URL / Domain URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://pub-xxxxxxxxxx.r2.dev"
                  value={r2PublicDomain}
                  onChange={(e) => setR2PublicDomain(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="enable-r2-sync"
                  checked={r2Enabled}
                  onChange={(e) => setR2Enabled(e.target.checked)}
                  className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="enable-r2-sync" className={`font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  Enable Cloudflare R2 Storage (Direct browser upload for new files)
                </label>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  className={`font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-all ${
                    smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                  }`}
                >
                  <Save className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                  Save Cloudflare settings
                </button>
              </div>
            </form>
          </div>

          <hr className="border-slate-100" />

          {/* Supabase Storage Sync Form */}
          <div>
            <div className="flex items-center gap-2 text-slate-800 mb-2">
              <HardDrive className="text-emerald-600 w-5 h-5" />
              <h3 className={`font-bold text-slate-700 font-display ${smartBoardMode ? 'text-xl' : 'text-sm'}`}>
                Supabase Storage (Free Video & Large Document Hosting - No Card Required)
              </h3>
            </div>
            
            <div className={`bg-emerald-50/50 border border-emerald-100 text-emerald-900 rounded-xl flex gap-3 mb-4 leading-relaxed ${
              smartBoardMode ? 'p-5 text-lg' : 'p-3.5 text-xs'
            }`}>
              <Info className={`flex-shrink-0 text-emerald-500 ${smartBoardMode ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />
              <div>
                <p className="font-semibold">Setup instructions (100% Free & No Credit Card):</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Create a free account on <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-emerald-700">supabase.com</a> and create a project.</li>
                  <li>Go to <strong>Project Settings &rarr; Storage</strong> and generate <strong>S3 Access Keys</strong>.</li>
                  <li>Go to <strong>Storage</strong> in the sidebar, create a new bucket, and make sure to make it <strong>Public</strong>.</li>
                </ol>
              </div>
            </div>

            <form onSubmit={handleSupabaseSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Supabase Project Reference ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. abcdefghijklmnopqrst"
                  value={supabaseProjectRef}
                  onChange={(e) => setSupabaseProjectRef(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Supabase Bucket Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. classroom-assets"
                  value={supabaseBucketName}
                  onChange={(e) => setSupabaseBucketName(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  S3 Access Key ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. access-key-id"
                  value={supabaseAccessKeyId}
                  onChange={(e) => setSupabaseAccessKeyId(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  S3 Secret Access Key
                </label>
                <input
                  type="password"
                  placeholder="e.g. secret-access-key"
                  value={supabaseSecretAccessKey}
                  onChange={(e) => setSupabaseSecretAccessKey(e.target.value)}
                  className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                    smartBoardMode ? 'p-3.5 text-lg' : 'p-2 text-xs'
                  }`}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="enable-supabase-sync"
                  checked={supabaseEnabled}
                  onChange={(e) => setSupabaseEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="enable-supabase-sync" className={`font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  Enable Supabase Storage (Direct browser upload for new files)
                </label>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  className={`font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 transition-all ${
                    smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                  }`}
                >
                  <Save className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                  Save Supabase Settings
                </button>
              </div>
            </form>
          </div>

          <hr className="border-slate-100" />

          {/* Database Export Panel */}
          <div>
            <h3 className={`font-bold text-slate-700 font-display mb-2 ${smartBoardMode ? 'text-xl' : 'text-sm'}`}>
              Manual Developer Export (Zero Setup alternative)
            </h3>
            <p className={`text-slate-500 mb-3 leading-relaxed ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
              Don't want to use Git Sync? You can download the compiled database files here and paste them manually into the `/data` folder of your project repository, then push them to Git.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadJson(folders, 'folders.json')}
                className={`font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-all ${
                  smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Export folders.json
              </button>

              <button
                onClick={() => downloadJson(files, 'files.json')}
                className={`font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-all ${
                  smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Export files.json
              </button>
            </div>
          </div>

          {/* Local Uploads Download Area */}
          {localFiles.length > 0 && (
            <>
              <hr className="border-slate-100" />
              <div>
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <HardDrive className="w-4 h-4 text-brand-500" />
                  <h3 className={`font-bold font-display ${smartBoardMode ? 'text-xl' : 'text-sm'}`}>
                    Local Browser Uploads ({localFiles.length})
                  </h3>
                </div>
                <p className={`text-slate-500 mb-3 leading-relaxed ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
                  To migrate your locally uploaded browser documents permanently to the repository, download each file here and place them inside `/public/files/` (for PDFs) or `/public/ppts/` (for PPTs/PPTXs) in your repository.
                </p>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-150 max-h-48 overflow-y-auto">
                  {localFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className={`font-semibold text-slate-700 truncate ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
                          {file.title}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Folder: {file.folder} • Type: {file.type.toUpperCase()}
                        </p>
                      </div>
                      <button
                        onClick={() => onDownloadFile(file)}
                        className={`font-bold border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 rounded-lg flex items-center gap-1 transition-all ${
                          smartBoardMode ? 'py-3.5 px-5 text-md' : 'py-1 px-3 text-[10px]'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
