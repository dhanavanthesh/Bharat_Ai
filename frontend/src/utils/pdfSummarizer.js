import { API_BASE_URL } from '../config/api';

const apiRequest = async (url, options, retries = 1) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying request... ${retries} attempts left`);
      return apiRequest(url, options, retries - 1);
    }
    throw error;
  }
};

export const summarizePdf = async (file) => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await apiRequest(`${API_BASE_URL}/api/summarize-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (response.success) {
      return {
        success: true,
        summary: response.summary,
      };
    } else {
      throw new Error(response.message || 'Failed to summarize PDF');
    }
  } catch (error) {
    console.error('PDF summarization error:', error);
    return {
      success: false,
      message: error.message || 'Failed to summarize PDF',
    };
  }
}; 