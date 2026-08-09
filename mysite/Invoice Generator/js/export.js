/**
 * Export & Sharing Module
 * Handles PDF generation, Print formatting, PNG snapshots, Web Share API, and JSON Data Backups.
 */

const Exporter = {
  /**
   * Browser Print to PDF via window.print()
   */
  printInvoice(invoiceNumber = 'Invoice') {
    const originalTitle = document.title;
    document.title = invoiceNumber;
    
    // Trigger print
    window.print();

    // Restore title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  },

  /**
   * Direct PDF Download using html2pdf.js
   */
  async downloadPDF(invoiceNumber = 'Invoice') {
    const element = document.getElementById('invoice-preview-sheet');
    if (!element) {
      UI.showToast('Invoice preview element not found', 'danger');
      return;
    }

    UI.showToast('Generating PDF document...', 'info', 2000);

    // If html2pdf library is available on window
    if (typeof html2pdf !== 'undefined') {
      try {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `${invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        UI.showToast('PDF downloaded successfully!', 'success');
      } catch (err) {
        console.error('html2pdf generation error, falling back to window.print()', err);
        UI.showToast('Direct download failed, opening print dialog...', 'warning');
        setTimeout(() => window.print(), 500);
      }
    } else {
      // Fallback to window.print()
      UI.showToast('Opening print dialog for PDF export...', 'info');
      setTimeout(() => window.print(), 300);
    }
  },

  /**
   * Export Invoice as PNG Image using html2canvas
   */
  async downloadPNG(invoiceNumber = 'Invoice') {
    const element = document.getElementById('invoice-preview-sheet');
    if (!element) {
      UI.showToast('Invoice preview element not found', 'danger');
      return;
    }

    UI.showToast('Generating high-res PNG image...', 'info', 2000);

    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imageUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${invoiceNumber}.png`;
        link.href = imageUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        UI.showToast('PNG image downloaded!', 'success');
      } catch (err) {
        console.error('PNG export error', err);
        UI.showToast('Failed to generate PNG snapshot', 'danger');
      }
    } else {
      UI.showToast('PNG export engine is loading, please try again in a moment', 'warning');
    }
  },

  /**
   * Share Invoice via Native Web Share API or Email/WhatsApp prefill
   */
  async shareInvoice(invoice, totals) {
    const shareText = `Invoice ${invoice.invoiceNumber} for ${invoice.client.name || 'Client'}\nTotal Amount: ${InvoiceModel.formatCurrency(totals.grandTotal, invoice.currency, invoice.currencySymbol)}\nDue Date: ${invoice.dueDate || 'Upon Receipt'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: shareText
        });
        UI.showToast('Shared successfully!', 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Web share aborted or unsupported, opening share modal');
        }
      }
    }

    // Open Custom Share Modal
    UI.openShareModal(invoice, totals, shareText);
  },

  /**
   * Export all database data to a downloadable JSON file
   */
  exportBackupFile() {
    try {
      const dataStr = Storage.exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = InvoiceModel.formatDateToISO();
      
      link.download = `Invoice_Generator_Backup_${dateStr}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      UI.showToast('Backup JSON exported successfully!', 'success');
    } catch (e) {
      console.error('Error exporting backup', e);
      UI.showToast('Failed to export backup data', 'danger');
    }
  },

  /**
   * Import database data from a user-uploaded JSON file
   */
  importBackupFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = Storage.importAllData(e.target.result);
        if (success) {
          UI.showToast('Data restored successfully! Refreshing view...', 'success');
          setTimeout(() => window.location.reload(), 800);
        } else {
          UI.showToast('Invalid backup file format.', 'danger');
        }
      } catch (err) {
        console.error('Failed reading backup file', err);
        UI.showToast('Error reading backup file', 'danger');
      }
    };
    reader.readAsText(file);
  }
};

window.Exporter = Exporter;
