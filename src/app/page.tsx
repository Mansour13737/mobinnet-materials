"use client";

import { useState } from "react";
import { ExcelImporter } from "@/components/excel-importer";
import { DataTable } from "@/components/data-table";
import { FileSpreadsheet, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [tableData, setTableData] = useState<string[][]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDataProcessed = ({ headers, rows }: { headers: string[]; rows: string[][] }) => {
    setTableHeaders(headers);
    setTableData(rows);
  };

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-border">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4 sm:mb-0">
            ExcelView
          </h1>
          <ExcelImporter onDataProcessed={handleDataProcessed} />
        </header>
        <main className="w-full flex-grow flex flex-col">
          {tableData.length > 0 ? (
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
