import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileUpload, FaSpinner, FaArrowUp, FaStop, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/constants';

const PdfSummarizer = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [pdfContentId, setPdfContentId] = useState('');
  const [fileName, setFileName] = useState('');
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState('');
  const abortController = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024; // 10 MB limit
      if (selectedFile.size > maxSize) {
        toast.error(`File size exceeds 10MB limit. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setSummary('');
      setPdfContentId('');
      setChats([]);
      setError('');
    } else if (selectedFile) {
      toast.error('Please select a valid PDF file');
    }
  };

  const summarizePdf = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Please select a valid PDF file');
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      toast.info('Uploading and processing PDF...', { 
        autoClose: false,
        toastId: 'pdf-upload'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/summarize-pdf`, {
        method: 'POST',
        body: formData,
      });

      toast.dismiss('pdf-upload');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to process PDF (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      throw error;
    }
  };

  const askPdfQuestion = async (pdfContentId, question) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask-pdf-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfContentId, question }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking PDF question:', error);
      throw error;
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      toast.error('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await summarizePdf(file);
      
      if (result.success) {
        setSummary(result.summary);
        setPdfContentId(result.pdfContentId || '');
        toast.success('PDF summarized successfully!');
        setChats([]);
      } else {
        throw new Error(result.message || 'Failed to summarize PDF');
      }
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      setError(error.message || 'Failed to summarize PDF. Please try another file.');
      toast.error(error.message || 'Failed to summarize PDF. Please try again.');
      setSummary('');
      setPdfContentId('');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isResponding || !pdfContentId) return;

    setIsResponding(true);
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    const updatedChats = [...chats, userMessage];
    setChats(updatedChats);
    setInput('');

    const placeholder = { role: 'bot', content: '...', timestamp: new Date().toISOString() };
    setChats([...updatedChats, placeholder]);

    try {
      abortController.current = new AbortController();
      const response = await askPdfQuestion(pdfContentId, input);

      if (response.success && response.answer) {
        let i = 0;
        const responseLength = response.answer.length;
        const chunkSize = Math.max(1, Math.floor(responseLength / 20));

        const interval = setInterval(() => {
          if (i <= responseLength) {
            const streamingContent = response.answer.slice(0, i);
            setChats((prevChats) =>
              prevChats.map((msg, idx) =>
                idx === prevChats.length - 1 ? { ...msg, content: streamingContent } : msg
              )
            );
            i += chunkSize;
          } else {
            clearInterval(interval);
            const finalChats = [...updatedChats, {
              role: 'bot',
              content: response.answer,
              timestamp: new Date().toISOString(),
            }];
            setChats(finalChats);
            setIsResponding(false);
            abortController.current = null;
          }
        }, 50);
      } else {
        toast.error(response.message || 'Failed to get response');
        setChats([
          ...updatedChats, 
          {
            role: 'bot',
            content: 'Sorry, I was unable to answer your question. Please try again.',
            timestamp: new Date().toISOString()
          }
        ]);
        setIsResponding(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setChats([
        ...updatedChats, 
        {
          role: 'bot',
          content: 'Sorry, I encountered an error. Please try asking a different question.',
          timestamp: new Date().toISOString()
        }
      ]);
      setIsResponding(false);
    }
  };

  const handleRetry = () => {
    setError('');
    fileInputRef.current?.click();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

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

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 dark:bg-red-900/30 dark:border-red-800">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-red-500 text-xl mr-2" />
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Processing PDF</h2>
            </div>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Try Another File
            </button>
          </div>
        ) : (
          <>
            {/* File Upload Section */}
            <div className="mb-8">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                  ref={fileInputRef}
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
          </>
        )}

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

        {/* Chat Section */}
        {summary && (
          <div className="mt-8 flex flex-col max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ask questions about the PDF
            </h2>
            <div className="flex-1 overflow-y-auto max-h-96 mb-4">
              {chats.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No questions asked yet. Type a question below to get started.</p>
              ) : (
                <div className="space-y-4">
                  {chats.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`${
                        msg.role === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 ml-auto'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 mr-auto'
                      } p-3 rounded-lg max-w-[80%] w-fit`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your question here..."
                rows={2}
                className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 resize-none"
                disabled={isResponding}
              />
              <button
                onClick={isResponding ? () => abortController.current?.abort() : handleSend}
                disabled={!input.trim() || !pdfContentId}
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isResponding ? <FaStop /> : <FaArrowUp />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfSummarizer;
