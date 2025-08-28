/**
 * File Download and Management Utilities
 * 
 * Extracted from project-store.ts for better reusability
 */

/**
 * Download file from data URL
 * 
 * Creates a temporary link element to trigger file download
 * Automatically cleans up DOM elements after download
 * 
 * @param dataURL - Base64 data URL of the file
 * @param fileName - Name for the downloaded file
 */
export const downloadFile = (dataURL: string, fileName: string) => {
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataURL
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Generate safe filename from project name and timestamp
 * 
 * Ensures filenames are filesystem-safe and unique
 * 
 * @param projectName - Base project name
 * @param extension - File extension (without dot)
 * @returns Safe filename string
 */
export const generateSafeFileName = (projectName: string, extension: string): string => {
  // Replace unsafe characters with underscores
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_')
  
  // Generate timestamp
  const now = new Date()
  const timestamp = now.toISOString()
    .slice(0, 16) // YYYY-MM-DDTHH:MM
    .replace(/[:T-]/g, '') // Remove separators
  
  return `${safeName}_${timestamp}.${extension}`
}

/**
 * Validate data URL format
 * 
 * @param dataURL - Data URL to validate
 * @returns True if valid data URL format
 */
export const isValidDataURL = (dataURL: string): boolean => {
  return dataURL.startsWith('data:') && dataURL.includes(',')
}

/**
 * Extract mime type from data URL
 * 
 * @param dataURL - Data URL string
 * @returns MIME type or null if invalid
 */
export const extractMimeType = (dataURL: string): string | null => {
  if (!isValidDataURL(dataURL)) {
    return null
  }
  
  const match = dataURL.match(/^data:([^;]+)/)
  return match && match[1] ? match[1] : null
}

/**
 * Convert blob to data URL
 * 
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}