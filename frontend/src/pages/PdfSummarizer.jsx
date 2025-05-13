import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileUpload, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { summarizePdf } from '../utils/pdfSummarizer';

const PdfSummarizer = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      toast.error('Please select a PDF file first');
      return;
    }

    setLoading(true);
    try {
      const result = await summarizePdf(file);
      if (result.success) {
        setSummary(result.summary);
        toast.success('PDF summarized successfully!');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      toast.error(error.message || 'Failed to summarize PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <FaArrowLeft className="mr-2" />
            Back to Chat
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-4">
            PDF Summarizer
          </h1>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* File Upload Section */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FaFileUpload className="text-4xl text-blue-500 mb-4" />
                <span className="text-lg text-gray-700 dark:text-gray-300">
                  {fileName || 'Click to upload PDF'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Maximum file size: 10MB
                </span>
              </label>
            </div>
          </div>

          {/* Summarize Button */}
          <button
            onClick={handleSummarize}
            disabled={!file || loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center ${
              !file || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Summarizing...
              </>
            ) : (
              'Summarize PDF'
            )}
          </button>

          {/* Summary Section */}
          {summary && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Summary
              </h2>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfSummarizer; 