"use client";

import { useRef, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud } from 'lucide-react';

interface ExcelImporterProps {
  onDataProcessed: (data: { headers: string[]; rows: string[][] }) => void;
}

export function ExcelImporter({ onDataProcessed }: ExcelImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (jsonData.length === 0) {
          toast({
            variant: "destructive",
            title: "Empty Sheet",
            description: "The selected Excel sheet is empty.",
          });
          return;
        }

        const headers = jsonData[0].slice(0, 5).map(String);
        const rows = jsonData.slice(1).map(row => row.slice(0, 5).map(String));

        onDataProcessed({ headers, rows });

        toast({
          title: "Import Successful",
          description: `Successfully imported ${rows.length} rows from ${file.name}.`,
          className: 'bg-primary text-primary-foreground'
        });

      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing the Excel file. Please ensure it's a valid .xls or .xlsx file.",
        });
      } finally {
        // Reset file input to allow re-uploading the same file
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          variant: "destructive",
          title: "File Read Error",
          description: "Could not read the selected file.",
        });
    }

    reader.readAsArrayBuffer(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
        aria-hidden="true"
      />
      <Button onClick={handleButtonClick} size="lg">
        <UploadCloud className="mr-2 h-5 w-5" />
        Import Excel File
      </Button>
    </>
  );
}
