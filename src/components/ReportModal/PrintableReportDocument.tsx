import React from 'react';
import { GeneratedReport, ReportDocumentConfig } from '../../types/reportTypes';

interface PrintableReportDocumentProps {
  reports: GeneratedReport[];
  config: ReportDocumentConfig;
  currency: string;
  isPrintPreview?: boolean;
}

export const PrintableReportDocument: React.FC<PrintableReportDocumentProps> = ({
  reports,
  config,
  currency,
  isPrintPreview = false
}) => {
  const currentDateFormatted = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="text-slate-900 bg-white font-sans text-xs print:text-black">
      {reports.map((report, reportIndex) => {
        const isLandscape = config.orientation === 'landscape' || (config.orientation === 'auto' && report.orientation === 'landscape');

        return (
          <div
            key={`${report.id}-${reportIndex}`}
            className={`report-page-container bg-white p-6 md:p-8 ${
              reportIndex > 0 ? 'print-page-break mt-8 pt-8 border-t border-slate-200 print:mt-0 print:pt-0 print:border-none' : ''
            } ${isPrintPreview ? 'max-w-4xl mx-auto shadow-sm border border-slate-200' : ''}`}
          >
            {/* 1. DOCUMENT HEADER */}
            <div className="border-b border-slate-300 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {config.showLogo && (
                    <div className="w-10 h-10 bg-slate-900 text-white rounded flex items-center justify-center font-mono font-bold text-sm tracking-tight shrink-0 print:bg-black print:text-white">
                      VE
                    </div>
                  )}
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-950 uppercase print:text-black">
                      {config.companyName || 'VAST ERP ACCOUNTING'}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {config.reportSubtitle || 'Official General Ledger & Financial Accounting Statement'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] text-slate-500 space-y-0.5">
                  <div className="font-bold text-slate-800 print:text-black">
                    CURRENCY: <span className="text-slate-950 font-extrabold">{currency}</span>
                  </div>
                  {config.showPrintedTimestamp && (
                    <div>GENERATED: {currentDateFormatted}</div>
                  )}
                </div>
              </div>

              {/* Specific Report Title & Period */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide print:text-black">
                    {report.title}
                  </h2>
                  {report.subtitle && (
                    <p className="text-[11px] text-slate-600 italic">
                      {report.subtitle}
                    </p>
                  )}
                </div>
                <div className="text-[11px] font-mono font-medium text-slate-600 print:text-black">
                  {report.periodText}
                </div>
              </div>
            </div>

            {/* 2. REPORT DATA TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-50 print:bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                    {report.columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className={`py-2 px-2.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                        style={{ width: col.width ? `${col.width}%` : 'auto' }}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {report.rows.map((row, rIdx) => {
                    // Check row formatting flags
                    if (row.isHeader) {
                      return (
                        <tr key={rIdx} className="bg-slate-100/70 print:bg-slate-50 font-bold text-slate-900">
                          {report.columns.map((col, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-1.5 px-2.5 text-[10px] tracking-wider uppercase ${
                                col.align === 'right' ? 'text-right' : 'text-left'
                              }`}
                              style={{
                                paddingLeft: row.indent && cIdx === 0 ? `${row.indent * 14 + 10}px` : undefined
                              }}
                            >
                              {row[col.dataKey] ?? ''}
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    if (row.isSubtotal) {
                      return (
                        <tr key={rIdx} className="border-t border-b border-slate-400 font-bold bg-white text-slate-900">
                          {report.columns.map((col, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-1.5 px-2.5 ${
                                col.align === 'right' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {row[col.dataKey] ?? ''}
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    if (row.isGrandTotal) {
                      return (
                        <tr key={rIdx} className="border-t-2 border-b-4 border-slate-950 font-extrabold bg-slate-50 print:bg-slate-100 text-slate-950 text-[11px]">
                          {report.columns.map((col, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-2 px-2.5 ${
                                col.align === 'right' ? 'text-right font-black' : 'text-left'
                              }`}
                            >
                              {row[col.dataKey] ?? ''}
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    // Empty spacer row
                    if (!row[report.columns[0].dataKey] && !row[report.columns[1]?.dataKey]) {
                      return (
                        <tr key={rIdx} className="h-2">
                          <td colSpan={report.columns.length}></td>
                        </tr>
                      );
                    }

                    // Normal row
                    return (
                      <tr key={rIdx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        {report.columns.map((col, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-1.5 px-2.5 ${
                              col.align === 'right'
                                ? 'text-right font-medium text-slate-900 print:text-black'
                                : col.align === 'center'
                                ? 'text-center text-slate-600 print:text-black'
                                : 'text-left text-slate-700 print:text-black'
                            }`}
                            style={{
                              paddingLeft: row.indent && cIdx === 0 ? `${row.indent * 14 + 10}px` : undefined
                            }}
                          >
                            {row[col.dataKey] ?? ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3. SUMMARY METRICS CARD (IF PRESENT) */}
            {report.summaryItems && report.summaryItems.length > 0 && (
              <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-[11px] avoid-break">
                {report.summaryItems.map((item, sIdx) => (
                  <div key={sIdx}>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      {item.label}
                    </span>
                    <span className={`text-xs ${item.isBold ? 'font-bold text-slate-950 print:text-black' : 'text-slate-800'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 4. NOTES & DISCLAIMERS */}
            {report.notes && report.notes.length > 0 && (
              <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-sans italic space-y-0.5 avoid-break">
                {report.notes.map((note, nIdx) => (
                  <p key={nIdx}>* Note: {note}</p>
                ))}
              </div>
            )}

            {/* 5. DOCUMENT FOOTER */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between font-mono text-[10px] text-slate-400 print:text-slate-600 avoid-break">
              <div>
                {config.showConfidentialityNotice ? (
                  <span>{config.confidentialityText || 'CONFIDENTIAL - For Internal Accounting & Regulatory Use Only'}</span>
                ) : (
                  <span>Vast ERP Accounting System — Verified Double-Entry Ledger</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Report {reportIndex + 1} of {reports.length}</span>
                {config.showPageNumbers && (
                  <span className="print:hidden">| Page 1</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
