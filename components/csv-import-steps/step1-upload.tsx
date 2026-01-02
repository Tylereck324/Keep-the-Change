'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { parseAllyBankCSV, validateCSVFile, type ParseResult } from '@/lib/utils/csv-parser'

interface Step1UploadProps {
  onComplete: (result: ParseResult) => void
}

export function Step1Upload({ onComplete }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  const processFile = useCallback(async (selectedFile: File) => {
    // Validate file
    const validation = validateCSVFile(selectedFile)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setParsing(true)

    try {
      // Read file content
      const content = await selectedFile.text()

      // Parse CSV
      const result = parseAllyBankCSV(content)

      // Check if any transactions were parsed
      if (result.transactions.length === 0) {
        setError('No valid transactions found in CSV')
        setParsing(false)
        return
      }

      // Pass to next step
      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV')
      setParsing(false)
    }
  }, [onComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [processFile])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Upload CSV File</h2>
        <p className="text-muted-foreground">
          Import transactions from your Ally Bank CSV export
        </p>
      </div>

      <Card
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="text-sm">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary/80"
            >
              <span>Click to upload</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileInput}
                disabled={parsing}
              />
            </label>
            <span className="text-muted-foreground"> or drag and drop</span>
          </div>

          <p className="text-xs text-muted-foreground">
            CSV file up to 5MB
          </p>

          {file && !parsing && !error && (
            <div className="mt-4 text-sm text-muted-foreground">
              Selected: {file.name}
            </div>
          )}

          {parsing && (
            <div className="mt-4 text-sm text-primary">
              Parsing CSV...
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium">Expected CSV format:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Columns: Date, Amount, Description (minimum required)</li>
          <li>Date format: YYYY-MM-DD</li>
          <li>Amount: positive numbers (debits will be converted to positive)</li>
          <li>Description: transaction details (max 100 characters)</li>
        </ul>
      </div>
    </div>
  )
}
