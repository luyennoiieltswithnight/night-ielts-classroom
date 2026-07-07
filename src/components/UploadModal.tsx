import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, Check, X, AlertCircle } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { extractVocabulary } from "../services/geminiService";
import { ExtractionResult, VocabularyItem } from "../types";
import { cn } from "../lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: ExtractionResult) => void;
}

export function UploadModal({ isOpen, onClose, onConfirm }: UploadModalProps) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'preview'>('upload');
  const [pastedText, setPastedText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setError(null);
    }
  };

  const handleExtract = async () => {
    setStep('extracting');
    setError(null);
    try {
      let result: ExtractionResult;
      if (selectedFiles.length > 0) {
        const base64Promises = selectedFiles.map(file => {
          return new Promise<{ data: string, mimeType: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ 
              data: (reader.result as string).split(',')[1], 
              mimeType: file.type 
            });
            reader.readAsDataURL(file);
          });
        });
        const imagesData = await Promise.all(base64Promises);
        result = await extractVocabulary(imagesData);
      } else if (pastedText.trim()) {
        result = await extractVocabulary(pastedText);
      } else {
        throw new Error("Please provide text or a file.");
      }
      setExtractionResult(result);
      setStep('preview');
    } catch (err) {
      console.error(err);
      setError("Failed to extract vocabulary. Please try again.");
      setStep('upload');
    }
  };

  const handleConfirm = () => {
    if (extractionResult) {
      onConfirm(extractionResult);
      onClose();
      // Reset state
      setStep('upload');
      setPastedText("");
      setSelectedFiles([]);
      setExtractionResult(null);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const newFiles: File[] = [];
    
    // 1. Handle files (e.g. copied from file explorer)
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
          newFiles.push(file);
        }
      }
    }
    
    // 2. Handle items (e.g. screenshots, images copied from browser)
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          // Avoid duplicates (same name and size)
          const isDuplicate = newFiles.some(f => f.name === file.name && f.size === file.size);
          if (!isDuplicate) {
            newFiles.push(file);
          }
        }
      }
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={step === 'preview' ? "Confirm Vocabulary" : "Upload Learning Material"}
      className="max-w-2xl"
    >
      <div className="space-y-6" onPaste={onPaste}>
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={cn(
                  "p-6 border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors",
                  selectedFiles.length > 0 ? "border-indigo-600 bg-indigo-50/30" : "border-gray-200"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={handleFileChange}
                  multiple
                />
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Upload File"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Image, PDF, DOCX</p>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 w-full max-h-[200px] overflow-y-auto p-1">
                    {selectedFiles.map((file, idx) => (
                      <FilePreviewItem 
                        key={`${file.name}-${file.size}-${idx}`} 
                        file={file} 
                        onRemove={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} 
                      />
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Or paste text directly</label>
                <textarea
                  className="flex-1 w-full rounded-lg border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px]"
                  placeholder="Paste your English material here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  disabled={selectedFiles.length > 0}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <Button 
              className="w-full" 
              disabled={selectedFiles.length === 0 && !pastedText.trim()}
              onClick={handleExtract}
            >
              Extract Vocabulary
            </Button>
          </div>
        )}

        {step === 'extracting' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Extracting Vocabulary...</h3>
              <p className="text-sm text-gray-500 mt-1">Our AI is scanning your material for bolded words and meanings.</p>
            </div>
          </div>
        )}

        {step === 'preview' && extractionResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Found <span className="font-bold text-gray-900">{extractionResult.vocabulary.length}</span> items
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Suggested Topic:</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                  {extractionResult.suggestedTopic}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {extractionResult.vocabulary.map((item, i) => (
                <Card key={i} className="p-4 flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-gray-900">{item.english}</h4>
                    <p className="text-sm text-gray-500">{item.vietnamese}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => {
                      setExtractionResult({
                        ...extractionResult,
                        vocabulary: extractionResult.vocabulary.filter((_, index) => index !== i)
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button className="flex-1 gap-2" onClick={handleConfirm}>
                <Check className="w-5 h-5" /> Save to Library
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FilePreviewItem({ file, onRemove }: { file: File, onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const newUrl = URL.createObjectURL(file);
      setUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    }
  }, [file]);

  return (
    <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-100">
      {file.type.startsWith('image/') && url ? (
        <img 
          src={url} 
          alt={file.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
