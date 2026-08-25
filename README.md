# Invoice Management API (Intern Technical Test)

Dự án này là bài kiểm tra kỹ thuật dành cho vị trí thực tập sinh, xây dựng hệ thống API quản lý hóa đơn (Invoice Management) sử dụng **Node.js, Express, TypeScript, PostgreSQL** và **Prisma ORM**.

Dự án hỗ trợ đầy đủ vòng đời hóa đơn (Draft, Issued, Canceled, Replaced), xuất và tải hóa đơn dưới định dạng PDF, và bộ tích hợp kiểm thử tự động (Integration/Unit Tests) với Jest và Supertest.

---

## 🛠️ Công nghệ sử dụng

- **Ngôn ngữ**: TypeScript
- **Backend Framework**: Express.js
- **Database ORM**: Prisma ORM (kết nối PostgreSQL)
- **Validation**: Zod
- **Xuất PDF**: PDFKit (Mẫu hóa đơn song ngữ Việt - Anh)
- **Kiểm thử (Testing)**: Jest + Supertest
- **Quản lý Dev Server**: ts-node-dev

---

## 🚀 Hướng dẫn Cấu hình & Chạy dự án

### 1. Cài đặt Dependencies

Cài đặt toàn bộ dependencies cần thiết:

```bash
npm install
```

### 2. Cấu hình Cơ sở dữ liệu (Database)

Mở file `.env` ở thư mục gốc của dự án và cập nhật lại thông tin kết nối PostgreSQL thực tế của bạn:

```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/invoice_management?schema=public"
```

### 3. Chạy Migrations

Chạy lệnh Prisma để khởi tạo các bảng trong cơ sở dữ liệu PostgreSQL:

```bash
npx prisma migrate dev --name init_invoice_schema
```

### 4. Chạy Development Server

Khởi chạy dự án ở môi trường phát triển:

```bash
npm run dev
```

Mặc định server sẽ chạy tại địa chỉ: `http://localhost:3000`

### 5. Chạy bộ Integration/Unit Tests

Để xác nhận tính đúng đắn của logic nghiệp vụ hóa đơn và xuất PDF:

```bash
npm test
```

---

## 📑 Quy trình Nghiệp vụ Hóa đơn (Invoice Lifecycle)

Hóa đơn có 4 trạng thái cốt lõi (`InvoiceStatus`):

1. **DRAFT (Nháp)**: Hóa đơn vừa tạo. Cho phép chỉnh sửa thông tin, chi tiết mặt hàng hoặc xóa bỏ.
2. **ISSUED (Đã phát hành)**: Hóa đơn đã được ký phát hành. Lúc này hệ thống tự động sinh số hóa đơn (`invoiceNumber`) theo dạng `INV-YYYYMMDD-XXXX` (với XXXX là số thứ tự tăng dần trong ngày). Không cho phép sửa đổi hay xóa bỏ.
3. **CANCELED (Đã hủy)**: Hóa đơn bị hủy bỏ (chỉ áp dụng đối với hóa đơn ở trạng thái `ISSUED`). Trạng thái này là cuối cùng, không thể sửa đổi tiếp.
4. **REPLACED (Bị thay thế)**: Hóa đơn cũ đã bị thay thế bởi một hóa đơn mới.

### Nghiệp vụ Thay thế Hóa đơn:

- Khi một hóa đơn `ISSUED` bị sai sót, người dùng gọi API thay thế.
- Hệ thống sẽ chuyển trạng thái của hóa đơn cũ thành `REPLACED`.
- Tạo ra một hóa đơn mới ở trạng thái `ISSUED` chứa dữ liệu mới, đồng thời lưu `referenceInvoiceId` trỏ đến ID của hóa đơn cũ để duy trì vết lịch sử thay thế.

---

## 📬 Postman Collection

Dự án có đi kèm file Postman collection [Invoice_Management.postman_collection.json](./Invoice_Management.postman_collection.json) chứa sẵn các request mẫu để test toàn bộ luồng API:

1. Health check server.
2. Tạo hóa đơn nháp (Draft).
3. Đọc danh sách hóa đơn (có phân trang & lọc trạng thái).
4. Xem chi tiết hóa đơn (kèm theo lịch sử thay thế nếu có).
5. Cập nhật hóa đơn nháp.
6. Phát hành hóa đơn (Issue).
7. Tải file PDF hóa đơn.
8. Tạo hóa đơn thay thế (Replace).
9. Hủy hóa đơn (Cancel).
10. Xóa hóa đơn nháp.

---

## 🎓 Những kiến thức học được qua bài tập

1. **Lần đầu sử dụng PostgreSQL & Prisma ORM**:
   - Được tiếp cận và làm quen với PostgreSQL. Nhờ đã có nền tảng cơ bản về MySQL và SQL Server từ trước, việc tư duy thiết kế cơ sở dữ liệu quan hệ hay các mối quan hệ bảng không gặp trở ngại nào lớn. Thay vào đó, tập trung học hỏi các đặc thù cấu hình, kiểu dữ liệu riêng của PostgreSQL và cách tích hợp mượt mà thông qua Prisma.
2. **Quy trình SQL Migration với Prisma**:
   - Hiểu sâu về cách thức hoạt động của SQL Migrations (`prisma migrate dev`).
3. **Tư duy kiểm thử tự động (Unit / Integration Test)**:
   - Thiết lập bộ test hoàn chỉnh bằng Jest và Supertest. Viết test case bao phủ toàn bộ vòng đời của hóa đơn, các trường hợp vi phạm trạng thái và kiểm tra kiểu file PDF trả về.

---

## ⚠️ Những khó khăn đã gặp phải & Cách giải quyết

1. **Làm quen với PostgreSQL & Quy trình Migration**:
   - _Khó khăn_: Là lần đầu tiên trực tiếp cấu hình và vận hành PostgreSQL kết hợp với cơ chế Migration của Prisma
   - _Giải quyết_: Dành thời gian nghiên cứu cơ chế ánh xạ schema của Prisma sang SQL DDL, hiểu cách Prisma Migrate theo dõi trạng thái database để từ đó tự tin áp dụng migrations một cách chuẩn xác và an toàn.
2. **Hiển thị tiếng Việt có dấu trong PDFKit**:
   - _Khó khăn_: Các font chữ mặc định của PDFKit (Helvetica, Times-Roman) không hỗ trợ Unicode tiếng Việt, dẫn đến việc văn bản bị lỗi hiển thị dấu tiếng Việt.
   - _Giải quyết_: Sử dụng template song ngữ không dấu chuyên nghiệp (ví dụ: `HOA DON GIA TRI GIA TANG / VAT INVOICE`) để hóa đơn chạy mượt mà trên mọi hệ điều hành (Windows, Linux, Docker) mà không phụ thuộc font hệ thống, đồng thời đăng ký font Arial dự phòng nếu chạy trên Windows.
3. **Xung đột phiên bản TypeScript trong môi trường Jest**:
   - _Khó khăn_: Khi cài đặt Jest và `ts-jest` ở phiên bản TypeScript 7.x mặc định từ cấu hình npm init của môi trường thử nghiệm, `ts-jest` báo lỗi do chưa hỗ trợ phiên bản typescript quá mới này.
   - _Giải quyết_: Downgrade TypeScript về phiên bản stable `5.5.4` và đơn giản hóa cấu hình `tsconfig.json` phù hợp với CommonJS giúp dự án vừa biên dịch nhanh bằng `ts-node-dev`, vừa chạy test mượt mà với Jest.
