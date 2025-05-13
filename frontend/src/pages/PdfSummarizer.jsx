import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileUpload, FaSpinner, FaArrowUp, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { summarizePdf } from '../utils/pdfSummarizer';
import { chatApi } from '../config/api';

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
  const abortController = useRef(null);
  const chatEndRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setSummary('');
      setPdfContentId('');
      setChats([]);
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
        setPdfContentId(result.pdfContentId || '');
        toast.success('PDF summarized successfully!');
        setChats([]);
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

  const handleSend = async () => {
    if (!input.trim() || isResponding) return;

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

      // Send user question and pdfContentId to backend
      const response = await chatApi.sendPdfChatMessage(pdfContentId, input, abortController.current.signal);

      if (response.answer) {
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
        toast.error('Failed to get response');
        setChats(updatedChats);
        setIsResponding(false);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.info('Response stopped');
        setChats(updatedChats);
      } else {
        console.error('Error:', err);
        toast.error('Failed to fetch response!');
        setChats(updatedChats);
      }
      setIsResponding(false);
      abortController.current = null;
    }
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
            PDF Summarizer & Chatbot
          </h1>
        </div>

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

        {/* Chat Section */}
        {summary && (
          <div className="mt-8 flex flex-col max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ask questions about the PDF
            </h2>
            <div className="flex-1 overflow-y-auto max-h-96 mb-4">
              {chats.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No questions asked yet.</p>
              ) : (
                chats.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-3 p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-100 text-blue-900 self-end'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 self-start'
                    } max-w-[80%]`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
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
                disabled={!input.trim()}
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
