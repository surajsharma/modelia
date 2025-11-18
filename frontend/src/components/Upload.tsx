// Upload.tsx
import React, { useRef } from "react";

interface UploadProps {
  onChange: (dataUrl: string | null) => void;
}

export default function Upload({ onChange }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      onChange(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
          <button
            onClick={() => { setPreview(null); onChange(null); }}
            className="absolute top-2 right-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md"
          >
            Remove
          </button>
        </div>
      ) : (
        <div 
          onClick={() => inputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-center">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Browse Files
            </button>
            <p className="text-sm text-gray-500 mt-2">or drag and drop an image here</p>
          </div>
        </div>
      )}
    </div>
  );
}