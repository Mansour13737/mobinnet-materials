"use client";

import { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaginationControls } from './pagination-controls';

const ROWS_PER_PAGE = 10;

interface DataTableProps {
  headers: string[];
  data: string[][];
}

export function DataTable({ headers, data }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.ceil(data.length / ROWS_PER_PAGE), [data.length]);
  
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Card className="w-full shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle>Imported Data</CardTitle>
        <CardDescription>
          Showing {currentData.length} of {data.length} records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    {headers.map((header, index) => (
                        <TableHead key={index} className="font-bold">{header || `Column ${String.fromCharCode(65 + index)}`}</TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentData.length > 0 ? currentData.map((row, rowIndex) => (
                      <TableRow key={rowIndex} className="hover:bg-accent/50">
                          {Array.from({ length: headers.length }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>{row[cellIndex] || ''}</TableCell>
                          ))}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={headers.length} className="h-24 text-center">
                          No data to display for this page.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex justify-end pt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardFooter>
      )}
    </Card>
  );
}
