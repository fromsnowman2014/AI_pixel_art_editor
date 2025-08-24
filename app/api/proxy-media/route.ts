import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    const validate = request.nextUrl.searchParams.get('validate') === 'true'
    const rangeHeader = request.headers.get('range')
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }

    // Validate URL format
    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Security: Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are allowed' }, { status: 400 })
    }

    // Security: Block localhost and private IPs
    const hostname = targetUrl.hostname.toLowerCase()
    const blockedHosts = [
      'localhost', '127.0.0.1', '::1',
      '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
      '172.30.', '172.31.', '192.168.'
    ]
    
    if (blockedHosts.some(blocked => hostname.includes(blocked))) {
      return NextResponse.json({ error: 'Access to private networks is not allowed' }, { status: 403 })
    }

    // Prepare fetch headers with Range support
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'PixelBuddy-MediaImporter/1.0',
      'Accept': validate ? '*/*' : 'image/*, video/*, application/octet-stream',
    }
    
    // Add Range header for partial content requests
    if (rangeHeader && !validate) {
      fetchHeaders['Range'] = rangeHeader
    }

    const fetchOptions: RequestInit = {
      method: validate ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      // Set reasonable timeout
      signal: AbortSignal.timeout(30000) // 30 seconds
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      )
    }

    // For validation requests, just return success
    if (validate) {
      return NextResponse.json({ success: true })
    }

    // Check content type
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
    const isValidMedia = contentType.startsWith('image/') || 
                        contentType.startsWith('video/') ||
                        contentType.includes('gif')

    if (!isValidMedia) {
      return NextResponse.json({ error: 'URL does not point to a valid media file' }, { status: 400 })
    }

    // Check file size (max 50MB)
    const contentLength = response.headers.get('Content-Length')
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 })
    }

    // Stream the response back with proper CORS and Range headers
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', contentType)
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Range')
    responseHeaders.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length')
    responseHeaders.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
    
    // Handle Range request responses
    if (response.status === 206) {
      // Partial content response
      const contentRange = response.headers.get('Content-Range')
      const contentLength = response.headers.get('Content-Length')
      const acceptRanges = response.headers.get('Accept-Ranges')
      
      if (contentRange) responseHeaders.set('Content-Range', contentRange)
      if (contentLength) responseHeaders.set('Content-Length', contentLength)
      if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)
      
      return new NextResponse(response.body, {
        status: 206, // Partial Content
        headers: responseHeaders,
      })
    } else {
      // Full content response
      const acceptRanges = response.headers.get('Accept-Ranges')
      if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)
      
      if (contentLength) responseHeaders.set('Content-Length', contentLength)
      
      return new NextResponse(response.body, {
        status: 200,
        headers: responseHeaders,
      })
    }

  } catch (error) {
    console.error('Proxy media error:', error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Request timeout - media source took too long to respond' }, { status: 408 })
    }
    
    return NextResponse.json(
      { error: 'Failed to proxy media request' }, 
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}