/** Accept only Excel workbook filenames (.xlsx / .xls). */
export function isExcelFilename(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

/** True for .xlsx (ZIP) or .xls (OLE) bytes — rejects HTML saved with an .xlsx name. */
export function isExcelBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 8) {
    return false;
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return true;
  }
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}
