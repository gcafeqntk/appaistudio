
export const handleGeminiError = (error: any): never => {
    const errorMessage = error?.message || error?.toString() || '';

    // Check for 429 or Quota related errors
    if (errorMessage.includes('429') || errorMessage.includes('Quota') || errorMessage.includes('quota') || errorMessage.includes('Resource has been exhausted')) {
        // Distinction strategy:
        // If it mentions "limit" and "requests" it's often user hitting speed limit.
        // But user wants specific separation.
        // "Quota exceeded" often means strictly out of capacity for the key.

        // Heuristic: If we have "quota" and "exceeded", it's likely the "Hết API key" case or strong rate limit.
        // But user defined "thao tác quá nhanh" vs "hết credit".

        // Let's treat "Quota exceeded" as "Hết API key" request
        if (errorMessage.includes('quota') || errorMessage.includes('Exceeded')) {
            throw new Error("Hết API key, bạn hãy nhập thêm API key để tiếp tục công việc");
        }

        // Fallback for other 429s (Speed)
        throw new Error("Hãy thao tác chậm lại vì api key của bạn không đáp ứng để xử lý nhanh");
    }

    // Pass through other errors or translate if needed
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        throw new Error("Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.");
    }

    // Return original if unknown, but maybe cleaner?
    throw new Error(`Lỗi hệ thống: ${errorMessage}`);
};
