"use client";

import { useState, useMemo, useEffect } from "react";
import { ExcelImporter } from "@/components/excel-importer";
import { DataTable } from "@/components/data-table";
import { FileSpreadsheet, Search, Loader2, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc, serverTimestamp, getDocs, deleteDoc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExcelFile, ExcelRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";


interface ParsedData {
  fileName: string;
  headers: string[];
  rows: string[][];
}

const BATCH_SIZE = 499; // Firestore batch limit is 500

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lastUploadedFileId, setLastUploadedFileId] = useState<string | null>(null);

  const { toast } = useToast();
  const { firestore, user, isUserLoading } = useFirebase();

  const userFilesRef = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, `users/${user.uid}/excelFiles`), orderBy("uploadDate", "desc")) : null
  , [firestore, user]);

  const { data: excelFiles, isLoading: isLoadingFiles } = useCollection<ExcelFile>(userFilesRef);

  const selectedFileRowsRef = useMemoFirebase(() =>
    user && firestore && selectedFileId ? query(collection(firestore, `users/${user.uid}/excelFiles/${selectedFileId}/excelRows`), orderBy("rowIndex")) : null
  , [firestore, user, selectedFileId]);

  const { data: excelRows, isLoading: isLoadingRows } = useCollection<ExcelRow>(selectedFileRowsRef);

  useEffect(() => {
    // This effect handles the initial selection of a file when the component loads
    // or when the list of available files changes.
    
    // Condition 1: If there's a file that was just uploaded, select it.
    if (lastUploadedFileId) {
      setSelectedFileId(lastUploadedFileId);
      setLastUploadedFileId(null); // Reset after selection to prevent re-selection.
    } 
    // Condition 2: If no file is currently selected, AND the list of files has loaded,
    // AND there are files available, AND we are not in the middle of previewing a new file...
    else if (!selectedFileId && excelFiles && excelFiles.length > 0 && !parsedData) {
      // ...then select the first file in the list (which is the most recent due to the query).
      setSelectedFileId(excelFiles[0].id);
    }
  }, [excelFiles, selectedFileId, parsedData, lastUploadedFileId]);
  
  const selectedFile = useMemo(() => {
      if (!selectedFileId || !excelFiles) return null;
      return excelFiles.find(f => f.id === selectedFileId);
  }, [excelFiles, selectedFileId]);

  const tableData = useMemo(() => {
    // If we are previewing a newly parsed file, use its data directly.
    if (parsedData) {
      return parsedData.rows;
    }
    
    // If we are displaying data from Firestore.
    if (excelRows && selectedFile) {
        // Map over the Firestore rows to format them for the table.
        return excelRows.map(row => {
            const rowData: string[] = [];
            // Dynamically get column keys based on the number of headers.
            const columns: (keyof ExcelRow)[] = ['columnA', 'columnB', 'columnC', 'columnD', 'columnE'];
            const headerCount = selectedFile.headers?.length || 0;

            // Iterate only up to the number of actual headers for the selected file.
            for (let i = 0; i < headerCount; i++) {
                const columnKey = columns[i];
                // Push the data from the corresponding column, or an empty string if it's missing.
                rowData.push(row[columnKey] || "");
            }
            return rowData;
        });
    }

    // Return an empty array if no data source is available.
    return [];
  }, [excelRows, parsedData, selectedFile]);


  const tableHeaders = useMemo(() => {
    // Use headers from the parsed data if available (for preview).
    if (parsedData) {
      return parsedData.headers;
    }
    // Otherwise, use headers from the selected file in Firestore.
    if (selectedFile) {
        return selectedFile.headers || [];
    }
    // Return empty array if no headers are available.
    return [];
  }, [selectedFile, parsedData]);

  const handleFileSelect = (fileId: string) => {
    if (fileId) {
      setParsedData(null);
      setSelectedFileId(fileId);
    }
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
    setUploadProgress(0);
    const newExcelFileId = uuidv4();
    const totalRows = parsedData.rows.length;

    try {
      const fileRef = doc(firestore, `users/${user.uid}/excelFiles`, newExcelFileId);
      const fileData = {
          id: newExcelFileId,
          fileName: parsedData.fileName,
          uploadDate: serverTimestamp(),
          headers: parsedData.headers
      };

      const fileBatch = writeBatch(firestore);
      fileBatch.set(fileRef, fileData);
      
      // We must commit the file document first to ensure it exists before we try to add sub-collection documents.
      await fileBatch.commit().catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: fileRef.path,
          operation: 'create',
          requestResourceData: fileData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // Re-throw to be caught by the outer catch block
        throw new Error('Failed to create file document.');
      });
      
      setUploadProgress(5); // Initial progress

      // Then, batch-upload the rows
      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = parsedData.rows.slice(i, i + BATCH_SIZE);
        
        chunk.forEach((row, rowIndex) => {
            const rowId = uuidv4();
            const rowRef = doc(firestore, `users/${user.uid}/excelFiles/${newExcelFileId}/excelRows`, rowId);
            batch.set(rowRef, {
                id: rowId,
                excelFileId: newExcelFileId,
                rowIndex: i + rowIndex,
                columnA: row[0] || "",
                columnB: row[1] || "",
                columnC: row[2] || "",
                columnD: row[3] || "",
                columnE: row[4] || "",
            });
        });

        await batch.commit().catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.uid}/excelFiles/${newExcelFileId}/excelRows`,
                operation: 'write',
                requestResourceData: { info: `Batch starting at row ${i}`},
            });
            errorEmitter.emit('permission-error', permissionError);
            throw new Error(`Failed to upload row batch starting at index ${i}.`);
        });

        const newProgress = Math.min(95, Math.round(((i + chunk.length) / totalRows) * 90) + 5);
        setUploadProgress(newProgress);
      }
      
      setUploadProgress(100);

      setTimeout(() => {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${totalRows} rows from ${parsedData.fileName}.`,
          className: 'bg-primary text-primary-foreground'
        });
        setParsedData(null);
        setLastUploadedFileId(newExcelFileId);
        setIsUploading(false);
      }, 500);


    } catch (error: any) {
      console.error("Error uploading data:", error);
      toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || "There was an error uploading your data. Check the developer console for details.",
      });
      setIsUploading(false);
    }
  };


  const handleDeleteFile = async () => {
    if (!selectedFileId || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No file selected to delete or user not authenticated.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const rowsRef = collection(firestore, `users/${user.uid}/excelFiles/${selectedFileId}/excelRows`);
      const rowsSnapshot = await getDocs(rowsRef);

      // Delete rows in batches
      const rowIds = rowsSnapshot.docs.map(d => d.id);
      for (let i = 0; i < rowIds.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = rowIds.slice(i, i + BATCH_SIZE);
        chunk.forEach(rowId => {
          batch.delete(doc(rowsRef, rowId));
        });
        await batch.commit();
      }

      // Delete the main file document
      const fileRef = doc(firestore, `users/${user.uid}/excelFiles`, selectedFileId);
      await deleteDoc(fileRef);

      toast({
        title: "Delete Successful",
        description: `Successfully deleted the file and its rows.`,
      });

      setSelectedFileId(null);

    } catch (error) {
      console.error("Error deleting file:", error);
       const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/excelFiles/${selectedFileId}`,
          operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "There was an error deleting the file. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  const isLoading = isUserLoading || isLoadingFiles || (isLoadingRows && !parsedData);
  const hasData = (parsedData && parsedData.rows.length > 0) || (tableData && tableData.length > 0);
  const selectedFileName = selectedFile?.fileName;

  return (
    <>
      <div className="min-h-full bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-border gap-4">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
              ExcelView
            </h1>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {excelFiles && excelFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleFileSelect} value={parsedData ? '' : selectedFileId || ''}>
                    <SelectTrigger className="w-[240px]">
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
                  {selectedFileId && !parsedData && (
                    <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                  </div>
              )}
              <ExcelImporter onDataParsed={onDataParsed} disabled={isUploading || isDeleting} />
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
            ) : isUploading ? (
              <div className="flex flex-col items-center justify-center text-center p-12 h-full flex-grow">
                <h2 className="text-2xl font-semibold text-card-foreground mb-4">Uploading Data...</h2>
                <div className="w-full max-w-md">
                   <Progress value={uploadProgress} className="w-full" />
                   <p className="text-muted-foreground mt-2">{Math.round(uploadProgress)}%</p>
                </div>
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file <strong className="font-medium">{selectedFileName}</strong> and all its associated rows from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
