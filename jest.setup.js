import '@testing-library/jest-dom'

// Mock Canvas API for testing
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn((x, y, w, h) => ({ 
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn((w, h) => ({ 
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h
    })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    rect: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    imageSmoothingEnabled: false,
    webkitImageSmoothingEnabled: false,
    mozImageSmoothingEnabled: false,
    msImageSmoothingEnabled: false,
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
  width: 100,
  height: 100,
}

// Mock HTMLCanvasElement
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvas.getContext())
global.HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL

// Mock OffscreenCanvas
global.OffscreenCanvas = jest.fn().mockImplementation(() => mockCanvas)

// Mock Web Workers
global.Worker = class Worker {
  constructor(url) {
    this.url = url
    this.onmessage = null
    this.onerror = null
  }

  postMessage(message) {
    // Mock implementation - can be extended for specific tests
  }

  terminate() {
    // Mock implementation
  }
}

// Mock IndexedDB for local storage
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  cmp: jest.fn(),
}

global.indexedDB = mockIDB

// Mock ImageData constructor
global.ImageData = class ImageData {
  constructor(dataOrWidth, heightOrWidth, height) {
    if (typeof dataOrWidth === 'number') {
      // ImageData(width, height)
      this.width = dataOrWidth
      this.height = heightOrWidth
      this.data = new Uint8ClampedArray(dataOrWidth * heightOrWidth * 4)
    } else {
      // ImageData(data, width, height?)
      this.data = dataOrWidth
      this.width = heightOrWidth
      this.height = height || (dataOrWidth.length / (heightOrWidth * 4))
    }
  }
}

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  CANVAS_MAX_ZOOM: '1600',
  CANVAS_MIN_ZOOM: '50',
  CANVAS_DEFAULT_SIZE: '32',
  AI_MAX_IMAGE_SIZE: '512',
  AI_DEFAULT_COLOR_COUNT: '24',
}