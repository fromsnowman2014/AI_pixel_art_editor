import { env } from '../types/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('storage-service');

export class StorageService {
  /**
   * Upload image to configured storage (R2 or Supabase)
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder?: string
  ): Promise<string> {
    const fullPath = folder ? `${folder}/${filename}` : filename;
    
    logger.info('Uploading image to storage', {
      filename: fullPath,
      sizeBytes: buffer.length,
      mimeType,
    });

    try {
      if (env.R2_BUCKET_NAME && env.R2_ACCESS_KEY_ID) {
        return this.uploadToR2(buffer, fullPath, mimeType);
      } else if (env.SUPABASE_BUCKET_NAME && env.SUPABASE_SERVICE_ROLE_KEY) {
        return this.uploadToSupabase(buffer, fullPath, mimeType);
      } else {
        throw new Error('No storage service configured');
      }
    } catch (error) {
      logger.error('Image upload failed', {
        filename: fullPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async uploadToR2(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    // Simplified R2 upload - in production, use AWS SDK
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), filename);

    const response = await fetch(`${env.R2_PUBLIC_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.R2_ACCESS_KEY_ID}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.statusText}`);
    }

    return `${env.R2_PUBLIC_URL}/${filename}`;
  }

  private async uploadToSupabase(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const response = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET_NAME}/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': mimeType,
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase upload failed: ${response.statusText}`);
    }

    return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_BUCKET_NAME}/${filename}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - just verify configuration
      return !!(env.R2_BUCKET_NAME || env.SUPABASE_BUCKET_NAME);
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();