/**
 * Mess Management System - API Client
 * Connects seamlessly to Google Apps Script Web App OR Local State
 */

const MESS_API = {
  // Local In-Memory Cache
  state: null,

  async init() {
    // Load local seed from localStorage or fetch mess_schema.json
    const cached = localStorage.getItem("MESS_LOCAL_STATE");
    if (cached) {
      try {
        this.state = JSON.parse(cached);
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }

    if (!this.state) {
      try {
        const res = await fetch("database/mess_schema.json");
        if (res.ok) {
          this.state = await res.json();
          this.saveLocal();
        }
      } catch (err) {
        console.warn("Could not load mess_schema.json directly, using empty template", err);
        this.state = { users: [], messes: [], members: [], shopping: [], payments: [], auditLog: [] };
      }
    }
    return this.state;
  },

  saveLocal() {
    if (this.state) {
      localStorage.setItem("MESS_LOCAL_STATE", JSON.stringify(this.state));
    }
  },

  isCloudMode() {
    return MESS_CONFIG.gasWebAppUrl && MESS_CONFIG.gasWebAppUrl.startsWith("http");
  },

  async callBackend(action, params) {
    if (this.isCloudMode()) {
      try {
        const res = await fetch(MESS_CONFIG.gasWebAppUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, params })
        });
        const json = await res.json();
        return json;
      } catch (err) {
        console.error("Cloud API error, falling back to local:", err);
      }
    }
    // Handle locally
    return this.handleLocal(action, params);
  },

  async handleLocal(action, params) {
    if (!this.state) await this.init();

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 8);
    const timestamp = now.toISOString();

    switch (action) {
      case "shopping/add": {
        const txId = "SHOP-" + dateStr.replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
        const amount = parseFloat(params.amount);
        const rate = parseFloat(params.exchangeRate) || 1.0;
        const baseAmount = amount * rate;
        const count = params.participants.length || 1;
        const share = amount / count;
        const baseShare = baseAmount / count;

        const newTx = {
          transactionId: txId,
          messId: params.messId,
          month: params.month || dateStr.substring(0, 7),
          originalDate: dateStr,
          originalTime: timeStr,
          expenseType: params.expenseType,
          shopVendor: params.shopVendor,
          itemDescription: params.itemDescription,
          quantity: params.quantity || "",
          amount: amount,
          currency: params.currency || "BDT",
          exchangeRate: rate,
          baseAmount: baseAmount,
          paidByUserId: params.paidByUserId,
          paidByName: params.paidByName,
          participantCount: count,
          status: "ACTIVE",
          notes: params.notes || "",
          voucherFileId: params.voucherFileId || "",
          voucherViewUrl: params.voucherViewUrl || "",
          createdByUserId: params.userId,
          createdTimestamp: timestamp,
          lastModifiedDate: dateStr,
          lastModifiedTime: timeStr,
          lastModifiedBy: params.userName,
          participants: params.participants.map(p => ({
            userId: p.userId,
            name: p.name,
            shareAmount: share,
            baseShareAmount: baseShare
          }))
        };

        this.state.shopping.unshift(newTx);
        this.addAuditLog(params.messId, params.userId, params.userName, "ADD_SHOPPING", "Shopping", txId, "", `${amount} ${params.currency}`, `Added ${params.expenseType} shopping (${count} participants)`);
        this.saveLocal();
        return { success: true, data: newTx };
      }

      case "shopping/void": {
        const tx = this.state.shopping.find(s => s.transactionId === params.transactionId && s.messId === params.messId);
        if (!tx) return { success: false, error: "Transaction not found." };
        if (tx.status === "VOID") return { success: false, error: "Transaction is already voided." };

        tx.status = "VOID";
        tx.voidReason = params.reason;
        tx.voidedBy = params.userName;
        tx.voidedAt = timestamp;

        this.addAuditLog(params.messId, params.userId, params.userName, "VOID_TRANSACTION", "Shopping", params.transactionId, "ACTIVE", "VOID", `Reason: ${params.reason}`);
        this.saveLocal();
        return { success: true, message: "Transaction marked as VOID." };
      }

      case "payment/add": {
        const payId = "PAY-" + dateStr.replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
        const amount = parseFloat(params.amount);
        const rate = parseFloat(params.exchangeRate) || 1.0;
        const baseAmount = amount * rate;

        const newPay = {
          paymentId: payId,
          messId: params.messId,
          month: params.paymentMonth || dateStr.substring(0, 7),
          originalDate: dateStr,
          originalTime: timeStr,
          memberUserId: params.memberUserId,
          memberName: params.memberName,
          amount: amount,
          currency: params.currency || "BDT",
          exchangeRate: rate,
          baseAmount: baseAmount,
          paymentMethod: params.paymentMethod,
          paymentMonth: params.paymentMonth,
          reference: params.reference || "",
          notes: params.notes || "",
          proofFileId: params.proofFileId || "",
          proofViewUrl: params.proofViewUrl || "",
          status: "ACTIVE",
          createdByUserId: params.userId,
          createdTimestamp: timestamp
        };

        this.state.payments.unshift(newPay);
        this.addAuditLog(params.messId, params.userId, params.userName, "ADD_PAYMENT", "Payment", payId, "", `${amount} ${params.currency}`, `Collected from ${params.memberName}`);
        this.saveLocal();
        return { success: true, data: newPay };
      }

      case "payment/void": {
        const pay = this.state.payments.find(p => p.paymentId === params.paymentId && p.messId === params.messId);
        if (!pay) return { success: false, error: "Payment not found." };
        if (pay.status === "VOID") return { success: false, error: "Payment is already voided." };

        pay.status = "VOID";
        pay.voidReason = params.reason;
        pay.voidedBy = params.userName;
        pay.voidedAt = timestamp;

        this.addAuditLog(params.messId, params.userId, params.userName, "VOID_PAYMENT", "Payment", params.paymentId, "ACTIVE", "VOID", `Reason: ${params.reason}`);
        this.saveLocal();
        return { success: true, message: "Payment marked as VOID." };
      }

      case "mess/create": {
        const mId = "MSS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = "MESS-" + Math.random().toString(36).substring(2, 7).toUpperCase();
        const newMess = {
          messId: mId,
          messName: params.messName,
          messCode: code,
          address: params.address || "",
          baseCurrency: params.baseCurrency || "BDT",
          adminUserId: params.userId,
          currentMonth: dateStr.substring(0, 7),
          description: params.description || ""
        };
        this.state.messes.push(newMess);
        this.state.members.push({
          membershipId: "MEM-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          messId: mId,
          userId: params.userId,
          name: params.userName,
          email: params.email || "",
          role: "ADMIN",
          joinDate: dateStr,
          leaveDate: "",
          status: "ACTIVE"
        });
        this.addAuditLog(mId, params.userId, params.userName, "CREATE_MESS", "Mess", mId, "", params.messName, `Code: ${code}`);
        this.saveLocal();
        return { success: true, data: newMess };
      }

      case "mess/join": {
        const target = this.state.messes.find(m => m.messCode.toUpperCase() === params.messCode.trim().toUpperCase());
        if (!target) return { success: false, error: "Invalid Mess Code." };

        const existing = this.state.members.find(m => m.messId === target.messId && m.userId === params.userId);
        if (existing) {
          if (existing.status === "ACTIVE") return { success: false, error: "Already an active member." };
          existing.status = "ACTIVE";
          this.saveLocal();
          return { success: true, data: target };
        }

        const mem = {
          membershipId: "MEM-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          messId: target.messId,
          userId: params.userId,
          name: params.userName,
          email: params.email || "",
          role: "MEMBER",
          joinDate: dateStr,
          leaveDate: "",
          status: "ACTIVE"
        };
        this.state.members.push(mem);
        this.addAuditLog(target.messId, params.userId, params.userName, "JOIN_MESS", "Membership", mem.membershipId, "", target.messName, "Joined mess");
        this.saveLocal();
        return { success: true, data: target };
      }

      case "mess/updateMember": {
        const mem = this.state.members.find(m => m.membershipId === params.membershipId && m.messId === params.messId);
        if (!mem) return { success: false, error: "Member not found." };
        if (params.role) mem.role = params.role;
        if (params.joinDate) mem.joinDate = params.joinDate;
        if (params.leaveDate !== undefined) mem.leaveDate = params.leaveDate;
        if (params.status) mem.status = params.status;
        this.saveLocal();
        return { success: true, message: "Member profile updated." };
      }

      case "month/close": {
        this.addAuditLog(params.messId, params.userId, params.adminName, "CLOSE_MONTH", "Month", params.month, "OPEN", "LOCKED", "Closed and locked month.");
        this.saveLocal();
        return { success: true, message: `Month ${params.month} has been locked.` };
      }

      default:
        return { success: true, data: this.state };
    }
  },

  addAuditLog(messId, userId, userName, action, entity, entityId, oldValue, newValue, reason) {
    if (!this.state.auditLog) this.state.auditLog = [];
    this.state.auditLog.unshift({
      logId: "LOG-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      messId: messId || "",
      timestamp: new Date().toISOString(),
      userId: userId || "",
      userName: userName || "",
      action,
      entity,
      entityId: entityId || "",
      oldValue: String(oldValue || ""),
      newValue: String(newValue || ""),
      reason: String(reason || "")
    });
  }
};
