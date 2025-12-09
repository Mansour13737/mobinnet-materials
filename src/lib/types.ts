
export interface ExcelFile {
    id: string;
    fileName: string;
    uploadDate: any; // Firestore Timestamp
    headers: string[];
}

export interface ExcelRow {
    id: string;
    excelFileId: string;
    columnA: string;
    columnB: string;
    columnC: string;
    columnD: string;
    columnE: string;
}
