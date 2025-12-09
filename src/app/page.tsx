"use client";

import { useState, useMemo, useEffect } from "react";
import { ExcelImporter } from "@/components/excel-importer";
import { DataTable } from "@/components/data-table";
import { FileSpreadsheet, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExcelFile, ExcelRow } from "@/lib/types";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const { firestore, user, isUserLoading } = useFirebase();

  const userFilesRef = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, `users/${user.uid}/excelFiles`), orderBy("uploadDate", "desc")) : null
  , [firestore, user]);

  const { data: excelFiles, isLoading: isLoadingFiles } = useCollection<ExcelFile>(userFilesRef);

  const selectedFileRowsRef = useMemoFirebase(() =>
    user && firestore && selectedFileId ? collection(firestore, `users/${user.uid}/excelFiles/${selectedFileId}/excelRows`) : null
  , [firestore, user, selectedFileId]);

  const { data: excelRows, isLoading: isLoadingRows } = useCollection<ExcelRow>(selectedFileRowsRef);

  useEffect(() => {
    if (!selectedFileId && excelFiles && excelFiles.length > 0) {
      setSelectedFileId(excelFiles[0].id);
    }
  }, [excelFiles, selectedFileId]);

  const tableData = useMemo(() => {
    return excelRows ? excelRows.map(row => [row.columnA, row.columnB, row.columnC, row.columnD, row.columnE]) : [];
  }, [excelRows]);

  const tableHeaders = useMemo(() => {
    if (excelFiles && selectedFileId) {
        const selectedFile = excelFiles.find(f => f.id === selectedFileId);
        return selectedFile?.headers || ['A', 'B', 'C', 'D', 'E'];
    }
    return ['A', 'B', 'C', 'D', 'E'];
  }, [excelFiles, selectedFileId]);

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  }

  const onNewFileImported = (fileId: string) => {
    setSelectedFileId(fileId);
  }

  const isLoading = isUserLoading || isLoadingFiles || isLoadingRows;

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-border gap-4">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
            ExcelView
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {excelFiles && excelFiles.length > 0 && (
                 <Select onValueChange={handleFileSelect} value={selectedFileId || ''}>
                 <SelectTrigger className="w-[280px]">
                   <SelectValue placeholder="Select an imported file" />
                 </SelectTrigger>
                 <SelectContent>
                    {excelFiles.map(file => (
                        <SelectItem key={file.id} value={file.id}>
                            {file.fileName}
                        </SelectItem>
                    ))}
                 </SelectContent>
               </Select>
            )}
            <ExcelImporter onNewFileImported={onNewFileImported} />
          </div>
        </header>
        <main className="w-full flex-grow flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-center p-12 h-full flex-grow">
              <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : excelRows && excelRows.length > 0 ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search in table..."
                  className="pl-10 w-full md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DataTable headers={tableHeaders} data={tableData} searchTerm={searchTerm} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-card rounded-lg border-2 border-dashed border-border h-full flex-grow">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold text-card-foreground mb-2">No Data to Display</h2>
              <p className="text-muted-foreground max-w-md">
                Import an Excel file (.xls or .xlsx) to see your data. Only columns A through E will be displayed.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
