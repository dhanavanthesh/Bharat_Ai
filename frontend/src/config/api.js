export const API_BASE_URL = "http://localhost:5001";

export const chatApi = {
  sendPdfChatMessage: async (pdfContentId, question) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask-pdf-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfContentId,
          question,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get answer from PDF content");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in sendPdfChatMessage:", error);
      throw error;
    }
  },

  // You can add other API functions here as needed
};
