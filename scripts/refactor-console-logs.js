#!/usr/bin/env node

/**
 * Console.log Refactoring Script
 * 
 * This script systematically replaces console.log calls with centralized logging
 * while preserving critical playback-related debugging logs.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Patterns to preserve (DO NOT REFACTOR these)
const PRESERVE_PATTERNS = [
  /🎬.*PlaybackDebug/,
  /PlaybackDebugger/,
  /playback.*debug/i,
  /timeline.*debug/i,
  /🔧.*playback/i,
  /🎯.*playback/i,
  /🛑.*playback/i,
  /frame.*advance/i,
  /🧹.*Playback debug logs cleared/,
  /📸.*PlaybackDebugger.*Creating state snapshot/,
  /✅.*PlaybackDebugger.*State snapshot created/,
  /❌.*PlaybackDebugger.*Error creating state snapshot/,
  /⚠️.*Slow operation detected/,
  /🔍.*Playback Diagnostics/
]

// File patterns to process
const FILE_PATTERNS = [
  'lib/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'app/**/*.{ts,tsx}'
]

// Exclude these files
const EXCLUDE_PATTERNS = [
  'lib/ui/playback-debugger.ts',
  'lib/ui/centralized-logger.ts',
  'lib/ui/smart-logger.ts',
  'lib/ui/debug.ts',
  '__tests__/**/*'
]

// Mapping of console methods to centralized logger methods
const LOG_MAPPINGS = {
  'console.log': {
    canvas: 'logCanvas',
    frame: 'logFrame', 
    project: 'logProject',
    ai: 'logAI',
    ui: 'logUI',
    api: 'logAPI',
    default: 'logDebug'
  },
  'console.error': 'logError',
  'console.warn': 'logDebug',  // Convert warnings to debug for now
  'console.info': 'logDebug'
}

/**
 * Check if a log line should be preserved based on patterns
 */
function shouldPreserveLine(line) {
  return PRESERVE_PATTERNS.some(pattern => pattern.test(line))
}

/**
 * Determine the appropriate log category based on content
 */
function categorizeLogContent(content) {
  const lower = content.toLowerCase()
  
  if (lower.includes('canvas') || lower.includes('pixel') || lower.includes('draw')) {
    return 'canvas'
  }
  if (lower.includes('frame') || lower.includes('animation')) {
    return 'frame'
  }
  if (lower.includes('project') || lower.includes('tab')) {
    return 'project'
  }
  if (lower.includes('ai') || lower.includes('generate') || lower.includes('openai')) {
    return 'ai'
  }
  if (lower.includes('button') || lower.includes('click') || lower.includes('ui') || lower.includes('component')) {
    return 'ui'
  }
  if (lower.includes('api') || lower.includes('request') || lower.includes('response')) {
    return 'api'
  }
  
  return 'default'
}

/**
 * Parse a console.log call and extract parameters
 */
function parseConsoleCall(line) {
  const consoleRegex = /(console\.(log|error|warn|info))\s*\(\s*(.*)\s*\)/
  const match = line.match(consoleRegex)
  
  if (!match) return null
  
  const [, fullMethod, method, params] = match
  return {
    fullMethod,
    method: method,
    params: params.trim(),
    originalLine: line
  }
}

/**
 * Convert console call to centralized logger call
 */
function convertToNewLog(parsed, category) {
  if (parsed.method === 'error') {
    // Special handling for errors
    const params = parsed.params.split(',').map(p => p.trim())
    const message = params[0] || "'Unknown error'"
    const errorData = params.length > 1 ? params.slice(1).join(', ') : 'null'
    
    return `logError(${message}, ${errorData})`
  }
  
  const logMethod = LOG_MAPPINGS['console.log'][category] || LOG_MAPPINGS['console.log'].default
  const params = parsed.params.split(',').map(p => p.trim())
  
  if (params.length === 1) {
    return `${logMethod}(${params[0]})`
  } else if (params.length === 2) {
    return `${logMethod}(${params[0]}, ${params[1]})`
  } else {
    const action = params[0] || "'action'"
    const data = params.length > 1 ? `{ ${params.slice(1).map((p, i) => `arg${i}: ${p}`).join(', ')} }` : 'null'
    return `${logMethod}(${action}, ${data})`
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`Processing: ${filePath}`)
  
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let modified = false
  let preservedCount = 0
  let convertedCount = 0
  
  // Check if file already imports centralized logger
  const hasImport = content.includes('import') && (
    content.includes('logCanvas') || 
    content.includes('logProject') || 
    content.includes('centralized-logger')
  )
  
  const newLines = lines.map((line, index) => {
    // Skip if this line should be preserved
    if (shouldPreserveLine(line)) {
      preservedCount++
      return line
    }
    
    const parsed = parseConsoleCall(line)
    if (!parsed) return line
    
    // Check if this is a playback-related log by examining nearby lines
    const context = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)).join(' ')
    if (shouldPreserveLine(context)) {
      preservedCount++
      return line
    }
    
    const category = categorizeLogContent(parsed.params)
    const newLogCall = convertToNewLog(parsed, category)
    
    if (newLogCall) {
      modified = true
      convertedCount++
      return line.replace(parsed.originalLine, newLogCall)
    }
    
    return line
  })
  
  if (modified && convertedCount > 0) {
    let finalContent = newLines.join('\n')
    
    // Add import statement if not present
    if (!hasImport) {
      const importStatement = `import { logCanvas, logFrame, logProject, logAI, logUI, logAPI, logError, logDebug } from '@/lib/ui/centralized-logger'\n`
      
      // Find the best place to insert the import
      const firstImportIndex = lines.findIndex(line => line.trim().startsWith('import'))
      if (firstImportIndex >= 0) {
        const beforeFirst = lines.slice(0, firstImportIndex).join('\n')
        const afterFirst = lines.slice(firstImportIndex).join('\n')
        finalContent = beforeFirst + '\n' + importStatement + afterFirst
      } else {
        // No imports found, add at top after shebang/comments
        let insertIndex = 0
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith('#!') || line.startsWith('//') || line.startsWith('/*') || line === '') {
            insertIndex = i + 1
          } else {
            break
          }
        }
        const before = lines.slice(0, insertIndex).join('\n')
        const after = lines.slice(insertIndex).join('\n')
        finalContent = before + '\n' + importStatement + '\n' + after
      }
    }
    
    fs.writeFileSync(filePath, finalContent)
    console.log(`  ✅ Modified: ${convertedCount} converted, ${preservedCount} preserved`)
    return { converted: convertedCount, preserved: preservedCount }
  } else {
    console.log(`  ⏭️  No changes: ${preservedCount} preserved`)
    return { converted: 0, preserved: preservedCount }
  }
}

/**
 * Find all files to process
 */
function findFiles() {
  const allFiles = []
  
  // Use a simpler approach with glob-like patterns
  const patterns = [
    'lib',
    'components', 
    'app'
  ]
  
  patterns.forEach(dir => {
    try {
      const command = `find ${dir} -name "*.ts" -o -name "*.tsx" 2>/dev/null || true`
      const output = execSync(command, { encoding: 'utf8' })
      if (output.trim()) {
        const files = output.trim().split('\n').filter(f => f && f.trim() !== '')
        allFiles.push(...files)
      }
    } catch (error) {
      console.warn(`Warning: Could not process directory ${dir}:`, error.message)
    }
  })
  
  // Filter out excluded files
  return allFiles.filter(file => {
    return !EXCLUDE_PATTERNS.some(pattern => {
      if (pattern.includes('**')) {
        return file.includes(pattern.replace('**/*', ''))
      }
      return file === pattern || file.includes(pattern)
    })
  })
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Starting Console.log Refactoring Process')
  console.log('📋 Preserving playback-related debug logs...')
  
  const files = findFiles()
  console.log(`📁 Found ${files.length} files to process`)
  
  let totalConverted = 0
  let totalPreserved = 0
  let filesModified = 0
  
  files.forEach(file => {
    const result = processFile(file)
    totalConverted += result.converted
    totalPreserved += result.preserved
    
    if (result.converted > 0) {
      filesModified++
    }
  })
  
  console.log('\n📊 Refactoring Summary:')
  console.log(`  📁 Files processed: ${files.length}`)
  console.log(`  ✏️  Files modified: ${filesModified}`)
  console.log(`  🔄 Console calls converted: ${totalConverted}`)
  console.log(`  🛡️  Playback logs preserved: ${totalPreserved}`)
  
  console.log('\n✅ Console.log refactoring completed!')
  console.log('⚠️  Please run tests to verify functionality:')
  console.log('   npm test -- __tests__/playback-preservation.test.ts')
  console.log('   npm run type-check')
  console.log('   npm run lint')
}

if (require.main === module) {
  main()
}

module.exports = {
  processFile,
  shouldPreserveLine,
  categorizeLogContent,
  parseConsoleCall,
  convertToNewLog
}