/** Accept only Excel workbook filenames (.xlsx / .xls). */
export function isExcelFilename(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
