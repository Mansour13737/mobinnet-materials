"use client";

import { useState, useMemo, useEffect } from "react";
import { ExcelImporter } from "@/components/excel-importer";
import { DataTable } from "@/components/data-table";
import { FileSpreadsheet, Search, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExcelFile, ExcelRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

interface ParsedData {
  fileName: string;
  headers: string[];
  rows: string[][];
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
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
    if (!selectedFileId && excelFiles && excelFiles.length > 0 && !parsedData) {
      setSelectedFileId(excelFiles[0].id);
    }
  }, [excelFiles, selectedFileId, parsedData]);
  
  const tableData = useMemo(() => {
    if (parsedData) {
      return parsedData.rows;
    }
    return excelRows ? excelRows.map(row => [row.columnA, row.columnB, row.columnC, row.columnD, row.columnE].filter(c => c !== undefined)) : [];
  }, [excelRows, parsedData]);

  const tableHeaders = useMemo(() => {
    if (parsedData) {
      return parsedData.headers;
    }
    if (excelFiles && selectedFileId) {
        const selectedFile = excelFiles.find(f => f.id === selectedFileId);
        return selectedFile?.headers || ['A', 'B', 'C', 'D', 'E'];
    }
    return ['A', 'B', 'C', 'D', 'E'];
  }, [excelFiles, selectedFileId, parsedData]);

  const handleFileSelect = (fileId: string) => {
    setParsedData(null);
    setSelectedFileId(fileId);
  }

  const onDataParsed = (data: ParsedData) => {
    setParsedData(data);
    setSelectedFileId(null); // Deselect any firebase file
  }

  const handleUpload = async () => {
    if (!parsedData || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No data to upload or user not authenticated.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const excelFileId = uuidv4();
      const fileRef = doc(firestore, `users/${user.uid}/excelFiles`, excelFileId);
      const batch = writeBatch(firestore);

      batch.set(fileRef, {
          id: excelFileId,
          fileName: parsedData.fileName,
          uploadDate: serverTimestamp(),
          headers: parsedData.headers
      });

      const rowsCollectionRef = collection(firestore, `users/${user.uid}/excelFiles/${excelFileId}/excelRows`);
      
      parsedData.rows.forEach((row) => {
          const rowId = uuidv4();
          const rowRef = doc(rowsCollectionRef, rowId);
          batch.set(rowRef, {
              id: rowId,
              excelFileId: excelFileId,
              columnA: row[0] || "",
              columnB: row[1] || "",
              columnC: row[2] || "",
              columnD: row[3] || "",
              columnE: row[4] || "",
          });
      });

      await batch.commit();

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${parsedData.rows.length} rows from ${parsedData.fileName}.`,
        className: 'bg-primary text-primary-foreground'
      });

      setParsedData(null);
      setSelectedFileId(excelFileId);

    } catch (error) {
      console.error("Error uploading data:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error uploading your data. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isUserLoading || isLoadingFiles || (isLoadingRows && !parsedData);
  const hasData = (parsedData && parsedData.rows.length > 0) || (excelRows && excelRows.length > 0);

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-border gap-4">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
            ExcelView
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {excelFiles && excelFiles.length > 0 && (
                 <Select onValueChange={handleFileSelect} value={parsedData ? '' : selectedFileId || ''}>
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
            <ExcelImporter onDataParsed={onDataParsed} disabled={isUploading} />
            {parsedData && (
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                {isUploading ? 'Uploading...' : 'Upload to Database'}
              </Button>
            )}
          </div>
        </header>
        <main className="w-full flex-grow flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-center p-12 h-full flex-grow">
              <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : hasData ? (
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
