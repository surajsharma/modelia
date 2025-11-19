import { useRef, useState, useEffect } from "react";

type UploadProps = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
};

export default function Upload({ value, onChange }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleClear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 px-3 py-1 bg-red-600 dark:bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm"
          >
            Clear
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 transition-colors">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              PNG, JPG, WEBP (MAX. 10MB)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
}