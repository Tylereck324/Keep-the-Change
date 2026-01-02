import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import { isBundleAnalyzeEnabled } from './lib/utils/env'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: isBundleAnalyzeEnabled(),
})

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default withBundleAnalyzer(nextConfig)
