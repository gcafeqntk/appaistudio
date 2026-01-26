# HƯỚNG DẪN: THÊM TAB ỨNG DỤNG MỚI (MULTI-APP SYSTEM)

Bạn hoàn toàn có thể làm được điều này! Để biến "App Huy" hiện tại thành một "Siêu ứng dụng" chứa nhiều tool nhỏ (mỗi tool là 1 Tab), chúng ta sẽ thực hiện theo kiến trúc **"Shell & Modules"**.

## 1. Kiến trúc thay đổi như thế nào?

Hiện tại, file `App.tsx` của bạn đang làm quá nhiều việc: vừa quản lý đăng nhập, vừa chứa logic của Tool Video, vừa hiển thị giao diện.

Chúng ta sẽ chia lại như sau:

*   **`App.tsx` (Mới)**: Chỉ làm nhiệm vụ "Cái vỏ" (Shell).
    *   Giữ trạng thái Đăng nhập/Đăng xuất.
    *   Hiển thị **Thanh Tab Menu** (Ngang).
    *   Quyết định xem đang chọn Tab nào thì hiện Tool đó.
*   **`apps/VideoViralApp.tsx`**: Toàn bộ code logic quay video/script hiện tại sẽ được cắt sang đây.
*   **`apps/NewToolApp.tsx`**: Đây là nơi bạn viết ứng dụng mới.

## 2. Các bước thực hiện chi tiết

### Bước 1: Quy hoạch thư mục
Tạo thư mục mới để chứa các "App con":
`d:/AppHuy/appaistudio/apps/`

### Bước 2: Tách "App Cũ" ra riêng
Ta sẽ copy toàn bộ nội dung chính của `App.tsx` hiện tại (trừ phần Auth) và đưa vào file mới:
`d:/AppHuy/appaistudio/apps/VideoViralApp.tsx`

*Lưu ý: Các hàm `handleAnalyze`, `handleGenerateIdeas`... và state liên quan sẽ đi theo file này.*

### Bước 3: Tạo khung cho "App Mới"
Tạo file `d:/AppHuy/appaistudio/apps/NewToolApp.tsx` đơn giản trước:
```tsx
import React from 'react';

const NewToolApp = () => {
  return (
    <div className="p-10 text-white">
      <h1>Đây là Tool Mới</h1>
      <p>Bạn có thể code bất cứ tính năng gì ở đây...</p>
    </div>
  );
};
export default NewToolApp;
```

### Bước 4: Viết lại `App.tsx` (Làm bộ điều hướng)
File `App.tsx` bây giờ sẽ gọn gàng hơn nhiều, có thêm thanh Tab:

```tsx
// ... imports
import VideoViralApp from './apps/VideoViralApp';
import NewToolApp from './apps/NewToolApp';

const App = () => {
  const [activeTab, setActiveTab] = useState('video-viral'); // Mặc định mở tool cũ

  // ... (Giữ lại logic Auth & ApiKeyManager ở đây để dùng chung cho tất cả App)

  return (
    <div className="min-h-screen bg-slate-50">
       <ApiKeyManager ... />
       
       {/* MENU TAB NGANG */}
       <div className="bg-[#020617] border-b border-white/10 px-6 py-4 flex gap-4">
          <button 
             onClick={() => setActiveTab('video-viral')}
             className={`px-4 py-2 rounded-lg ${activeTab === 'video-viral' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
             Video Viral Engine
          </button>
          
          <button 
             onClick={() => setActiveTab('new-tool')}
             className={`px-4 py-2 rounded-lg ${activeTab === 'new-tool' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
             Tool Mới Của Bạn
          </button>
       </div>

       {/* KHUVỰC HIỂN THỊ TOOL */}
       <div className="content-area">
          {activeTab === 'video-viral' && <VideoViralApp />}
          {activeTab === 'new-tool' && <NewToolApp />}
       </div>
    </div>
  )
}
```

## 3. Lợi ích
1.  **Độc lập**: Code của App mới không bao giờ làm hỏng App cũ vì chúng nằm ở 2 file khác nhau.
2.  **Dùng chung tài nguyên**: Cả 2 App đều được hưởng lợi từ hệ thống Login và ApiKeyManager mà không cần viết lại.
3.  **Dễ mở rộng**: Sau này muốn thêm Tab thứ 3, 4, 5... chỉ cần tạo file mới và thêm 1 dòng vào `App.tsx`.

---
**Bạn có muốn tôi tiến hành thực hiện việc "Tách File" và "Tạo Tab" này ngay bây giờ không?**
