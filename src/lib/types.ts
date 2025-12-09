
export interface ExcelFile {
    id: string;
    fileName: string;
    uploadDate: any; // Firestore Timestamp
    headers: string[];
}

export interface ExcelRow {
    id: string;
    excelFileId: string;
    rowIndex: number;
    columnA: string;
    columnB: string;
    columnC: string;
    columnD: string;
    columnE: string;
}
