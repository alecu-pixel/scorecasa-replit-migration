import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PdfExportButtonProps {
  targetId: string;
  filename?: string;
  address?: string;
}

const PDF_PRINT_STYLES = `
  .pdf-export-mode {
    background-color: #ffffff !important;
  }
  
  /* Remove glassmorphism effects */
  .pdf-export-mode .glass-card {
    background-color: #f8f9fa !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid #d1d5db !important;
  }
  
  /* Base text colors - convert to dark for readability */
  .pdf-export-mode .text-white {
    color: #0a0a0a !important;
  }
  .pdf-export-mode .text-gray-300,
  .pdf-export-mode .text-gray-400,
  .pdf-export-mode .text-gray-500 {
    color: #4b5563 !important;
  }
  
  /* Headings - dark for readability */
  .pdf-export-mode h1,
  .pdf-export-mode h2,
  .pdf-export-mode h3,
  .pdf-export-mode h4,
  .pdf-export-mode h5,
  .pdf-export-mode h6 {
    color: #0a0a0a !important;
  }
  
  /* Preserve semantic colors but use darker print-friendly versions */
  .pdf-export-mode .text-cyan-400 {
    color: #0891b2 !important;
  }
  .pdf-export-mode .text-green-400,
  .pdf-export-mode .text-emerald-400 {
    color: #059669 !important;
  }
  .pdf-export-mode .text-yellow-400,
  .pdf-export-mode .text-amber-400 {
    color: #d97706 !important;
  }
  .pdf-export-mode .text-red-400 {
    color: #dc2626 !important;
  }
  .pdf-export-mode .text-purple-400 {
    color: #7c3aed !important;
  }
  .pdf-export-mode .text-blue-400 {
    color: #2563eb !important;
  }
  .pdf-export-mode .text-orange-400 {
    color: #ea580c !important;
  }
  
  /* Remove glow effects for clean print */
  .pdf-export-mode .icon-glow,
  .pdf-export-mode .badge-glow {
    filter: none !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }
  
  /* Icons - preserve semantic colors on SVGs */
  .pdf-export-mode svg:not([class*="text-"]) {
    color: #374151 !important;
  }
  /* SVGs with semantic text colors - use print-friendly versions */
  .pdf-export-mode svg.text-cyan-400,
  .pdf-export-mode .text-cyan-400 svg {
    color: #0891b2 !important;
  }
  .pdf-export-mode svg.text-green-400,
  .pdf-export-mode svg.text-emerald-400,
  .pdf-export-mode .text-green-400 svg,
  .pdf-export-mode .text-emerald-400 svg {
    color: #059669 !important;
  }
  .pdf-export-mode svg.text-yellow-400,
  .pdf-export-mode svg.text-amber-400,
  .pdf-export-mode .text-yellow-400 svg,
  .pdf-export-mode .text-amber-400 svg {
    color: #d97706 !important;
  }
  .pdf-export-mode svg.text-red-400,
  .pdf-export-mode .text-red-400 svg {
    color: #dc2626 !important;
  }
  .pdf-export-mode svg.text-purple-400,
  .pdf-export-mode .text-purple-400 svg {
    color: #7c3aed !important;
  }
  .pdf-export-mode svg.text-blue-400,
  .pdf-export-mode .text-blue-400 svg {
    color: #2563eb !important;
  }
  .pdf-export-mode svg.text-orange-400,
  .pdf-export-mode .text-orange-400 svg {
    color: #ea580c !important;
  }
  .pdf-export-mode svg.text-white,
  .pdf-export-mode svg.text-gray-400,
  .pdf-export-mode svg.text-gray-500 {
    color: #374151 !important;
  }
  
  /* Borders - light gray for print */
  .pdf-export-mode [class*="border-gray"],
  .pdf-export-mode [class*="border-cyan"],
  .pdf-export-mode [class*="border-green"],
  .pdf-export-mode [class*="border-yellow"],
  .pdf-export-mode [class*="border-red"] {
    border-color: #d1d5db !important;
  }
  
  /* Background gradients - convert to solid light backgrounds */
  .pdf-export-mode .bg-gradient-to-r,
  .pdf-export-mode .bg-gradient-to-br,
  .pdf-export-mode [class*="from-"],
  .pdf-export-mode [class*="to-"] {
    background: #f3f4f6 !important;
  }
  
  /* Colored backgrounds - use lighter print-friendly versions */
  .pdf-export-mode [class*="bg-cyan"] {
    background-color: #e0f2fe !important;
  }
  .pdf-export-mode [class*="bg-green"],
  .pdf-export-mode [class*="bg-emerald"] {
    background-color: #d1fae5 !important;
  }
  .pdf-export-mode [class*="bg-yellow"],
  .pdf-export-mode [class*="bg-amber"] {
    background-color: #fef3c7 !important;
  }
  .pdf-export-mode [class*="bg-red"] {
    background-color: #fee2e2 !important;
  }
  .pdf-export-mode [class*="bg-purple"] {
    background-color: #ede9fe !important;
  }
  .pdf-export-mode [class*="bg-blue"] {
    background-color: #dbeafe !important;
  }
  .pdf-export-mode [class*="bg-orange"] {
    background-color: #ffedd5 !important;
  }
  
  /* Charts - ensure text is readable */
  .pdf-export-mode .recharts-text,
  .pdf-export-mode .recharts-cartesian-axis-tick-value {
    fill: #1a1a1a !important;
  }
  .pdf-export-mode .recharts-legend-item-text {
    color: #1a1a1a !important;
  }
  
  /* Cards and sections */
  .pdf-export-mode [class*="bg-gray-800"],
  .pdf-export-mode [class*="bg-gray-900"],
  .pdf-export-mode [class*="bg-black"] {
    background-color: #f9fafb !important;
  }
`;

export default function PdfExportButton({ targetId, filename, address }: PdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    let styleElement: HTMLStyleElement | null = null;
    let element: HTMLElement | null = null;
    
    try {
      element = document.getElementById(targetId);
      if (!element) {
        throw new Error('Report element not found');
      }

      styleElement = document.createElement('style');
      styleElement.textContent = PDF_PRINT_STYLES;
      document.head.appendChild(styleElement);
      
      element.classList.add('pdf-export-mode');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const html2pdf = (await import('html2pdf.js')).default;
      
      const sanitizedAddress = address?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'Property';
      const date = new Date().toISOString().split('T')[0];
      const pdfFilename = filename || `ScoreCasa_Report_${sanitizedAddress}_${date}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: pdfFilename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4', 
          orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF Downloaded",
        description: `Your property report has been saved as ${pdfFilename}`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (element) {
        element.classList.remove('pdf-export-mode');
      }
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="lg"
      className="gap-2"
      data-testid="button-export-pdf"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Export Report as PDF
        </>
      )}
    </Button>
  );
}
