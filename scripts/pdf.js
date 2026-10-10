/**
 * Mess Management System - PDF & Reporting Engine
 * Provides instant printable views, Google Drive Cloud PDF generation, and WhatsApp summary generator
 */

const MessReportService = {
  /**
   * Generates formatted text for Mess WhatsApp Messenger Group
   */
  generateWhatsAppSummary(data, messName, currency = "BDT") {
    let text = `📢 *${messName} - মেস হিসাব সামারি* 📊\n`;
    text += `🗓️ *মাস:* ${data.month}\n`;
    text += `────────────────────\n`;
    text += `🍲 মোট খাবার খরচ: *${currency} ${data.totalFoodExpense.toFixed(2)}*\n`;
    text += `💡 মোট কমন/অন্যান্য খরচ: *${currency} ${data.totalGeneralExpense.toFixed(2)}*\n`;
    text += `🛒 সর্বমোট মেস খরচ: *${currency} ${data.totalMessExpense.toFixed(2)}*\n`;
    text += `💰 মোট সংগৃহীত জমা: *${currency} ${data.totalMoneyCollected.toFixed(2)}*\n`;
    text += `💵 ক্যাশ ইন হ্যান্ড (অবশিষ্ট): *${currency} ${data.cashInHand.toFixed(2)}*\n`;
    text += `────────────────────\n`;
    text += `👥 *সদস্যভিত্তিক হিসাব:* \n`;

    data.memberBills.forEach((m, idx) => {
      const status = m.due > 0 ? `🚨 বাকি: ${currency} ${m.due.toFixed(2)}` : `✅ উদ্বৃত্ত: ${currency} ${m.overpaid.toFixed(2)}`;
      text += `${idx + 1}. *${m.name}* -> মিল: ${currency} ${m.foodShare.toFixed(2)} | বিল: ${currency} ${m.totalBill.toFixed(2)} | জমা: ${currency} ${m.totalPaid.toFixed(2)} [${status}]\n`;
    });

    text += `────────────────────\n`;
    text += `_স্বয়ংক্রিয়ভাবে জেনারেটকৃত মেস হিসাব খাতা_ 📱`;
    return text;
  },

  /**
   * Open Printable Report Modal
   */
  openPrintReport(type, data, messName, memberUserId = null) {
    let contentHtml = "";

    if (type === "MEMBER" && memberUserId) {
      const mem = data.memberBills.find(m => m.userId === memberUserId);
      if (!mem) return alert("সদস্য পাওয়া যায়নি!");
      contentHtml = this.buildMemberHtml(mem, data, messName);
    } else {
      contentHtml = this.buildFullMessHtml(data, messName);
    }

    const container = document.getElementById("printReportContainer");
    if (container) {
      container.innerHTML = contentHtml;
      document.getElementById("reportPrintModal").classList.add("active");
    }
  },

  buildFullMessHtml(data, messName) {
    let rows = "";
    data.memberBills.forEach((m, i) => {
      const dueStr = m.due > 0 
        ? `<span class="badge-due">বকেয়া: ৳ ${m.due.toFixed(2)}</span>`
        : `<span class="badge-overpaid">ফেরত: ৳ ${m.overpaid.toFixed(2)}</span>`;

      rows += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${m.name}</strong></td>
          <td>${m.joinDate || "-"}</td>
          <td>৳ ${m.foodShare.toFixed(2)}</td>
          <td>৳ ${m.generalShare.toFixed(2)}</td>
          <td><strong>৳ ${m.totalBill.toFixed(2)}</strong></td>
          <td>৳ ${m.totalPaid.toFixed(2)}</td>
          <td>${dueStr}</td>
        </tr>
      `;
    });

    return `
      <div class="print-paper">
        <div class="print-header">
          <h2>${messName}</h2>
          <p>মাসিক মেস হিসাব বিবরণী | মাস: ${data.month} | তারিখ: ${data.todayDate}</p>
        </div>
        
        <div class="print-summary-grid">
          <div class="p-card"><span>মোট খাবার খরচ</span><strong>৳ ${data.totalFoodExpense.toFixed(2)}</strong></div>
          <div class="p-card"><span>মোট কমন খরচ</span><strong>৳ ${data.totalGeneralExpense.toFixed(2)}</strong></div>
          <div class="p-card"><span>সর্বমোট মেস খরচ</span><strong>৳ ${data.totalMessExpense.toFixed(2)}</strong></div>
          <div class="p-card"><span>মোট জমা টাকা</span><strong>৳ ${data.totalMoneyCollected.toFixed(2)}</strong></div>
          <div class="p-card highlight"><span>ক্যাশ ইন হ্যান্ড</span><strong>৳ ${data.cashInHand.toFixed(2)}</strong></div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>সদস্যের নাম</th>
              <th>যোগদানের তারিখ</th>
              <th>খাবার ভাগ</th>
              <th>কমন ভাগ</th>
              <th>মোট বিল</th>
              <th>মোট জমা</th>
              <th>বর্তমান অবস্থা</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="print-footer">
          <p>মেস ম্যানেজমেন্ট সিস্টেম দ্বারা প্রস্তুতকৃত অফিসিয়াল হিসাব শিট।</p>
        </div>
      </div>
    `;
  },

  buildMemberHtml(m, data, messName) {
    const dueStr = m.due > 0 
      ? `<span class="badge-due" style="font-size:18px;">বকেয়া প্রদেয়: ৳ ${m.due.toFixed(2)}</span>`
      : `<span class="badge-overpaid" style="font-size:18px;">উদ্বৃত্ত / ফেরত প্রাপ্য: ৳ ${m.overpaid.toFixed(2)}</span>`;

    return `
      <div class="print-paper">
        <div class="print-header">
          <h2>${messName}</h2>
          <p>সদস্যের ব্যক্তিগত মিল ও খরচের স্লিপ | মাস: ${data.month}</p>
        </div>

        <div style="margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 8px; padding: 15px;">
          <h3 style="margin-top:0; color:#0F172A;">${m.name}</h3>
          <p style="margin:4px 0; color:#64748B;">যোগদানের তারিখ: ${m.joinDate || "মাসের শুরু"}</p>
          <hr style="border:none; border-top:1px solid #E2E8F0; margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0;"><span>খাবার খরচের অংশ (Food Share):</span><strong>৳ ${m.foodShare.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;"><span>কমন খরচের অংশ (General Share):</span><strong>৳ ${m.generalShare.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:2px solid #0F172A; font-size:16px;"><span>সর্বমোট হিসাবকৃত বিল:</span><strong>৳ ${m.totalBill.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;"><span>মোট জমা দিয়েছেন:</span><strong>৳ ${m.totalPaid.toFixed(2)}</strong></div>
          <div style="text-align:center; margin-top:20px; padding:15px; background:#F8FAFC; border-radius:8px;">
            ${dueStr}
          </div>
        </div>

        <div class="print-footer">
          <p>সাক্ষর: মেস ম্যানেজার / কোষাধ্যক্ষ</p>
        </div>
      </div>
    `;
  }
};
