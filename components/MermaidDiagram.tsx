
import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  isDarkMode: boolean;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isDarkMode }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const elementId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Clean the chart string
    const cleanChart = chart
        .replace(/```mermaid/g, '')
        .replace(/```/g, '')
        .trim();

    if (!cleanChart) return;

    // Configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 20
      }
    });

    const render = async () => {
      try {
        setError(false);
        // Render returns { svg }
        const result = await mermaid.render(elementId.current, cleanChart);
        setSvg(result.svg);
      } catch (e) {
        console.error('Mermaid rendering failed:', e);
        // If it fails, sometimes it leaves residue, so we rely on error state to show raw code or message
        setError(true);
      }
    };

    // Small delay to ensure DOM might be ready or theme applied
    const timer = setTimeout(render, 100);
    return () => clearTimeout(timer);

  }, [chart, isDarkMode]);

  if (error) {
      return (
          <div className="p-4 text-xs font-mono text-red-500 bg-red-50 rounded-lg border border-red-100 overflow-x-auto">
              <p className="font-bold mb-2">Graphic Generation Failed</p>
              <div className="whitespace-pre opacity-75">{chart}</div>
          </div>
      );
  }

  return (
    <div 
        className="mermaid-container flex justify-center items-center p-6 bg-white/80 dark:bg-slate-900/80 rounded-xl overflow-x-auto min-h-[120px] transition-colors duration-300"
        dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default MermaidDiagram;
