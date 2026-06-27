import React, { useState } from 'react';
import { Folder as FolderIcon, FileText, Download, Trash2, Edit3, LayoutGrid, List, FileClock, Presentation, Video } from 'lucide-react';
import type { Folder, FileItem } from '../types';

interface FileGridProps {
  folders: Folder[];
  files: FileItem[];
  currentFolder: string | null;
  setCurrentFolder: (folder: string | null) => void;
  searchQuery: string;
  smartBoardMode: boolean;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (folderName: string) => void;
  onDeleteFile: (file: FileItem) => void;
  onOpenFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  folders,
  files,
  currentFolder,
  setCurrentFolder,
  searchQuery,
  smartBoardMode,
  onRenameFolder,
  onDeleteFolder,
  onDeleteFile,
  onOpenFile,
  onDownloadFile,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [folderNewName, setFolderNewName] = useState('');

  // Handle filtering
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.folder.toLowerCase().includes(searchQuery.toLowerCase());

    if (searchQuery) return matchesSearch;
    return currentFolder ? file.folder === currentFolder : true;
  });

  const displayFolders = searchQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentFolder
    ? [] // don't show folders if inside a subfolder
    : folders;

  // Recent Uploads (Pick the last 5 files created/uploaded)
  const recentFiles = [...files]
    .filter(f => f.isLocal || f.createdAt)
    .reverse()
    .slice(0, 5);

  const handleStartRename = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(name);
    setFolderNewName(name);
  };

  const handleSaveRename = (oldName: string, e: React.FormEvent) => {
    e.preventDefault();
    if (folderNewName.trim() && folderNewName !== oldName) {
      onRenameFolder(oldName, folderNewName.trim());
    }
    setEditingFolder(null);
  };

  return (
    <div className={`flex-1 overflow-y-auto ${smartBoardMode ? 'p-8 space-y-8' : 'p-6 space-y-6'}`}>
      
      {/* Search Header Banner */}
      {searchQuery && (
        <div className={`bg-brand-50 border border-brand-100 rounded-2xl flex items-center gap-3 text-brand-800 ${
          smartBoardMode ? 'p-6 text-xl' : 'p-4 text-sm'
        }`}>
          <FileText className="text-brand-500" />
          <span>Showing results matching <strong>"{searchQuery}"</strong> across all directories.</span>
        </div>
      )}

      {/* Recent Uploads Section (Only shown on root and when no search query) */}
      {!currentFolder && !searchQuery && recentFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <FileClock className={`text-indigo-500 ${smartBoardMode ? 'w-6 h-6' : 'w-5 h-5'}`} />
            <h2 className={`font-bold font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
              Recent Uploads
            </h2>
          </div>
          <div className={`grid gap-4 ${
            smartBoardMode 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {recentFiles.map((file, idx) => (
              <div
                key={`recent-${idx}`}
                onClick={() => onOpenFile(file)}
                className={`glass border border-slate-200/60 rounded-xl hover:border-brand-300 hover:shadow-lg transition-all-custom cursor-pointer flex flex-col justify-between ${
                  smartBoardMode ? 'p-5 gap-4' : 'p-3 gap-2.5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg flex items-center justify-center font-bold text-white ${
                    file.type === 'pdf' ? 'bg-rose-500' : file.type === 'ppt' ? 'bg-amber-500' : 'bg-indigo-500'
                  } ${smartBoardMode ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-[10px]'}`}>
                    {file.type === 'pdf' ? 'PDF' : file.type === 'ppt' ? 'PPT' : 'VID'}
                  </div>
                  <span className={`px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium truncate max-w-[120px] ${
                    smartBoardMode ? 'text-xs' : 'text-[10px]'
                  }`}>
                    {file.folder}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold text-slate-800 line-clamp-1 truncate ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                    {file.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Recently Added</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Folders Section */}
      {displayFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold text-slate-700 font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
              Subjects / Folders
            </h2>
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all-custom ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all-custom ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className={`grid gap-4 ${
              smartBoardMode 
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {displayFolders.map((folder) => (
                <div
                  key={folder.name}
                  onClick={() => setCurrentFolder(folder.name)}
                  className={`group relative bg-white border border-slate-200 hover:border-brand-400 rounded-xl hover:shadow-md transition-all-custom cursor-pointer flex items-center justify-between ${
                    smartBoardMode ? 'p-6' : 'p-4'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center ${
                      smartBoardMode ? 'w-14 h-14' : 'w-10 h-10'
                    }`}>
                      <FolderIcon className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
                    </div>
                    {editingFolder === folder.name ? (
                      <form
                        onSubmit={(e) => handleSaveRename(folder.name, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={folderNewName}
                          onChange={(e) => setFolderNewName(e.target.value)}
                          className={`border border-brand-500 rounded px-2 outline-none focus:ring-2 focus:ring-brand-200 ${
                            smartBoardMode ? 'py-2 text-md' : 'py-0.5 text-xs'
                          }`}
                          autoFocus
                          onBlur={(e) => handleSaveRename(folder.name, e as any)}
                        />
                      </form>
                    ) : (
                      <span className={`font-semibold text-slate-700 truncate ${smartBoardMode ? 'text-lg' : 'text-sm'}`}>
                        {folder.name}
                      </span>
                    )}
                  </div>

                  {/* Folder Actions */}
                  {editingFolder !== folder.name && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                      <button
                        onClick={(e) => handleStartRename(folder.name, e)}
                        className={`text-slate-400 hover:text-brand-600 transition-colors rounded hover:bg-slate-100 ${
                          smartBoardMode ? 'p-3' : 'p-1'
                        }`}
                        title="Rename"
                      >
                        <Edit3 className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${folder.name}"? This will delete all files inside it.`)) {
                            onDeleteFolder(folder.name);
                          }
                        }}
                        className={`text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-slate-100 ${
                          smartBoardMode ? 'p-3' : 'p-1'
                        }`}
                        title="Delete"
                      >
                        <Trash2 className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // List View for Folders
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {displayFolders.map((folder) => (
                <div
                  key={folder.name}
                  onClick={() => setCurrentFolder(folder.name)}
                  className={`group flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    smartBoardMode ? 'p-5' : 'p-3'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderIcon className={`text-brand-400 flex-shrink-0 ${smartBoardMode ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />
                    {editingFolder === folder.name ? (
                      <form
                        onSubmit={(e) => handleSaveRename(folder.name, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center"
                      >
                        <input
                          type="text"
                          value={folderNewName}
                          onChange={(e) => setFolderNewName(e.target.value)}
                          className={`border border-brand-500 rounded px-2 outline-none focus:ring-2 focus:ring-brand-200 ${
                            smartBoardMode ? 'py-1.5 text-md' : 'py-0.5 text-xs'
                          }`}
                          autoFocus
                          onBlur={(e) => handleSaveRename(folder.name, e as any)}
                        />
                      </form>
                    ) : (
                      <span className={`font-medium text-slate-700 truncate ${smartBoardMode ? 'text-lg' : 'text-sm'}`}>
                        {folder.name}
                      </span>
                    )}
                  </div>
                  {editingFolder !== folder.name && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleStartRename(folder.name, e)}
                        className={`text-slate-400 hover:text-brand-600 rounded hover:bg-slate-100 ${smartBoardMode ? 'p-3.5' : 'p-1'}`}
                      >
                        <Edit3 className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${folder.name}"?`)) onDeleteFolder(folder.name);
                        }}
                        className={`text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 ${smartBoardMode ? 'p-3.5' : 'p-1'}`}
                      >
                        <Trash2 className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`font-bold text-slate-700 font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
            Files {currentFolder && `in ${currentFolder}`}
          </h2>
          <span className={`text-slate-400 ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {filteredFiles.length === 0 ? (
          <div className={`bg-white border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 ${
            smartBoardMode ? 'py-16 px-6' : 'py-10 px-4'
          }`}>
            <FileText className={`mx-auto text-slate-300 mb-3 ${smartBoardMode ? 'w-14 h-14' : 'w-10 h-10'}`} />
            <p className={`font-semibold ${smartBoardMode ? 'text-lg' : 'text-sm'}`}>No teaching files here yet</p>
            <p className={`mt-1 ${smartBoardMode ? 'text-md' : 'text-xs'}`}>Click "Upload File" in the header to add your PDF or PowerPoint documents.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            smartBoardMode 
              ? 'grid-cols-1 md:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {filteredFiles.map((file, idx) => (
              <div
                key={`file-${idx}`}
                className={`group relative bg-white border border-slate-200 hover:border-brand-400 hover:shadow-lg rounded-xl transition-all-custom flex flex-col justify-between ${
                  smartBoardMode ? 'p-6 gap-6' : 'p-4 gap-4'
                }`}
              >
                {/* File Header Block */}
                <div className="flex items-start gap-3">
                  {/* File Type Icon badge */}
                  <div className={`rounded-xl text-white font-bold flex items-center justify-center flex-shrink-0 ${
                    file.type === 'pdf' ? 'bg-rose-500' : file.type === 'ppt' ? 'bg-amber-500' : 'bg-indigo-500'
                  } ${smartBoardMode ? 'w-14 h-14 text-md' : 'w-10 h-10 text-xs'}`}>
                    {file.type === 'pdf' ? (
                      <FileText className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
                    ) : file.type === 'ppt' ? (
                      <Presentation className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
                    ) : (
                      <Video className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
                    )}
                  </div>

                  <div className="overflow-hidden min-w-0">
                    <h3 className={`font-bold text-slate-800 line-clamp-2 truncate hover:text-clip ${
                      smartBoardMode ? 'text-lg leading-tight' : 'text-sm leading-snug'
                    }`} title={file.title}>
                      {file.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 truncate max-w-[150px] ${
                        smartBoardMode ? 'text-xs' : 'text-[10px]'
                      }`}>
                        {file.folder}
                      </span>
                      {file.isLocal && (
                        <span className={`font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 ${
                          smartBoardMode ? 'text-xs' : 'text-[9px]'
                        }`}>
                          Local
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Controls */}
                <div className={`grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 ${smartBoardMode ? 'gap-3 pt-4' : ''}`}>
                  <button
                    onClick={() => onOpenFile(file)}
                    className={`font-bold text-center border rounded-lg transition-all-custom ${
                      file.type === 'pdf' 
                        ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-500 hover:text-white' 
                        : file.type === 'ppt'
                        ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-500 hover:text-white'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-500 hover:text-white'
                    } ${smartBoardMode ? 'py-3.5 text-md' : 'py-1.5 text-xs'}`}
                  >
                    Open View
                  </button>

                  <button
                    onClick={() => onDownloadFile(file)}
                    className={`font-bold text-center border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1 transition-all-custom ${
                      smartBoardMode ? 'py-3.5 text-md' : 'py-1.5 text-xs'
                    }`}
                  >
                    <Download className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                    <span>Get</span>
                  </button>
                </div>

                {/* Absolute delete button */}
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${file.title}"?`)) {
                      onDeleteFile(file);
                    }
                  }}
                  className={`absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                    smartBoardMode ? 'opacity-100 p-3 top-3 right-3' : ''
                  }`}
                  title="Delete File"
                >
                  <Trash2 className={smartBoardMode ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
