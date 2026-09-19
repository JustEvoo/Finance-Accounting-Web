import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneratedReport, ReportDocumentConfig } from '../types/reportTypes';

/**
 * Format timestamp nicely
 */
function getCurrentFormattedDate(): string {
  const d = new Date();
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Draw professional header on a page
 */
function drawPageHeader(
  doc: jsPDF, 
  report: GeneratedReport, 
  config: ReportDocumentConfig, 
  pageWidth: number,
  currency: string
) {
  const marginX = 14;
  let cursorY = 12;

  // 1. Company Logo Emblem / Monogram
  if (config.showLogo) {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(marginX, cursorY, 10, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('VE', marginX + 2.5, cursorY + 7);
  }

  const textStartX = config.showLogo ? marginX + 13 : marginX;

  // 2. Company Name
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(config.companyName || 'VAST ERP ACCOUNTING', textStartX, cursorY + 4);

  // 3. Subtitle / Type
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(config.reportSubtitle || 'Official General Ledger & Financial Accounting Report', textStartX, cursorY + 8.5);

  // 4. Currency badge on the right
  const rightX = pageWidth - 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Currency: ${currency}`, rightX, cursorY + 4, { align: 'right' });

  // Date Generated
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${getCurrentFormattedDate()}`, rightX, cursorY + 8.5, { align: 'right' });

  // Divider line
  cursorY += 13;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, rightX, cursorY);

  // 5. Specific Report Title & Period Banner
  cursorY += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(report.title, marginX, cursorY);

  if (report.subtitle) {
    cursorY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(report.subtitle, marginX, cursorY);
  }

  cursorY += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(report.periodText, marginX, cursorY);

  return cursorY + 4;
}

/**
 * Draw professional footer on all pages
 */
function drawPageFooters(doc: jsPDF, config: ReportDocumentConfig) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const rightX = pageWidth - 14;
  const footerY = pageHeight - 8;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 3, rightX, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    // Left: Confidentiality or system notice
    if (config.showConfidentialityNotice) {
      doc.text(config.confidentialityText || 'CONFIDENTIAL - For Internal Accounting & Regulatory Use Only', marginX, footerY);
    } else {
      doc.text('Vast ERP — Integrated Double-Entry Accounting System', marginX, footerY);
    }

    // Right: Page number "Page X of Y"
    if (config.showPageNumbers) {
      doc.text(`Page ${i} of ${totalPages}`, rightX, footerY, { align: 'right' });
    }
  }
}

/**
 * Add a single report to a jsPDF instance
 */
function renderReportToDoc(
  doc: jsPDF, 
  report: GeneratedReport, 
  config: ReportDocumentConfig, 
  currency: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = drawPageHeader(doc, report, config, pageWidth, currency);

  // Prepare table headers
  const headers = report.columns.map(c => c.header);

  // Prepare table body rows
  const body = report.rows.map(row => {
    return report.columns.map(col => {
      let cellText = row[col.dataKey] ?? '';
      // Apply indentation for hierarchical items in first column
      if (col.dataKey === report.columns[0].dataKey && row.indent) {
        const spaces = '   '.repeat(row.indent);
        cellText = spaces + cellText;
      }
      return cellText;
    });
  });

  // Calculate column widths proportionately
  const printableWidth = pageWidth - 28; // 14mm margin on both sides
  const columnStyles: Record<number, any> = {};
  report.columns.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || 'left',
      cellWidth: col.width ? (col.width / 100) * printableWidth : 'auto'
    };
  });

  autoTable(doc, {
    startY: startY + 2,
    head: [headers],
    body: body,
    theme: 'plain',
    showHead: 'everyPage', // Repeat table headers on every new page!
    margin: { top: 38, bottom: 15, left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
      textColor: [30, 41, 59],
      lineWidth: 0.1,
      lineColor: [241, 245, 249]
    },
    headStyles: {
      fillColor: [248, 250, 252], // slate-50
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineWidth: 0.3,
      lineColor: [203, 213, 225]
    },
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      const rawRow = report.rows[rowIndex];
      if (!rawRow) return;

      if (rawRow.isHeader) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.textColor = [15, 23, 42];
      } else if (rawRow.isSubtotal) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.textColor = [15, 23, 42];
        data.cell.styles.lineWidth = { top: 0.4, bottom: 0.4, left: 0, right: 0 };
        data.cell.styles.lineColor = [148, 163, 184];
      } else if (rawRow.isGrandTotal) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
        data.cell.styles.lineWidth = { top: 0.6, bottom: 0.8, left: 0, right: 0 };
        data.cell.styles.lineColor = [15, 23, 42];
      }
    }
  });

  // Render Summary metrics cards if available at the bottom of the table
  let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : startY + 50;
  
  if (report.summaryItems && report.summaryItems.length > 0) {
    if (finalY + 25 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      finalY = 20;
    }

    finalY += 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY, printableWidth, 12, 1, 1, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, finalY, printableWidth, 12, 1, 1, 'S');

    const itemWidth = printableWidth / report.summaryItems.length;
    report.summaryItems.forEach((item, idx) => {
      const itemX = 14 + (idx * itemWidth) + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label.toUpperCase(), itemX, finalY + 4.5);

      doc.setFont('helvetica', item.isBold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.value, itemX, finalY + 9.5);
    });

    finalY += 14;
  }

  // Render Notes if any
  if (report.notes && report.notes.length > 0) {
    if (finalY + 15 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    report.notes.forEach((note, nIdx) => {
      doc.text(`* Note: ${note}`, 14, finalY + 4 + (nIdx * 3.5));
    });
  }
}

/**
 * Export multiple reports into ONE unified PDF with page breaks between reports
 */
export async function exportCombinedReportsPDF(
  reports: GeneratedReport[],
  config: ReportDocumentConfig,
  currency: string
): Promise<Blob> {
  if (reports.length === 0) {
    throw new Error('No reports selected for generation.');
  }

  const primaryOrientation = config.orientation === 'auto' 
    ? (reports[0]?.orientation || 'portrait')
    : config.orientation;

  const doc = new jsPDF({
    orientation: primaryOrientation,
    unit: 'mm',
    format: 'a4'
  });

  reports.forEach((report, index) => {
    if (index > 0) {
      // Start each report on a new page
      const orientation = config.orientation === 'auto' ? report.orientation : config.orientation;
      doc.addPage('a4', orientation);
    }
    renderReportToDoc(doc, report, config, currency);
  });

  drawPageFooters(doc, config);

  return doc.output('blob');
}

/**
 * Export a single report into its own dedicated PDF
 */
export async function exportSingleReportPDF(
  report: GeneratedReport,
  config: ReportDocumentConfig,
  currency: string
): Promise<Blob> {
  const orientation = config.orientation === 'auto' ? report.orientation : config.orientation;
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  renderReportToDoc(doc, report, config, currency);
  drawPageFooters(doc, config);

  return doc.output('blob');
}

/**
 * Trigger file download helper
 */
export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
