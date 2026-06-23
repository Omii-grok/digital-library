import React from 'react';
import { Search, FolderPlus, Upload, Home, ChevronRight, Cloud, CloudOff } from 'lucide-react';
import type { GithubConfig } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentFolder: string | null;
  setCurrentFolder: (folder: string | null) => void;
  smartBoardMode: boolean;
  onOpenCreateFolder: () => void;
  onOpenUpload: () => void;
  githubConfig: GithubConfig | null;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  currentFolder,
  setCurrentFolder,
  smartBoardMode,
  onOpenCreateFolder,
  onOpenUpload,
  githubConfig,
  isSyncing,
}) => {
  const isGitEnabled = githubConfig && githubConfig.enabled && githubConfig.token;

  return (
    <header className={`glass border-b border-slate-200/80 w-full flex items-center justify-between transition-all duration-300 ${
      smartBoardMode ? 'p-6' : 'p-4'
    }`}>
      {/* Breadcrumbs / Subject path */}
      <div className="flex items-center gap-2 select-none overflow-x-auto max-w-[40%] scrollbar-none py-1">
        <button
          onClick={() => setCurrentFolder(null)}
          className={`flex items-center text-slate-500 hover:text-brand-600 transition-colors font-medium ${
            smartBoardMode ? 'text-lg gap-2' : 'text-sm gap-1'
          }`}
        >
          <Home className={smartBoardMode ? 'w-5 h-5' : 'w-4 h-4'} />
          <span>Root</span>
        </button>

        {currentFolder && (
          <>
            <ChevronRight className={`text-slate-300 flex-shrink-0 ${smartBoardMode ? 'w-5 h-5' : 'w-4 h-4'}`} />
            <span className={`font-semibold text-slate-800 truncate ${
              smartBoardMode ? 'text-xl' : 'text-sm'
            }`}>
              {currentFolder}
            </span>
          </>
        )}
      </div>

      {/* Search Input */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`text-slate-400 ${smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
          </div>
          <input
            type="text"
            placeholder="Search documents or presentations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-full transition-all duration-200 outline-none ${
              smartBoardMode ? 'py-3.5 text-lg pl-12' : 'py-1.5 text-xs'
            }`}
          />
        </div>
      </div>

      {/* Actions & Git Sync State */}
      <div className={`flex items-center gap-3 ${smartBoardMode ? 'gap-4' : 'gap-2'}`}>
        {/* GitHub status badge */}
        <div
          title={isGitEnabled ? `Synced with Git (${githubConfig.owner}/${githubConfig.repo})` : 'Local preview mode (Changes saved to this device)'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
            isGitEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          } ${smartBoardMode ? 'text-sm py-2 px-4' : 'text-[11px]'}`}
        >
          {isGitEnabled ? (
            <>
              <Cloud className={`${smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${isSyncing ? 'animate-bounce' : ''}`} />
              <span className="font-semibold">{isSyncing ? 'Syncing...' : 'Cloud Active'}</span>
            </>
          ) : (
            <>
              <CloudOff className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
              <span className="font-semibold">Local Storage</span>
            </>
          )}
        </div>

        {/* Create Folder Button */}
        <button
          onClick={onOpenCreateFolder}
          className={`flex items-center justify-center gap-2 font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm ${
            smartBoardMode ? 'py-4 px-6 text-lg rounded-xl' : 'py-1.5 px-3 text-xs rounded-lg'
          }`}
        >
          <FolderPlus className={smartBoardMode ? 'w-6 h-6 text-slate-500' : 'w-4 h-4 text-slate-500'} />
          <span>New Folder</span>
        </button>

        {/* Upload File Button */}
        <button
          onClick={onOpenUpload}
          className={`flex items-center justify-center gap-2 font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 transition-all shadow-md shadow-brand-500/10 ${
            smartBoardMode ? 'py-4 px-6 text-lg rounded-xl' : 'py-1.5 px-3 text-xs rounded-lg'
          }`}
        >
          <Upload className={smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'} />
          <span>Upload File</span>
        </button>
      </div>
    </header>
  );
};
