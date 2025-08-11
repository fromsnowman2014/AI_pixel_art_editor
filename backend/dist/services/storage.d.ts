export declare class StorageService {
    /**
     * Upload image to configured storage (R2 or Supabase)
     */
    uploadImage(buffer: Buffer, filename: string, mimeType: string, folder?: string): Promise<string>;
    private uploadToR2;
    private uploadToSupabase;
    healthCheck(): Promise<boolean>;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storage.d.ts.map