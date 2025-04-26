// src/utils/exportPdf.js
import { jsPDF } from 'jspdf';

export const exportChatToPDF = (chatMessages, title) => {
  try {
    // Create PDF document with UTF-8 support
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const textWidth = pageWidth - (2 * margin);
    
    // Set title and metadata
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 139); // Dark blue for title
    doc.text(title || 'Chat Export', margin, margin);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128); // Gray for timestamp
    const timestamp = new Date().toLocaleString();
    doc.text(`Exported on: ${timestamp}`, margin, margin + 7);
    
    // Reset text color for messages
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    let yPosition = margin + 20;
    
    // Add each message
    chatMessages.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AI';
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      const header = `${role} ${timestamp ? `(${timestamp})` : ''}:`;
      
      // Add role/timestamp header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(header, margin, yPosition);
      yPosition += 7;
      
      // Add message content
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      // Split content into lines and ensure proper encoding
      const contentLines = doc.splitTextToSize(msg.content, textWidth);
      
      // Check if we need a new page
      if (yPosition + (contentLines.length * 6) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Add message content
      doc.text(contentLines, margin, yPosition);
      yPosition += (contentLines.length * 6) + 10;
    });
    
    // Generate a safe filename
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `chat_export_${date}_${time}.pdf`;
    
    // Save the PDF with a simple filename
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return false;
  }
};