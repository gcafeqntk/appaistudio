
import { createClient } from '@supabase/supabase-js';

// --- CẤU HÌNH SUPABASE ---
// Bạn hãy thay thế 2 dòng dưới đây bằng thông tin từ Supabase Dashboard
// Vào Settings -> API -> Project URL / anon public key
const SUPABASE_URL = 'https://prrldyvdefoyloqtrhfw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycmxkeXZkZWZveWxvcXRyaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTQ5NzUsImV4cCI6MjA4NTE3MDk3NX0.ANRkpfrxGKefAW3-2-WXfB7RRmQbTFIYd2VcW24OeWk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Upload hình ảnh lên Supabase Storage
 * @param file File ảnh cần upload
 * @param bucket Tên bucket (mặc định là 'images')
 * @returns URL công khai của ảnh
 */
export const uploadImage = async (file: File, bucket: string = 'images'): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Lấy URL công khai
        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (error: any) {
        console.error("Supabase Upload Error:", error);
        throw new Error(error.message || "Upload failed");
    }
};
