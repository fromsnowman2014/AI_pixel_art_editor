export declare class StorageService {
    /**
     * Upload image to configured storage (R2 or Supabase)
     */
    uploadImage(buffer: Buffer, filename: string, mimeType: string, folder?: string): Promise<string>;
    private uploadToR2;
    private uploadToSupabase;
    /**
     * Upload file to storage (generic method)
     */
    upload(filename: string, buffer: Buffer, mimeType: string, folder?: string): Promise<string>;
    /**
     * Download file from storage by URL
     */
    download(url: string): Promise<Buffer>;
    healthCheck(): Promise<boolean>;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storage.d.ts.map