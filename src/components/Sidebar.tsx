import React from 'react';
import { Folder as FolderIcon, Library, Settings, LayoutGrid, MonitorPlay } from 'lucide-react';
import type { Folder } from '../types';

interface SidebarProps {
  folders: Folder[];
  currentFolder: string | null;
  setCurrentFolder: (folder: string | null) => void;
  smartBoardMode: boolean;
  setSmartBoardMode: (mode: boolean) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  currentFolder,
  setCurrentFolder,
  smartBoardMode,
  setSmartBoardMode,
  onOpenSettings,
}) => {
  return (
    <aside
      className={`glass border-r border-slate-200 flex flex-col h-full transition-all duration-300 ${
        smartBoardMode ? 'w-80' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center gap-3 border-b border-slate-200/80 font-display ${
          smartBoardMode ? 'p-6' : 'p-4'
        }`}
      >
        <div className={`bg-brand-500 text-white rounded-xl flex items-center justify-center ${
          smartBoardMode ? 'w-12 h-12' : 'w-9 h-9'
        }`}>
          <Library className={smartBoardMode ? 'w-6 h-6' : 'w-5 h-5'} />
        </div>
        <div>
          <h1 className={`font-bold tracking-tight text-slate-800 leading-none ${
            smartBoardMode ? 'text-xl' : 'text-md'
          }`}>
            EduDrive
          </h1>
          <span className={`text-slate-500 font-medium ${
            smartBoardMode ? 'text-sm' : 'text-xs'
          }`}>
            Digital Library
          </span>
        </div>
      </div>

      {/* Navigation Options */}
      <div className={`flex-1 overflow-y-auto ${smartBoardMode ? 'p-5 space-y-5' : 'p-3 space-y-3'}`}>
        <div>
          <span className={`block font-semibold text-slate-400 uppercase tracking-wider mb-2 ${
            smartBoardMode ? 'text-xs px-3' : 'text-[10px] px-2'
          }`}>
            Navigation
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setCurrentFolder(null)}
              className={`w-full flex items-center gap-3 font-medium transition-all-custom ${
                currentFolder === null
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${smartBoardMode ? 'p-4 text-lg rounded-xl' : 'p-2 text-sm rounded-lg'}`}
            >
              <LayoutGrid className={smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'} />
              All Subjects / Folders
            </button>
          </div>
        </div>

        {/* Folders List */}
        <div>
          <span className={`block font-semibold text-slate-400 uppercase tracking-wider mb-2 ${
            smartBoardMode ? 'text-xs px-3' : 'text-[10px] px-2'
          }`}>
            Folders
          </span>
          <div className={`space-y-1 overflow-y-auto max-h-[350px] ${smartBoardMode ? 'pr-1' : ''}`}>
            {folders.length === 0 ? (
              <p className={`text-slate-400 italic px-3 ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
                No folders created yet
              </p>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => setCurrentFolder(folder.name)}
                  className={`w-full flex items-center gap-3 font-medium text-left transition-all-custom truncate ${
                    currentFolder === folder.name
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${smartBoardMode ? 'p-4 text-lg rounded-xl' : 'p-2 text-sm rounded-lg'}`}
                >
                  <FolderIcon className={smartBoardMode ? 'w-6 h-6 text-brand-400' : 'w-4 h-4 text-brand-400'} />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className={`border-t border-slate-200/80 p-4 space-y-2 bg-slate-50/50 ${smartBoardMode ? 'p-6 space-y-4' : 'p-4 space-y-2'}`}>
        {/* Smart Board Switcher */}
        <button
          onClick={() => setSmartBoardMode(!smartBoardMode)}
          className={`w-full flex items-center justify-between font-bold border transition-all-custom ${
            smartBoardMode
              ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          } ${smartBoardMode ? 'p-5 text-lg rounded-xl' : 'p-2.5 text-xs rounded-lg'}`}
        >
          <div className="flex items-center gap-2">
            <MonitorPlay className={smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'} />
            <span>Smart Board Mode</span>
          </div>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${smartBoardMode ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all-custom ${
            smartBoardMode ? 'p-4 text-lg rounded-xl' : 'p-2 text-xs rounded-lg'
          }`}
        >
          <Settings className={smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'} />
          <span>Library Settings / Git Sync</span>
        </button>

        {/* Small version info */}
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-mono">v1.1.0 • 100% Free & Open</p>
        </div>
      </div>
    </aside>
  );
};
