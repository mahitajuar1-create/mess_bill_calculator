/**
 * Mess Management System - Main UI Application Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  await MessApp.init();
});

const MessApp = {
  state: null,
  activeSection: "dashboard",
  selectedParticipants: new Set(),
  activeVoucherBase64: null,

  async init() {
    MESS_AUTH.init();
    await MESS_API.init();
    this.state = MESS_API.state;

    this.bindEvents();
    this.updateTopbar();
    this.renderActiveSection();
    this.initParticipantChecklist();
  },

  updateTopbar() {
    const user = MESS_AUTH.getCurrentUser();
    const currentMess = this.state.messes[0] || { messName: "জালালাবাদ মেস", messCode: "MESS-DEMO" };

    const messBadge = document.getElementById("topbarMessName");
    if (messBadge) messBadge.textContent = currentMess.messName;

    const monthBadge = document.getElementById("topbarMonth");
    if (monthBadge) monthBadge.textContent = MESS_CONFIG.currentMonth;

    const userNameEl = document.getElementById("topbarUserName");
    if (userNameEl && user) userNameEl.textContent = user.name;

    const roleBadge = document.getElementById("topbarUserRole");
    if (roleBadge && user) roleBadge.textContent = user.role;
  },

  bindEvents() {
    // Navigation clicks
    document.querySelectorAll("[data-nav]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const target = el.getAttribute("data-nav");
        this.navigateTo(target);
      });
    });

    // Primary Action Buttons
    document.getElementById("btnPrimaryShopping")?.addEventListener("click", () => this.openAddShoppingModal());
    document.getElementById("btnPrimaryMoney")?.addEventListener("click", () => this.openAddPaymentModal());

    // Shopping form participant math listener
    const amountInput = document.getElementById("shopAmount");
    amountInput?.addEventListener("input", () => this.updateSharePreview());

    // Voucher file input
    const voucherInput = document.getElementById("shopVoucherFile");
    voucherInput?.addEventListener("change", (e) => this.handleVoucherSelect(e));

    // Form submissions
    document.getElementById("formAddShopping")?.addEventListener("submit", (e) => this.handleSaveShopping(e));
    document.getElementById("formAddPayment")?.addEventListener("submit", (e) => this.handleSavePayment(e));
    document.getElementById("formVoidTx")?.addEventListener("submit", (e) => this.handleConfirmVoid(e));
    document.getElementById("formSettings")?.addEventListener("submit", (e) => this.handleSaveSettings(e));
    document.getElementById("formCreateMess")?.addEventListener("submit", (e) => this.handleCreateMess(e));
    document.getElementById("formJoinMess")?.addEventListener("submit", (e) => this.handleJoinMess(e));

    // Search & Filter listeners
    document.getElementById("shopSearchInput")?.addEventListener("input", () => this.renderShoppingTable());
    document.getElementById("shopFilterType")?.addEventListener("change", () => this.renderShoppingTable());
    document.getElementById("shopFilterStatus")?.addEventListener("change", () => this.renderShoppingTable());
    document.getElementById("shopSortBy")?.addEventListener("change", () => this.renderShoppingTable());

    // Payments filter
    document.getElementById("paySearchInput")?.addEventListener("input", () => this.renderPaymentsTable());

    // Participant Select All / Deselect All
    document.getElementById("btnSelectAllParticipants")?.addEventListener("click", () => {
      this.state.members.filter(m => m.status === "ACTIVE").forEach(m => this.selectedParticipants.add(m.userId));
      this.refreshParticipantChecklist();
      this.updateSharePreview();
    });

    document.getElementById("btnDeselectAllParticipants")?.addEventListener("click", () => {
      this.selectedParticipants.clear();
      this.refreshParticipantChecklist();
      this.updateSharePreview();
    });

    // Modal Close buttons
    document.querySelectorAll(".modal-close-btn, [data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
      });
    });

    // WhatsApp Summary copy
    document.getElementById("btnCopyWhatsAppSummary")?.addEventListener("click", () => {
      const currentMess = this.state.messes[0]?.messName || "মেস";
      const calc = MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
      const text = MessReportService.generateWhatsAppSummary(calc, currentMess);
      navigator.clipboard.writeText(text).then(() => {
        this.showToast("হোয়াটসঅ্যাপ সামারি কপি করা হয়েছে!", "success");
      });
    });

    // Print Report
    document.getElementById("btnTriggerPrint")?.addEventListener("click", () => {
      window.print();
    });
  },

  navigateTo(sectionId) {
    this.activeSection = sectionId;

    // Update active nav links
    document.querySelectorAll("[data-nav]").forEach(link => {
      if (link.getAttribute("data-nav") === sectionId) link.classList.add("active");
      else link.classList.remove("active");
    });

    // Hide all sections
    document.querySelectorAll(".section-view").forEach(view => {
      view.style.display = "none";
    });

    // Show active section
    const targetEl = document.getElementById(`section-${sectionId}`);
    if (targetEl) targetEl.style.display = "block";

    this.renderActiveSection();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  renderActiveSection() {
    switch (this.activeSection) {
      case "dashboard":
        this.renderDashboard();
        break;
      case "shopping":
        this.renderShoppingTable();
        break;
      case "money":
        this.renderPaymentsTable();
        break;
      case "members":
        this.renderMembersTable();
        break;
      case "bills":
        this.renderMonthlyBills();
        break;
      case "reports":
        this.renderReportsView();
        break;
      case "pdf":
        this.renderPdfView();
        break;
      case "audit":
        this.renderAuditLogs();
        break;
      case "settings":
        this.renderSettingsView();
        break;
      case "profile":
        this.renderProfileView();
        break;
    }
  },

  renderDashboard() {
    const calc = MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
    const user = MESS_AUTH.getCurrentUser();
    const myBill = calc.memberBills.find(b => b.userId === user?.userId) || {};

    // Update KPI cards
    document.getElementById("kpiFoodTotal").textContent = MessCalculator.formatCurrency(calc.totalFoodExpense);
    document.getElementById("kpiGeneralTotal").textContent = MessCalculator.formatCurrency(calc.totalGeneralExpense);
    document.getElementById("kpiMessTotal").textContent = MessCalculator.formatCurrency(calc.totalMessExpense);
    document.getElementById("kpiCollectedTotal").textContent = MessCalculator.formatCurrency(calc.totalMoneyCollected);
    document.getElementById("kpiCashInHand").textContent = MessCalculator.formatCurrency(calc.cashInHand);

    // My Personal status card
    const myTotalEl = document.getElementById("dashMyTotalBill");
    if (myTotalEl) myTotalEl.textContent = MessCalculator.formatCurrency(myBill.totalBill || 0);

    const myPaidEl = document.getElementById("dashMyPaid");
    if (myPaidEl) myPaidEl.textContent = MessCalculator.formatCurrency(myBill.totalPaid || 0);

    const myDueEl = document.getElementById("dashMyDue");
    if (myDueEl) {
      if ((myBill.due || 0) > 0) {
        myDueEl.textContent = `বকেয়া: ${MessCalculator.formatCurrency(myBill.due)}`;
        myDueEl.style.color = "var(--danger)";
      } else {
        myDueEl.textContent = `উদ্বৃত্ত / ফেরত: ${MessCalculator.formatCurrency(myBill.overpaid || 0)}`;
        myDueEl.style.color = "var(--success)";
      }
    }

    // Bill Till Today stats
    const tillTodayEl = document.getElementById("dashTillTodayBill");
    if (tillTodayEl) tillTodayEl.textContent = MessCalculator.formatCurrency(myBill.tillTodayTotal || 0);

    // Recent Shopping preview
    const recentShopContainer = document.getElementById("dashRecentShopping");
    if (recentShopContainer) {
      const recent = (this.state.shopping || []).slice(0, 5);
      recentShopContainer.innerHTML = recent.map(tx => `
        <div class="m-tx-card ${tx.status === 'VOID' ? 'voided' : ''}">
          <div class="m-tx-header">
            <div>
              <strong>${tx.itemDescription}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${tx.shopVendor || 'দোকান'} | ${tx.originalDate} ${tx.originalTime}</div>
            </div>
            <div class="m-tx-amount">৳ ${tx.amount.toFixed(2)}</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span>ক্রেতা: <strong>${tx.paidByName}</strong></span>
            <span class="badge ${tx.expenseType === 'Food' ? 'badge-food' : 'badge-general'}">${tx.expenseType === 'Food' ? 'খাবার' : 'কমন'}</span>
          </div>
        </div>
      `).join("") || "<p style='color:var(--text-muted); padding:10px;'>কোনো এন্ট্রি নেই।</p>";
    }
  },

  renderShoppingTable() {
    const search = document.getElementById("shopSearchInput")?.value.toLowerCase() || "";
    const typeFilter = document.getElementById("shopFilterType")?.value || "ALL";
    const statusFilter = document.getElementById("shopFilterStatus")?.value || "ALL";
    const sortBy = document.getElementById("shopSortBy")?.value || "NEWEST";

    let list = [...(this.state.shopping || [])].filter(s => s.month === MESS_CONFIG.currentMonth);

    // Filter
    list = list.filter(tx => {
      const matchSearch = tx.itemDescription.toLowerCase().includes(search) ||
                          tx.shopVendor.toLowerCase().includes(search) ||
                          tx.paidByName.toLowerCase().includes(search) ||
                          tx.transactionId.toLowerCase().includes(search);
      const matchType = (typeFilter === "ALL") || (tx.expenseType === typeFilter);
      const matchStatus = (statusFilter === "ALL") || (tx.status === statusFilter);
      return matchSearch && matchType && matchStatus;
    });

    // Sort
    if (sortBy === "NEWEST") list.sort((a, b) => (b.createdTimestamp || "").localeCompare(a.createdTimestamp || ""));
    else if (sortBy === "OLDEST") list.sort((a, b) => (a.createdTimestamp || "").localeCompare(b.createdTimestamp || ""));
    else if (sortBy === "HIGHEST") list.sort((a, b) => b.amount - a.amount);
    else if (sortBy === "LOWEST") list.sort((a, b) => a.amount - b.amount);

    const tbody = document.getElementById("shoppingTableBody");
    const mobileList = document.getElementById("shoppingMobileList");

    if (tbody) {
      tbody.innerHTML = list.map(tx => {
        const isVoid = tx.status === "VOID";
        const voucherBtn = tx.voucherFileId 
          ? `<button class="btn btn-secondary btn-sm" onclick="MessApp.viewVoucher('${tx.transactionId}')">ভাউচার দেখুন</button>`
          : `<span style="color:var(--text-light); font-size:11px;">নেই</span>`;

        const voidAction = isVoid
          ? `<span class="badge badge-void" title="${tx.voidReason || ''}">বাতিল</span>`
          : `<button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger-light);" onclick="MessApp.openVoidModal('${tx.transactionId}')">Void</button>`;

        return `
          <tr class="${isVoid ? 'row-void' : ''}">
            <td><code>${tx.transactionId}</code></td>
            <td>${tx.originalDate} <br><small style="color:var(--text-light);">${tx.originalTime}</small></td>
            <td><span class="badge ${tx.expenseType === 'Food' ? 'badge-food' : 'badge-general'}">${tx.expenseType === 'Food' ? 'খাবার' : 'কমন'}</span></td>
            <td><strong>${tx.itemDescription}</strong><br><small style="color:var(--text-muted);">${tx.shopVendor || ''}</small></td>
            <td><strong>৳ ${tx.amount.toFixed(2)}</strong></td>
            <td>${tx.paidByName}</td>
            <td><span title="${(tx.participants || []).map(p => p.name).join(', ')}">${tx.participantCount} জন</span></td>
            <td>${voucherBtn}</td>
            <td>${voidAction}</td>
          </tr>
        `;
      }).join("") || `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">কোনো কেনাকাটার রেকর্ড পাওয়া যায়নি।</td></tr>`;
    }

    if (mobileList) {
      mobileList.innerHTML = list.map(tx => {
        const isVoid = tx.status === "VOID";
        return `
          <div class="m-tx-card ${isVoid ? 'voided' : ''}">
            <div class="m-tx-header">
              <div>
                <strong>${tx.itemDescription}</strong>
                <div style="font-size:11px; color:var(--text-muted);">${tx.transactionId} | ${tx.originalDate} ${tx.originalTime}</div>
              </div>
              <div class="m-tx-amount">৳ ${tx.amount.toFixed(2)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-top:8px;">
              <span>দোকান: ${tx.shopVendor || 'লোকাল'} | ক্রেতা: <strong>${tx.paidByName}</strong></span>
              <span class="badge ${tx.expenseType === 'Food' ? 'badge-food' : 'badge-general'}">${tx.expenseType === 'Food' ? 'খাবার' : 'কমন'} (${tx.participantCount} জন)</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px solid rgba(0,0,0,0.05); padding-top:8px;">
              ${tx.voucherFileId ? `<button class="btn btn-secondary btn-sm" onclick="MessApp.viewVoucher('${tx.transactionId}')">ভাউচার</button>` : `<span></span>`}
              ${isVoid ? `<span class="badge badge-void">বাতিল</span>` : `<button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="MessApp.openVoidModal('${tx.transactionId}')">Void</button>`}
            </div>
          </div>
        `;
      }).join("") || `<p style="text-align:center; color:var(--text-muted); padding:20px;">কোনো শপিং রেকর্ড নেই।</p>`;
    }
  },

  renderPaymentsTable() {
    const search = document.getElementById("paySearchInput")?.value.toLowerCase() || "";
    let list = [...(this.state.payments || [])].filter(p => p.month === MESS_CONFIG.currentMonth);

    if (search) {
      list = list.filter(p => p.memberName.toLowerCase().includes(search) || p.paymentId.toLowerCase().includes(search));
    }

    const tbody = document.getElementById("paymentsTableBody");
    if (tbody) {
      tbody.innerHTML = list.map(p => {
        const isVoid = p.status === "VOID";
        return `
          <tr class="${isVoid ? 'row-void' : ''}">
            <td><code>${p.paymentId}</code></td>
            <td>${p.originalDate} <br><small style="color:var(--text-light);">${p.originalTime}</small></td>
            <td><strong>${p.memberName}</strong></td>
            <td><strong>৳ ${p.amount.toFixed(2)}</strong></td>
            <td><span class="badge badge-active">${p.paymentMethod}</span></td>
            <td>${p.reference || '-'}</td>
            <td>${isVoid ? `<span class="badge badge-void">বাতিল</span>` : `<span class="badge badge-active">সফল</span>`}</td>
          </tr>
        `;
      }).join("") || `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">কোনো জমা রেকর্ড পাওয়া যায়নি।</td></tr>`;
    }
  },

  renderMembersTable() {
    const calc = MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
    const tbody = document.getElementById("membersTableBody");
    if (tbody) {
      tbody.innerHTML = calc.memberBills.map(m => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.email || '-'}</td>
          <td>${m.phone || '-'}</td>
          <td><span class="badge ${m.role === 'ADMIN' ? 'badge-food' : 'badge-active'}">${m.role}</span></td>
          <td>${m.joinDate || '-'}</td>
          <td>${m.leaveDate || '-'}</td>
          <td>৳ ${m.totalBill.toFixed(2)}</td>
          <td>৳ ${m.totalPaid.toFixed(2)}</td>
          <td>
            ${m.due > 0 
              ? `<span class="badge badge-due">বকেয়া: ৳ ${m.due.toFixed(2)}</span>` 
              : `<span class="badge badge-overpaid">উদ্বৃত্ত: ৳ ${m.overpaid.toFixed(2)}</span>`}
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="MessReportService.openPrintReport('MEMBER', MessApp.getCalculation(), MessApp.getMessName(), '${m.userId}')">স্লিপ দেখুন</button>
          </td>
        </tr>
      }).join("");
    }
  },

  renderMonthlyBills() {
    const calc = MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
    const tbody = document.getElementById("monthlyBillsTableBody");
    if (tbody) {
      tbody.innerHTML = calc.memberBills.map(m => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>৳ ${m.foodShare.toFixed(2)}</td>
          <td>৳ ${m.generalShare.toFixed(2)}</td>
          <td><strong>৳ ${m.totalBill.toFixed(2)}</strong></td>
          <td>৳ ${m.totalPaid.toFixed(2)}</td>
          <td>
            ${m.due > 0 
              ? `<span class="badge badge-due">বকেয়া ৳ ${m.due.toFixed(2)}</span>` 
              : `<span class="badge badge-overpaid">ফেরত ৳ ${m.overpaid.toFixed(2)}</span>`}
          </td>
          <td><strong>৳ ${m.tillTodayTotal.toFixed(2)}</strong></td>
          <td>
            ${m.tillTodayDue > 0 
              ? `<span class="badge badge-due">আজ পর্যন্ত বকেয়া ৳ ${m.tillTodayDue.toFixed(2)}</span>` 
              : `<span class="badge badge-overpaid">আজ পর্যন্ত ফেরত ৳ ${m.tillTodayOverpaid.toFixed(2)}</span>`}
          </td>
        </tr>
      }).join("");
    }
  },

  renderReportsView() {
    const calc = MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
    document.getElementById("reportMessName").textContent = this.getMessName();
    document.getElementById("reportMonthName").textContent = MESS_CONFIG.currentMonth;
    document.getElementById("reportFoodTotal").textContent = MessCalculator.formatCurrency(calc.totalFoodExpense);
    document.getElementById("reportGeneralTotal").textContent = MessCalculator.formatCurrency(calc.totalGeneralExpense);
    document.getElementById("reportGrandTotal").textContent = MessCalculator.formatCurrency(calc.totalMessExpense);
    document.getElementById("reportCollected").textContent = MessCalculator.formatCurrency(calc.totalMoneyCollected);
    document.getElementById("reportCashInHand").textContent = MessCalculator.formatCurrency(calc.cashInHand);
  },

  renderPdfView() {
    const memberSelect = document.getElementById("pdfMemberSelect");
    if (memberSelect) {
      memberSelect.innerHTML = `<option value="">-- সম্পূর্ণ মেসের রিপোর্ট --</option>` +
        this.state.members.filter(m => m.status === "ACTIVE").map(m => `
          <option value="${m.userId}">${m.name} (ব্যক্তিগত স্লিপ)</option>
        `).join("");
    }
  },

  renderAuditLogs() {
    const container = document.getElementById("auditLogList");
    if (container) {
      const logs = this.state.auditLog || [];
      container.innerHTML = logs.map(l => `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
            <span><strong>${l.userName}</strong> (${l.action})</span>
            <span>${new Date(l.timestamp).toLocaleString()}</span>
          </div>
          <div style="font-size:13px; font-weight:600; margin-top:4px;">${l.reason || l.entity}</div>
          ${l.oldValue || l.newValue ? `<div style="font-size:11px; color:var(--text-light); margin-top:2px;">Old: ${l.oldValue} | New: ${l.newValue}</div>` : ''}
        </div>
      `).join("") || `<p style="color:var(--text-muted); padding:20px;">কোনো অডিট লগ রেকর্ড নেই।</p>`;
    }
  },

  renderSettingsView() {
    const urlInput = document.getElementById("settingsGasUrl");
    if (urlInput) urlInput.value = MESS_CONFIG.gasWebAppUrl;
  },

  renderProfileView() {
    const user = MESS_AUTH.getCurrentUser();
    if (user) {
      document.getElementById("profName").textContent = user.name;
      document.getElementById("profEmail").textContent = user.email;
      document.getElementById("profRole").textContent = user.role;
      document.getElementById("profMessCode").textContent = this.state.messes[0]?.messCode || "MESS-8X2K9";
    }
  },

  /* Modals and forms */
  openAddShoppingModal() {
    this.selectedParticipants.clear();
    // Default to all active members
    this.state.members.filter(m => m.status === "ACTIVE").forEach(m => this.selectedParticipants.add(m.userId));
    this.refreshParticipantChecklist();

    // Populate Shopper dropdown
    const paidBySelect = document.getElementById("shopPaidBy");
    if (paidBySelect) {
      paidBySelect.innerHTML = this.state.members.filter(m => m.status === "ACTIVE").map(m => `
        <option value="${m.userId}">${m.name}</option>
      `).join("");
    }

    document.getElementById("shopAmount").value = "";
    document.getElementById("shopItem").value = "";
    document.getElementById("shopVendor").value = "";
    document.getElementById("shopNotes").value = "";
    document.getElementById("voucherImgPreview").style.display = "none";
    this.activeVoucherBase64 = null;

    this.updateSharePreview();
    document.getElementById("modalAddShopping").classList.add("active");
  },

  initParticipantChecklist() {
    this.refreshParticipantChecklist();
  },

  refreshParticipantChecklist() {
    const container = document.getElementById("participantsContainer");
    if (!container) return;

    const activeMembers = this.state.members.filter(m => m.status === "ACTIVE");
    container.innerHTML = activeMembers.map(m => {
      const isChecked = this.selectedParticipants.has(m.userId) ? "checked" : "";
      return `
        <label class="p-item-row">
          <input type="checkbox" value="${m.userId}" ${isChecked} onchange="MessApp.toggleParticipant('${m.userId}')">
          <span>${m.name} (${m.role})</span>
        </label>
      `;
    }).join("");
  },

  toggleParticipant(userId) {
    if (this.selectedParticipants.has(userId)) this.selectedParticipants.delete(userId);
    else this.selectedParticipants.add(userId);
    this.updateSharePreview();
  },

  updateSharePreview() {
    const amount = parseFloat(document.getElementById("shopAmount")?.value) || 0;
    const count = this.selectedParticipants.size;
    const previewEl = document.getElementById("shopSharePreview");
    if (previewEl) {
      if (count === 0) {
        previewEl.textContent = "অনুগ্রহ করে কমপক্ষে ১ জন সদস্য নির্বাচন করুন।";
        previewEl.style.color = "var(--danger)";
      } else {
        const perPerson = amount / count;
        previewEl.textContent = `মোট অংশীদার: ${count} জন | প্রতি জনের অংশ: ৳ ${perPerson.toFixed(2)}`;
        previewEl.style.color = "var(--primary)";
      }
    }
  },

  handleVoucherSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.activeVoucherBase64 = event.target.result;
      const img = document.getElementById("voucherImgPreview");
      if (img) {
        img.src = this.activeVoucherBase64;
        img.style.display = "block";
      }
    };
    reader.readAsDataURL(file);
  },

  async handleSaveShopping(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("shopAmount").value);
    const item = document.getElementById("shopItem").value.trim();
    const expenseType = document.getElementById("shopExpenseType").value;
    const vendor = document.getElementById("shopVendor").value.trim();
    const paidByUserId = document.getElementById("shopPaidBy").value;
    const paidByName = this.state.members.find(m => m.userId === paidByUserId)?.name || "সদস্য";
    const notes = document.getElementById("shopNotes").value.trim();

    if (!amount || amount <= 0 || !item) {
      return alert("অনুগ্রহ করে সঠিক পরিমাণ এবং বিবরণ দিন।");
    }
    if (this.selectedParticipants.size === 0) {
      return alert("অনুগ্রহ করে কমপক্ষে একজন অংশীদার নির্বাচন করুন।");
    }

    const participants = Array.from(this.selectedParticipants).map(uId => ({
      userId: uId,
      name: this.state.members.find(m => m.userId === uId)?.name || ""
    }));

    const user = MESS_AUTH.getCurrentUser();
    const res = await MESS_API.callBackend("shopping/add", {
      messId: this.state.messes[0]?.messId || "MSS-JALALABAD",
      userId: user?.userId || "USR-MAHI001",
      userName: user?.name || "মাহি",
      expenseType,
      shopVendor: vendor,
      itemDescription: item,
      amount,
      currency: "BDT",
      exchangeRate: 1.0,
      paidByUserId,
      paidByName,
      participants,
      notes,
      voucherFileId: this.activeVoucherBase64 ? "VCH_LOCAL_" + Date.now() : "",
      voucherViewUrl: this.activeVoucherBase64 || ""
    });

    if (res.success) {
      this.showToast("কেনাকাটার হিসাব সফলভাবে যোগ হয়েছে!", "success");
      document.getElementById("modalAddShopping").classList.remove("active");
      this.renderActiveSection();
    } else {
      alert("ত্রুটি: " + res.error);
    }
  },

  openAddPaymentModal() {
    const memberSelect = document.getElementById("payMemberSelect");
    if (memberSelect) {
      memberSelect.innerHTML = this.state.members.filter(m => m.status === "ACTIVE").map(m => `
        <option value="${m.userId}">${m.name}</option>
      `).join("");
    }
    document.getElementById("payAmount").value = "";
    document.getElementById("payRef").value = "";
    document.getElementById("payNotes").value = "";
    document.getElementById("modalAddPayment").classList.add("active");
  },

  async handleSavePayment(e) {
    e.preventDefault();
    const memberUserId = document.getElementById("payMemberSelect").value;
    const memberName = this.state.members.find(m => m.userId === memberUserId)?.name || "সদস্য";
    const amount = parseFloat(document.getElementById("payAmount").value);
    const method = document.getElementById("payMethod").value;
    const ref = document.getElementById("payRef").value.trim();
    const notes = document.getElementById("payNotes").value.trim();

    if (!amount || amount <= 0) {
      return alert("অনুগ্রহ করে সঠিক জমা পরিমাণ দিন।");
    }

    const user = MESS_AUTH.getCurrentUser();
    const res = await MESS_API.callBackend("payment/add", {
      messId: this.state.messes[0]?.messId || "MSS-JALALABAD",
      userId: user?.userId || "USR-MAHI001",
      userName: user?.name || "মাহি",
      memberUserId,
      memberName,
      amount,
      currency: "BDT",
      exchangeRate: 1.0,
      paymentMethod: method,
      paymentMonth: MESS_CONFIG.currentMonth,
      reference: ref,
      notes
    });

    if (res.success) {
      this.showToast("জমা টাকা সফলভাবে রেকর্ড হয়েছে!", "success");
      document.getElementById("modalAddPayment").classList.remove("active");
      this.renderActiveSection();
    } else {
      alert("ত্রুটি: " + res.error);
    }
  },

  openVoidModal(txId) {
    document.getElementById("voidTxId").value = txId;
    document.getElementById("voidReason").value = "";
    document.getElementById("modalVoidTx").classList.add("active");
  },

  async handleConfirmVoid(e) {
    e.preventDefault();
    const txId = document.getElementById("voidTxId").value;
    const reason = document.getElementById("voidReason").value.trim();

    if (!reason) return alert("অনুগ্রহ করে বাতিল করার কারণ লিখুন।");

    const user = MESS_AUTH.getCurrentUser();
    const res = await MESS_API.callBackend("shopping/void", {
      messId: this.state.messes[0]?.messId || "MSS-JALALABAD",
      userId: user?.userId || "USR-MAHI001",
      userName: user?.name || "মাহি",
      transactionId: txId,
      reason
    });

    if (res.success) {
      this.showToast("লেনদেনটি সফলভাবে বাতিল (VOID) করা হয়েছে। হিস্ট্রি সংরক্ষিত রয়েছে।", "success");
      document.getElementById("modalVoidTx").classList.remove("active");
      this.renderActiveSection();
    } else {
      alert("ত্রুটি: " + res.error);
    }
  },

  viewVoucher(txId) {
    const tx = this.state.shopping.find(s => s.transactionId === txId);
    if (!tx || !tx.voucherViewUrl) return alert("কোনো ভাউচার পাওয়া যায়নি।");

    const modal = document.getElementById("modalViewVoucher");
    document.getElementById("viewVoucherImg").src = tx.voucherViewUrl;
    modal.classList.add("active");
  },

  handleSaveSettings(e) {
    e.preventDefault();
    const url = document.getElementById("settingsGasUrl").value.trim();
    MESS_CONFIG.gasWebAppUrl = url;
    localStorage.setItem("MESS_GAS_URL", url);
    this.showToast("সেটিংস সংরক্ষিত হয়েছে!", "success");
  },

  async handleCreateMess(e) {
    e.preventDefault();
    const name = document.getElementById("createMessName").value.trim();
    const addr = document.getElementById("createMessAddr").value.trim();
    const curr = document.getElementById("createMessCurrency").value;

    const user = MESS_AUTH.getCurrentUser();
    const res = await MESS_API.callBackend("mess/create", {
      userId: user?.userId,
      userName: user?.name,
      messName: name,
      address: addr,
      baseCurrency: curr
    });

    if (res.success) {
      this.showToast(`মেস তৈরি হয়েছে! কোড: ${res.data.messCode}`, "success");
      location.reload();
    }
  },

  async handleJoinMess(e) {
    e.preventDefault();
    const code = document.getElementById("joinMessCode").value.trim();
    const user = MESS_AUTH.getCurrentUser();

    const res = await MESS_API.callBackend("mess/join", {
      userId: user?.userId,
      userName: user?.name,
      userEmail: user?.email,
      messCode: code
    });

    if (res.success) {
      this.showToast("সফলভাবে মেসে যুক্ত হয়েছেন!", "success");
      location.reload();
    } else {
      alert("ত্রুটি: " + res.error);
    }
  },

  getMessName() {
    return this.state.messes[0]?.messName || "জালালাবাদ ব্যাচেলর মেস";
  },

  getCalculation() {
    return MessCalculator.calculateMonthlyState(this.state, MESS_CONFIG.currentMonth);
  },

  showToast(msg, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
};
