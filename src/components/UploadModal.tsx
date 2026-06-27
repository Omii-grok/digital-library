import React, { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Folder } from '../types';

interface UploadModalProps {
  folders: Folder[];
  currentFolder: string | null;
  onClose: () => void;
  onUpload: (title: string, folder: string, type: 'pdf' | 'ppt' | 'video', file: File) => void;
  smartBoardMode: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  folders,
  currentFolder,
  onClose,
  onUpload,
  smartBoardMode,
}) => {
  const [title, setTitle] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(currentFolder || (folders[0]?.name || ''));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title with filename without extension
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (extension === 'ppt' || extension === 'pptx') {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (extension === 'mp4' || extension === 'webm' || extension === 'ogg') {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      setError('Unsupported file type. Please upload a PDF, PPT/PPTX, or Video file (MP4, WebM, OGG).');
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a document title.');
      return;
    }
    if (!selectedFolder) {
      setError('Please select or create a subject folder first.');
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    let fileType: 'pdf' | 'ppt' | 'video' = 'pdf';
    if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (ext === 'ppt' || ext === 'pptx') {
      fileType = 'ppt';
    } else if (ext === 'mp4' || ext === 'webm' || ext === 'ogg') {
      fileType = 'video';
    }
    onUpload(title.trim(), selectedFolder, fileType, selectedFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden transition-all duration-300 ${
          smartBoardMode ? 'p-8 max-w-xl' : 'p-6'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h2 className={`font-extrabold text-slate-800 font-display ${smartBoardMode ? 'text-2xl' : 'text-md'}`}>
            Upload Teaching Material
          </h2>
          <button
            onClick={onClose}
            className={`text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ${
              smartBoardMode ? 'p-3' : 'p-1.5'
            }`}
          >
            <X className={smartBoardMode ? 'w-6 h-6' : 'w-5 h-5'} />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start gap-2 ${
              smartBoardMode ? 'p-5 text-lg' : 'p-3 text-xs'
            }`}>
              <AlertTriangle className={`flex-shrink-0 ${smartBoardMode ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
              dragActive ? 'border-brand-500 bg-brand-50/20' : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'
            } ${smartBoardMode ? 'p-10' : 'p-6'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,.mp4,.webm,.ogg"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className={`text-emerald-500 ${smartBoardMode ? 'w-14 h-14' : 'w-10 h-10'}`} />
                <p className={`font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-sm'}`}>
                  File Selected!
                </p>
                <p className={`text-slate-500 font-mono select-all ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className={`text-slate-400 ${smartBoardMode ? 'w-14 h-14' : 'w-10 h-10'}`} />
                <p className={`font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-sm'}`}>
                  Drag and drop file here, or click to browse
                </p>
                <p className={`text-slate-400 ${smartBoardMode ? 'text-md' : 'text-xs'}`}>
                  Supports PDF, PPT, and Videos up to 500MB
                </p>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className={`block font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
              Document Title
            </label>
            <input
              type="text"
              placeholder="e.g. Introduction to Binary Numbers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none transition-all ${
                smartBoardMode ? 'p-4 text-lg' : 'p-2 text-sm'
              }`}
            />
          </div>

          {/* Folder Selector */}
          <div className="space-y-1.5">
            <label className={`block font-bold text-slate-700 ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
              Select Subject / Folder
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className={`w-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-lg outline-none bg-white transition-all ${
                smartBoardMode ? 'p-4 text-lg' : 'p-2 text-sm'
              }`}
            >
              <option value="" disabled>-- Choose a Subject Folder --</option>
              {folders.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Form Actions */}
          <div className={`flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2`}>
            <button
              type="button"
              onClick={onClose}
              className={`font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-all ${
                smartBoardMode ? 'py-4 px-6 text-lg' : 'py-2 px-4 text-xs'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg transition-all shadow-md shadow-brand-500/10 ${
                smartBoardMode ? 'py-4 px-8 text-lg' : 'py-2 px-5 text-xs'
              }`}
            >
              Upload Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
