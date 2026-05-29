
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  pdfData: string; // Base64 Data URL
  isDarkMode: boolean;
}

// Helper to convert Base64 Data URI to Uint8Array for PDF.js
const convertDataURIToBinary = (dataURI: string): Uint8Array => {
  const BASE64_MARKER = ';base64,';
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  // If marker not found, assume raw base64 if it doesn't start with data:
  const base64 = base64Index > BASE64_MARKER.length - 1 ? dataURI.substring(base64Index) : dataURI;
  
  const raw = atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for(let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
};

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfData, isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    // Configure worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Convert to binary to avoid URL length limits or protocol issues
        const binaryData = convertDataURIToBinary(pdfData);
        
        const loadingTask = pdfjsLib.getDocument({ data: binaryData });
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setPageNum(1);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError("No se pudo renderizar el documento. El archivo puede estar corrupto o protegido.");
        setLoading(false);
      }
    };

    if (pdfData) {
      loadPdf();
    }
    
    return () => {
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }
    };
  }, [pdfData]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
            await renderTaskRef.current.cancel();
        } catch(e) {}
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        
        // Calculate scale to fit width if needed, or use user scale
        // const desiredWidth = containerRef.current ? containerRef.current.clientWidth - 40 : 800;
        // const viewportRaw = page.getViewport({ scale: 1 });
        // const scaleToFit = desiredWidth / viewportRaw.width;
        // const finalScale = Math.max(scale, scaleToFit); 
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
            console.error("Page render error:", err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const changePage = (offset: number) => {
    if (!pdfDoc) return;
    setPageNum(prev => Math.min(Math.max(1, prev + offset), pdfDoc.numPages));
  };

  const changeZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3.0));
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
              <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
              <p className="text-xs uppercase tracking-widest font-bold">Procesando PDF...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-red-400 p-8 text-center">
              <AlertCircle size={32} className="mb-4" />
              <p className="text-sm font-bold">{error}</p>
          </div>
      );
  }

  return (
    <div className={`flex flex-col h-full w-full ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      
      {/* Toolbar */}
      <div className={`flex items-center justify-between p-2 border-b shrink-0 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} sticky top-0 z-10 shadow-sm`}>
          <div className="flex items-center gap-2">
              <button onClick={() => changeZoom(-0.1)} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} title="Zoom Out"><ZoomOut size={18} /></button>
              <span className="text-[10px] font-mono font-bold w-10 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => changeZoom(0.1)} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} title="Zoom In"><ZoomIn size={18} /></button>
          </div>

          <div className="flex items-center gap-2">
              <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className={`p-1.5 rounded-lg disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}><ChevronLeft size={18} /></button>
              <span className="text-[10px] font-bold uppercase tracking-widest min-w-[80px] text-center">Page {pageNum} / {pdfDoc?.numPages || '-'}</span>
              <button onClick={() => changePage(1)} disabled={!pdfDoc || pageNum >= pdfDoc.numPages} className={`p-1.5 rounded-lg disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}><ChevronRight size={18} /></button>
          </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center p-4 bg-slate-200/50 dark:bg-black/20">
          <div className="shadow-2xl relative">
             <canvas ref={canvasRef} className="block bg-white rounded-sm" />
          </div>
      </div>
    </div>
  );
};

export default PdfViewer;
