import React, { useRef, useState } from 'react';
import { FaPaperclip, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const FileUpload = ({ onUpload, disabled }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      const validFiles = selectedFiles.filter(file => {
        const validTypes = [
          'image/jpeg', 
          'image/png', 
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!validTypes.includes(file.type)) {
          toast.error(`Unsupported file type: ${file.type}`);
          return false;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error('File size exceeds 5MB limit');
          return false;
        }
        
        return true;
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;
    
    setIsUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      toast.success('Files uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload files');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          disabled={disabled}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Attach files"
        >
          <FaPaperclip />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          disabled={disabled}
        />
        
        {files.length > 0 && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={disabled || isUploading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isUploading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              `Upload (${files.length})`
            )}
          </button>
        )}
      </div>
      
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm"
            >
              <span className="truncate max-w-xs">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
