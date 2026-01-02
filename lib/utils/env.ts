export function isBundleAnalyzeEnabled(value = process.env.ANALYZE): boolean {
  return value === '1' || value === 'true'
}
