/**
 * Converts data array to CSV string and triggers browser file download.
 * @param filename File name for the download (e.g. 'sales_report.csv')
 * @param headers Array of header labels (e.g. ['Voucher No', 'Party', 'Amount'])
 * @param rows Array of row data arrays (e.g. [['INV-001', 'Alpha Traders', 5000]])
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
    if (!rows || rows.length === 0) {
        alert('No data available to export');
        return;
    }

    const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const headerLine = headers.map(escapeCSV).join(',');
    const rowLines = rows.map(r => r.map(escapeCSV).join(','));

    const csvContent = [headerLine, ...rowLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generates structured export for report datasets.
 */
export function exportReportData(reportName: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = reportName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${safeName}_${timestamp}.csv`;
    downloadCSV(filename, headers, rows);
}
