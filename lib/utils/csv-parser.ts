import Papa from 'papaparse'

export type ParsedTransaction = {
  date: string // YYYY-MM-DD
  amount: number // positive number
  description: string
  rowNumber: number // for error reporting
}

export type ParseResult = {
  transactions: ParsedTransaction[]
  errors: Array<{ rowNumber: number; message: string }>
  summary: {
    total: number
    success: number
    failed: number
  }
}

/**
 * Parse Ally Bank CSV format
 * Expected columns: Date, Time, Amount, Type, Description
 */
export function parseAllyBankCSV(fileContent: string): ParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: Array<{ rowNumber: number; message: string }> = []

  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  // Validate required columns exist
  const requiredColumns = ['Date', 'Amount', 'Description']
  const headers = parseResult.meta.fields || []
  const missingColumns = requiredColumns.filter(col => !headers.includes(col))

  if (missingColumns.length > 0) {
    throw new Error(`CSV must have ${requiredColumns.join(', ')} columns. Missing: ${missingColumns.join(', ')}`)
  }

  // Parse each row
  parseResult.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2 // +2 because: +1 for header, +1 for 1-indexed

    try {
      // Validate date (YYYY-MM-DD format)
      const dateStr = row.Date?.trim()
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD')
      }

      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date value')
      }

      // Validate amount (convert to positive number)
      const amountStr = row.Amount?.toString().trim()
      if (!amountStr) {
        throw new Error('Missing amount')
      }

      const amount = Math.abs(parseFloat(amountStr))
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount')
      }
      if (amount > 100_000_000) {
        throw new Error('Amount exceeds maximum allowed value')
      }

      // Get description (required)
      const description = row.Description?.trim()
      if (!description) {
        throw new Error('Missing description')
      }
      if (description.length > 100) {
        throw new Error('Description must be 100 characters or less')
      }

      transactions.push({
        date: dateStr,
        amount,
        description,
        rowNumber,
      })
    } catch (error) {
      errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  return {
    transactions,
    errors,
    summary: {
      total: parseResult.data.length,
      success: transactions.length,
      failed: errors.length,
    },
  }
}

/**
 * Validate file before parsing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: 'Please upload a CSV file' }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Please import transactions in smaller batches' }
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'CSV file is empty' }
  }

  return { valid: true }
}
