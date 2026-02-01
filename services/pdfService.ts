
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// Using esm.sh CDN version matching the main library import in index.html
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

/**
 * Converts a File object to a Base64 string.
 * Used for storing the visual PDF representation.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove Data URI prefix to get pure Base64 if needed, 
      // but usually for PDF display we want the prefix or can handle it.
      // Here we return the full Data URL (e.g. data:application/pdf;base64,...)
      resolve(reader.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Extracts raw text content from a PDF file using PDF.js.
 * This text is used to feed the AI context.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through all pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
    }
    
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to parse PDF content.");
  }
};

/**
 * Combined function to process a PDF upload:
 * 1. Converts to Base64 for storage/display.
 * 2. Extracts text for AI.
 */
export const processPdfUpload = async (file: File): Promise<{ base64: string; text: string }> => {
    const [base64, text] = await Promise.all([
        fileToBase64(file),
        extractTextFromPdf(file)
    ]);
    return { base64, text };
};
