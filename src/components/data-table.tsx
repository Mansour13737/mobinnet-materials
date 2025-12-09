"use client";

import { useState, useMemo, useEffect } from 'react';
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
  searchTerm: string;
}

export function DataTable({ headers, data, searchTerm }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return data;
    }
    return data.filter(row =>
      row.some(cell =>
        cell.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = useMemo(() => Math.ceil(filteredData.length / ROWS_PER_PAGE), [filteredData.length]);
  
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;

  return (
    <Card className="w-full shadow-lg transition-all duration-300 flex flex-col flex-grow">
      <CardHeader>
        <CardTitle>Imported Data</CardTitle>
        <CardDescription>
          Showing {filteredData.length} of {data.length} records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="relative overflow-x-auto rounded-md border h-full">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="font-bold w-[50px]">#</TableHead>
                    {headers.map((header, index) => (
                        <TableHead key={index} className="font-bold">{header || `Column ${String.fromCharCode(65 + index)}`}</TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentData.length > 0 ? currentData.map((row, rowIndex) => (
                      <TableRow key={rowIndex} className="hover:bg-accent/50">
                          <TableCell>{startIndex + rowIndex + 1}</TableCell>
                          {Array.from({ length: headers.length }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>{row[cellIndex] || ''}</TableCell>
                          ))}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={headers.length + 1} className="h-24 text-center">
                          No matching records found.
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
