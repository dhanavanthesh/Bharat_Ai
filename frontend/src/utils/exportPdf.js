// src/utils/exportPdf.js
import { jsPDF } from 'jspdf';

export const exportChatToPDF = (chatMessages, title) => {
  const doc = new jsPDF();
  
  // Set title
  doc.setFontSize(18);
  doc.text(title || 'Chat Export', 20, 20);
  doc.setFontSize(12);
  
  let yPosition = 30;
  const maxWidth = 180;
  
  // Add each message
  chatMessages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'You' : 'AI';
    const text = `${role}: ${msg.content}`;
    
    // Split text into lines
    const textLines = doc.splitTextToSize(text, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (textLines.length * 10) > 280) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Add text to PDF
    doc.text(textLines, 15, yPosition);
    yPosition += (textLines.length * 10) + 5;
  });
  
  // Save the PDF
  doc.save(`${title || 'chat-export'}.pdf`);
};