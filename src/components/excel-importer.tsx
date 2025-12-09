"use client";

import { useRef, type ChangeEvent, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud } from 'lucide-react';
import { useFirebase, initiateAnonymousSignIn } from '@/firebase';

interface ExcelImporterProps {
  onDataParsed: (data: { fileName: string, headers: string[], rows: string[][] }) => void;
  disabled?: boolean;
}

export function ExcelImporter({ onDataParsed, disabled = false }: ExcelImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { auth, user } = useFirebase();

  useEffect(() => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    if (!user) {
       toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be signed in to import files.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
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

        onDataParsed({ fileName: file.name, headers, rows });

        toast({
          title: "File Ready for Upload",
          description: `${file.name} has been processed. Click 'Upload to Database' to save it.`,
        });

      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error reading the Excel file. Please try again.",
        });
      } finally {
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
    if (!user) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: "Authenticating...",
      });
      if (auth) initiateAnonymousSignIn(auth);
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
        aria-hidden="true"
        disabled={disabled}
      />
      <Button onClick={handleButtonClick} size="lg" disabled={disabled}>
        <UploadCloud className="mr-2 h-5 w-5" />
        Import Excel File
      </Button>
    </>
  );
}
