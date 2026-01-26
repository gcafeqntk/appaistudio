# HƯỚNG DẪN: TÍCH HỢP ỨNG DỤNG AI STUDIO MỚI

Bạn muốn thêm một "App" khác (ví dụ: một Prompt khác từ Google AI Studio) vào hệ thống này? Rất đơn giản! Hãy làm theo 3 bước sau:

## BƯỚC 1: Chuẩn bị Logic (Backend)

Nếu App mới của bạn cần gọi Gemini với một Prompt khác (ví dụ: "Viết Email", "Dịch thuật", "Tóm tắt văn bản"...), bạn cần thêm hàm gọi API vào file dịch vụ.

1.  Mở file: `d:/AppHuy/appaistudio/services/gemini.ts`
2.  Thêm hàm mới vào cuối file. Ví dụ:

```typescript
// Ví dụ: Hàm cho App mới làm nhiệm vụ Tóm Tắt
export const summarizeText = async (text: string) => {
  const model = getGenerativeModel('gemini-1.5-flash'); // Chọn model phù hợp
  const prompt = `Hãy tóm tắt văn bản sau đây một cách ngắn gọn:\n\n${text}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
};
```

## BƯỚC 2: Tạo Giao Diện (Frontend)

Tạo một file giao diện riêng cho App mới trong thư mục `apps/`.

1.  Tạo file mới: `d:/AppHuy/appaistudio/apps/TomTatApp.tsx` (Đặt tên tùy ý).
2.  Viết code giao diện (React) cho nó. Bạn có thể copy cấu trúc của `NewToolApp.tsx` để bắt đầu cho nhanh.

```tsx
import React, { useState } from 'react';
import { summarizeText } from '../services/gemini'; // Import hàm ở Bước 1

const TomTatApp = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleRun = async () => {
     const result = await summarizeText(input);
     setOutput(result);
  };

  return (
    <div className="p-10 bg-white m-4 rounded-xl shadow-lg">
       <h2 className="text-2xl font-bold mb-4">Công Cụ Tóm Tắt</h2>
       <textarea 
          className="w-full border p-2 mb-4" 
          rows={5}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Dán văn bản vào đây..."
       />
       <button onClick={handleRun} className="bg-blue-600 text-white px-4 py-2 rounded">Chạy Ngay</button>
       
       {output && (
         <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold">Kết quả:</h3>
            <p>{output}</p>
         </div>
       )}
    </div>
  );
};

export default TomTatApp;
```

## BƯỚC 3: Đăng Ký Vào Shell (App.tsx)

Cuối cùng, hãy bảo cho "Sảnh chính" (`App.tsx`) biết sự tồn tại của App mới.

1.  Mở file: `d:/AppHuy/appaistudio/App.tsx`
2.  Import App mới:
    ```tsx
    import TomTatApp from './apps/TomTatApp';
    ```
3.  Tìm dòng `const [activeTab, setActiveTab] = ...` và thêm tên tab mới vào type (nếu dùng TypeScript chặt chẽ, hoặc cứ để string cũng được).
4.  Thêm nút bấm trên Menu:
    ```tsx
    <button onClick={() => setActiveTab('tom-tat')} ...>
       Công Cụ Tóm Tắt
    </button>
    ```
5.  Thêm chỗ hiển thị ở dưới cùng:
    ```tsx
    {activeTab === 'tom-tat' && <TomTatApp />}
    ```

---
**Mẹo:** Nếu bạn có code Python hoặc JavaScript từ AI Studio ("Get Code"), bạn chỉ cần copy phần prompt trong đó để tạo hàm ở **Bước 1**, còn phần giao diện thì làm như **Bước 2**.
