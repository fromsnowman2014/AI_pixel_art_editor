"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const env_1 = require("../types/env");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('storage-service');
class StorageService {
    /**
     * Upload image to configured storage (R2 or Supabase)
     */
    async uploadImage(buffer, filename, mimeType, folder) {
        const fullPath = folder ? `${folder}/${filename}` : filename;
        logger.info('Uploading image to storage', {
            filename: fullPath,
            sizeBytes: buffer.length,
            mimeType,
        });
        try {
            if (env_1.env.R2_BUCKET_NAME && env_1.env.R2_ACCESS_KEY_ID) {
                return this.uploadToR2(buffer, fullPath, mimeType);
            }
            else if (env_1.env.SUPABASE_BUCKET_NAME && env_1.env.SUPABASE_SERVICE_ROLE_KEY) {
                return this.uploadToSupabase(buffer, fullPath, mimeType);
            }
            else {
                throw new Error('No storage service configured');
            }
        }
        catch (error) {
            logger.error('Image upload failed', {
                filename: fullPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async uploadToR2(buffer, filename, mimeType) {
        // Simplified R2 upload - in production, use AWS SDK
        const formData = new FormData();
        formData.append('file', new Blob([buffer], { type: mimeType }), filename);
        const response = await fetch(`${env_1.env.R2_PUBLIC_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env_1.env.R2_ACCESS_KEY_ID}`,
            },
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`R2 upload failed: ${response.statusText}`);
        }
        return `${env_1.env.R2_PUBLIC_URL}/${filename}`;
    }
    async uploadToSupabase(buffer, filename, mimeType) {
        const response = await fetch(`${env_1.env.SUPABASE_URL}/storage/v1/object/${env_1.env.SUPABASE_BUCKET_NAME}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env_1.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': mimeType,
            },
            body: buffer,
        });
        if (!response.ok) {
            throw new Error(`Supabase upload failed: ${response.statusText}`);
        }
        return `${env_1.env.SUPABASE_URL}/storage/v1/object/public/${env_1.env.SUPABASE_BUCKET_NAME}/${filename}`;
    }
    /**
     * Upload file to storage (generic method)
     */
    async upload(filename, buffer, mimeType, folder) {
        return this.uploadImage(buffer, filename, mimeType, folder);
    }
    /**
     * Download file from storage by URL
     */
    async download(url) {
        logger.info('Downloading file from storage', { url });
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            logger.info('File downloaded successfully', {
                url,
                sizeBytes: buffer.length,
            });
            return buffer;
        }
        catch (error) {
            logger.error('File download failed', {
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async healthCheck() {
        try {
            // Simple health check - just verify configuration
            return !!(env_1.env.R2_BUCKET_NAME || env_1.env.SUPABASE_BUCKET_NAME);
        }
        catch {
            return false;
        }
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
//# sourceMappingURL=storage.js.map