import PDFDocument from "pdfkit";

export function generateInvoicePdf(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Try to load Arial font from Windows, fallback to Helvetica
      let fontBold = "Helvetica-Bold";
      let fontNormal = "Helvetica";
      try {
        doc.registerFont("Arial", "C:\\Windows\\Fonts\\arial.ttf");
        doc.registerFont("Arial-Bold", "C:\\Windows\\Fonts\\arialbd.ttf");
        fontBold = "Arial-Bold";
        fontNormal = "Arial";
      } catch (e) {
        console.warn("Could not load local Arial font, falling back to Helvetica");
      }

      // --- HEADER ---
      doc.font(fontBold).fontSize(14).fillColor("#1e293b").text("CONG TY CO PHAN BIZZI VIET NAM", 50, 50);
      doc.font(fontNormal).fontSize(9).fillColor("#64748b")
        .text("Bizzi Vietnam Joint Stock Company")
        .text("Address: Tang 3, Toa nha H3, 384 Hoang Dieu, Phuong 6, Quan 4, TP. HCM")
        .text("Tax Code / MST: 0316086256")
        .text("Email: support@bizzi.vn");

      // Title & Status
      doc.font(fontBold).fontSize(16).fillColor("#0f172a").text("HOA DON GIA TRI GIA TANG", 330, 50, { align: "right" });
      doc.font(fontNormal).fontSize(11).fillColor("#475569").text("VAT INVOICE", 330, 70, { align: "right" });

      // Invoice status badge
      const statusColors: Record<string, string> = {
        DRAFT: "#eab308", // Yellow
        ISSUED: "#22c55e", // Green
        CANCELED: "#ef4444", // Red
        REPLACED: "#3b82f6", // Blue
      };
      const status = invoice.status || "DRAFT";
      doc.roundedRect(480, 90, 65, 18, 3)
        .fill(statusColors[status] || "#64748b");
      doc.fillColor("#ffffff").font(fontBold).fontSize(8).text(status, 480, 95, { width: 65, align: "center" });

      // Info Block
      doc.moveTo(50, 125).lineTo(545, 125).stroke("#cbd5e1");

      const infoY = 135;
      doc.font(fontBold).fontSize(9).fillColor("#1e293b")
        .text("So Hoa Don / Invoice No:", 50, infoY)
        .text("Ngay ky / Date:", 50, infoY + 15)
        .text("Hinh thuc thanh toan / Payment:", 50, infoY + 30);

      const issueDateStr = invoice.issueDate
        ? new Date(invoice.issueDate).toLocaleDateString("vi-VN")
        : "N/A";

      doc.font(fontNormal).fontSize(9).fillColor("#334155")
        .text(invoice.invoiceNumber || "N/A (DRAFT)", 180, infoY)
        .text(issueDateStr, 180, infoY + 15)
        .text(invoice.paymentMethod || "CK", 180, infoY + 30);

      // --- CUSTOMER DETAILS ---
      doc.font(fontBold).fontSize(10).fillColor("#1e293b").text("DON VI MUA HANG / CUSTOMER INFO", 50, 195);
      doc.moveTo(50, 210).lineTo(545, 210).stroke("#cbd5e1");

      const custY = 215;
      doc.font(fontBold).fontSize(9).fillColor("#475569")
        .text("Ten Khach Hang / Customer Name:", 50, custY)
        .text("Ma So Thue / Tax Code:", 50, custY + 15)
        .text("Dia Chi / Address:", 50, custY + 30)
        .text("Email:", 50, custY + 45);

      doc.font(fontNormal).fontSize(9).fillColor("#0f172a")
        .text(invoice.customerName, 210, custY)
        .text(invoice.customerTaxCode || "N/A", 210, custY + 15)
        .text(invoice.customerAddress || "N/A", 210, custY + 30)
        .text(invoice.customerEmail || "N/A", 210, custY + 45);

      // --- TABLE ITEMS ---
      const tableY = 295;
      // Header Background
      doc.rect(50, tableY, 495, 22).fill("#1e293b");

      // Header Texts
      doc.fillColor("#ffffff").font(fontBold).fontSize(8);
      doc.text("STT\nNo", 55, tableY + 3, { width: 30, align: "center" });
      doc.text("Ten hang hoa, dich vu\nDescription", 90, tableY + 3, { width: 200 });
      doc.text("So luong\nQty", 300, tableY + 3, { width: 50, align: "right" });
      doc.text("Don gia\nUnit Price", 360, tableY + 3, { width: 80, align: "right" });
      doc.text("Thanh tien\nAmount", 450, tableY + 3, { width: 90, align: "right" });

      let currentY = tableY + 22;
      doc.font(fontNormal).fontSize(9).fillColor("#0f172a");

      const items = invoice.items || [];
      items.forEach((item: any, idx: number) => {
        // Draw bottom line for each row
        doc.moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke("#e2e8f0");

        doc.text(String(idx + 1), 55, currentY + 6, { width: 30, align: "center" });
        doc.text(item.description, 90, currentY + 6, { width: 200 });
        doc.text(String(item.quantity), 300, currentY + 6, { width: 50, align: "right" });
        doc.text(Number(item.unitPrice).toLocaleString("vi-VN"), 360, currentY + 6, { width: 80, align: "right" });
        doc.text(Number(item.amount).toLocaleString("vi-VN"), 450, currentY + 6, { width: 90, align: "right" });

        currentY += 20;
      });

      // --- TOTALS SECTION ---
      currentY += 15;
      doc.font(fontBold).fontSize(9).fillColor("#475569");
      doc.text("Cong tien hang / Subtotal:", 250, currentY, { width: 190, align: "right" });
      doc.text(`Thue suat VAT / Tax Rate (${(Number(invoice.taxRate) * 100).toFixed(0)}%):`, 250, currentY + 15, { width: 190, align: "right" });
      doc.text("Tien thue VAT / Tax Amount:", 250, currentY + 30, { width: 190, align: "right" });
      doc.text("Tong cong thanh toan / Grand Total:", 250, currentY + 45, { width: 190, align: "right" });

      doc.font(fontNormal).fontSize(9).fillColor("#0f172a");
      doc.text(Number(invoice.subTotal).toLocaleString("vi-VN"), 450, currentY, { width: 90, align: "right" });
      doc.text(Number(invoice.taxAmount).toLocaleString("vi-VN"), 450, currentY + 15, { width: 90, align: "right" });
      doc.text(Number(invoice.taxAmount).toLocaleString("vi-VN"), 450, currentY + 30, { width: 90, align: "right" });

      doc.font(fontBold).fontSize(10).fillColor("#0f172a");
      doc.text(Number(invoice.amount).toLocaleString("vi-VN"), 450, currentY + 45, { width: 90, align: "right" });

      // --- REFERENCE INFO FOR REPLACED INVOICES ---
      if (invoice.referenceInvoice) {
        currentY += 80;
        doc.roundedRect(50, currentY, 495, 35, 4).fill("#f1f5f9");
        doc.fillColor("#1e3a8a").font(fontBold).fontSize(8)
          .text(`* Thay the cho hoa don cu: So ${invoice.referenceInvoice.invoiceNumber || "N/A"} ky ngay ${new Date(invoice.referenceInvoice.issueDate).toLocaleDateString("vi-VN")}`, 60, currentY + 8)
          .font(fontNormal)
          .text(`(Replaced original invoice No ${invoice.referenceInvoice.invoiceNumber || "N/A"} issued on ${new Date(invoice.referenceInvoice.issueDate).toLocaleDateString("vi-VN")})`, 60, currentY + 20);
      }

      // --- WATERMARK FOR CANCELED/REPLACED ---
      if (status === "CANCELED" || status === "REPLACED") {
        doc.save();
        doc.opacity(0.1);
        doc.font(fontBold).fontSize(60).fillColor("#ef4444");
        doc.translate(300, 400);
        doc.rotate(-30);
        doc.text(status, -200, 0, { width: 400, align: "center" });
        doc.restore();
      }

      // --- FOOTER SIGNATURES ---
      const footerY = 700;
      doc.font(fontBold).fontSize(8).fillColor("#475569");
      doc.text("NGUOI MUA HANG\n(Buyer)", 80, footerY, { align: "center", width: 150 });
      doc.text("NGUOI BAN HANG\n(Seller)", 370, footerY, { align: "center", width: 150 });

      doc.font(fontNormal).fontSize(7).fillColor("#64748b");
      doc.text("(Ky, ghi ro ho ten)\n(Signature & Name)", 80, footerY + 20, { align: "center", width: 150 });
      doc.text("(Ky, dong dau, ghi ro ho ten)\n(Signature, Stamp & Name)", 370, footerY + 20, { align: "center", width: 150 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
