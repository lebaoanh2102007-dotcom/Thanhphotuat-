# Thành Phố Tuất RP — Alpha 0.2

Bổ sung frontend 3D cho server Node.js + Socket.IO hiện có.

## Chạy thử trên máy tính
1. Cài Node.js 18 trở lên.
2. Mở Terminal trong thư mục dự án.
3. Chạy `npm install`.
4. Chạy `npm start`.
5. Mở `http://localhost:3000`.

## Đưa lên Render
1. Đẩy toàn bộ nội dung thư mục này lên GitHub, giữ nguyên `package.json` và `server.js`.
2. Trên Render chọn **New + → Web Service**, kết nối repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Deploy, đợi dịch vụ chạy rồi mở URL `https://...onrender.com`.

Socket.IO dùng kết nối WebSocket/polling cùng origin, nên không cần cấu hình URL máy chủ riêng.

## Điều khiển
- WASD: đi lại
- Shift: chạy
- Kéo chuột/màn hình: xoay camera
- Điện thoại/iPad: joystick và nút CHẠY
- Chat: nhập tin nhắn ở khung trò chuyện

## Lưu ý Alpha
- Cần internet để tải Three.js từ jsDelivr CDN.
- Server hiện tại lưu người chơi trong RAM; khởi động lại sẽ mất trạng thái.
- Chưa có tài khoản, database, phân quyền nghề nghiệp, kiểm duyệt chat, chống gian lận hoặc hệ thống kinh tế.
- Không dùng cho dữ liệu cá nhân hoặc giao dịch thật.
