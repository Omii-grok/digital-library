import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ArrowLeft, ArrowRight, Monitor } from 'lucide-react';
import type { FileItem } from '../types';

interface FileViewerProps {
  file: FileItem;
  onClose: () => void;
  onDownload: () => void;
  smartBoardMode: boolean;
}

interface Slide {
  title: string;
  bullets: string[];
}

export const FileViewer: React.FC<FileViewerProps> = ({
  file,
  onClose,
  onDownload,
  smartBoardMode,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [useOfficeViewer, setUseOfficeViewer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  // Generate slide slides based on file name
  const mockSlides: Slide[] = [
    {
      title: file.title,
      bullets: [
        "Welcome to today's computer science classroom lesson.",
        "Topic overview and structural key-points.",
        "Interactive lesson designed for classroom screen sharing.",
        "Click the arrows at the bottom or use arrow keys to navigate."
      ]
    },
    {
      title: "Subject Objectives",
      bullets: [
        `Understand the fundamentals of ${file.title}.`,
        "Identify core components, systems, and structures.",
        "Differentiate between key technologies and methodologies.",
        "Apply knowledge in laboratory practical assignments."
      ]
    },
    {
      title: "Key Classroom Discussion Points",
      bullets: [
        "What are the real-world applications of this computer technology?",
        "Discuss advantages and disadvantages in modern society.",
        "How has this topic evolved over the past decade?",
        "Interactive student Q&A: Teacher checks for comprehension."
      ]
    },
    {
      title: "Review & Assignments",
      bullets: [
        "Summarize the lesson's main takeaways.",
        "Complete the worksheet questions at the back of the chapter.",
        "Next class preview: Preparation tips and readings.",
        "Thank you for participating! Let's review questions together."
      ]
    }
  ];

  useEffect(() => {
    // Check if we can use MS Office Viewer (only works for online public URL presentations, not blobs/local files)
    const isPublicUrl = !file.isLocal && file.file.startsWith('/ppts/');
    const isOnline = navigator.onLine;
    
    // Default to Office Viewer for public files if online, otherwise local presenter
    setUseOfficeViewer(isPublicUrl && isOnline);
    setCurrentSlide(0);
  }, [file]);

  const handleNextSlide = () => {
    if (currentSlide < mockSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, useOfficeViewer]);

  // Build the Microsoft Office Viewer URL
  const publicFileUrl = window.location.origin + file.file;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicFileUrl)}`;

  return (
    <div className="fixed inset-0 bg-slate-950/98 z-50 flex flex-col animate-fade-in select-none">
      {/* Top Header Panel */}
      <div className={`bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between ${
        smartBoardMode ? 'p-6' : 'p-4'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-slate-700 font-bold ${
              smartBoardMode ? 'p-4 text-lg' : 'py-1.5 px-3 text-xs'
            }`}
          >
            <X className={smartBoardMode ? 'w-6 h-6' : 'w-4 h-4'} />
            <span>Close Viewer</span>
          </button>
          
          <div className="h-6 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs text-white font-bold ${
              file.type === 'pdf' ? 'bg-rose-600' : file.type === 'ppt' ? 'bg-amber-600' : 'bg-indigo-600'
            }`}>
              {file.type.toUpperCase()}
            </span>
            <h2 className={`font-bold font-display line-clamp-1 truncate max-w-md ${
              smartBoardMode ? 'text-xl' : 'text-sm'
            }`}>
              {file.title}
            </h2>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {file.type === 'ppt' && !file.isLocal && (
            <button
              onClick={() => setUseOfficeViewer(!useOfficeViewer)}
              className={`flex items-center gap-1.5 font-bold transition-all border rounded-lg ${
                useOfficeViewer 
                  ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              } ${smartBoardMode ? 'p-4 text-lg' : 'py-1.5 px-3 text-xs'}`}
              title={useOfficeViewer ? "Switch to Local Presenter" : "Switch to Microsoft Office Live Web View"}
            >
              <Monitor className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
              <span>{useOfficeViewer ? 'Use Presenter' : 'Use Office View'}</span>
            </button>
          )}

          <button
            onClick={onDownload}
            className={`flex items-center gap-1.5 bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors font-bold ${
              smartBoardMode ? 'p-4 text-lg' : 'py-1.5 px-3 text-xs'
            }`}
          >
            <Download className={smartBoardMode ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-900 relative flex items-center justify-center p-4">
        {file.type === 'pdf' ? (
          /* PDF viewer using iframe */
          <iframe
            src={`${file.file}#toolbar=1`}
            title={file.title}
            className="w-full h-full max-w-6xl bg-white rounded-xl shadow-2xl border-none"
          />
        ) : file.type === 'video' ? (
          /* HTML5 Video player with Smart Board touchscreen controls */
          <div className="w-full h-full max-w-5xl flex flex-col justify-between items-center gap-4">
            <div className="w-full flex-1 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                src={file.file}
                controls
                autoPlay
                className="w-full h-full max-h-[70vh] object-contain"
              />
            </div>
            
            {/* Quick playback control toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900 border border-slate-850 rounded-xl p-3 shadow-xl w-full max-w-3xl">
              <button
                onClick={() => handleSkip(-10)}
                className={`font-bold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-650 rounded-lg transition-colors border border-slate-700 ${
                  smartBoardMode ? 'py-3.5 px-6 text-lg' : 'py-2 px-4 text-xs'
                }`}
                title="Rewind 10 seconds"
              >
                ⏪ -10s
              </button>

              <button
                onClick={() => handleSkip(10)}
                className={`font-bold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-655 rounded-lg transition-colors border border-slate-700 ${
                  smartBoardMode ? 'py-3.5 px-6 text-lg' : 'py-2 px-4 text-xs'
                }`}
                title="Fast forward 10 seconds"
              >
                ⏩ +10s
              </button>

              <div className="h-6 w-[1px] bg-slate-850 mx-2" />

              <span className={`text-slate-400 font-bold ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                Speed:
              </span>

              {[1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`font-bold rounded-lg transition-all border ${
                    playbackSpeed === speed
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  } ${smartBoardMode ? 'py-3.5 px-5 text-lg' : 'py-2 px-3 text-xs'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        ) : useOfficeViewer ? (
          /* PPT presentation via Office Live Viewer iframe */
          <iframe
            src={officeViewerUrl}
            title={file.title}
            className="w-full h-full max-w-6xl bg-white rounded-xl shadow-2xl border-none"
          />
        ) : (
          /* Interactive Slides Presenter Mode (Offline/Local/Blob) */
          <div className="w-full h-full max-w-5xl flex flex-col justify-between">
            {/* Slide Board */}
            <div className={`flex-1 bg-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col justify-between border-4 border-slate-200 transition-all ${
              smartBoardMode ? 'border-brand-500' : ''
            }`}>
              
              {/* Slide Header */}
              <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-center">
                <span className={`font-mono text-slate-400 font-bold ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  SLIDE {currentSlide + 1} OF {mockSlides.length}
                </span>
                <span className={`text-slate-300 font-bold font-display ${smartBoardMode ? 'text-lg' : 'text-xs'}`}>
                  EduDrive Presenter
                </span>
              </div>

              {/* Slide Body */}
              <div className="my-auto py-8">
                <h3 className={`font-extrabold text-slate-800 font-display mb-8 text-center leading-tight tracking-tight ${
                  smartBoardMode ? 'text-5xl' : 'text-3xl md:text-4xl'
                }`}>
                  {mockSlides[currentSlide].title}
                </h3>
                
                <ul className={`mx-auto max-w-3xl space-y-6 ${
                  smartBoardMode ? 'text-2xl space-y-8' : 'text-base md:text-lg'
                }`}>
                  {mockSlides[currentSlide].bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-4 text-slate-700">
                      <span className={`w-3.5 h-3.5 rounded-full bg-brand-500 flex-shrink-0 mt-2.5 ${
                        smartBoardMode ? 'w-5 h-5 mt-3' : ''
                      }`} />
                      <span className="font-medium leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Slide Footer */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-slate-400 text-xs">
                <span>Classroom presentation tool</span>
                <span className="font-semibold text-brand-600">Computer Science Lab</span>
              </div>
            </div>

            {/* Controller Controls (Large buttons for Smart Board) */}
            <div className="flex items-center justify-between mt-6 px-2">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlide === 0}
                className={`flex items-center gap-2 font-bold text-white rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg ${
                  smartBoardMode ? 'p-6 text-xl px-8' : 'py-3 px-5 text-sm'
                }`}
              >
                <ArrowLeft className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
                <span>Previous Slide</span>
              </button>

              <div className={`font-bold font-mono text-white ${smartBoardMode ? 'text-2xl' : 'text-sm'}`}>
                {currentSlide + 1} / {mockSlides.length}
              </div>

              <button
                onClick={handleNextSlide}
                disabled={currentSlide === mockSlides.length - 1}
                className={`flex items-center gap-2 font-bold text-white rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg ${
                  smartBoardMode ? 'p-6 text-xl px-8' : 'py-3 px-5 text-sm'
                }`}
              >
                <span>Next Slide</span>
                <ArrowRight className={smartBoardMode ? 'w-7 h-7' : 'w-5 h-5'} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
