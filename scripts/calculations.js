/**
 * Mess Management System - Calculation Engine
 * Handles participant sharing, join/leave date rules, full monthly bills, and Bill Till Today
 */

const MessCalculator = {
  /**
   * Formats a monetary amount
   */
  formatCurrency(amount, currency = "BDT") {
    const val = parseFloat(amount) || 0;
    return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Returns today's ISO date string (YYYY-MM-DD)
   */
  getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Core Calculation: Monthly Billing with Join Date / Leave Date Rule & Bill Till Today
   */
  calculateMonthlyState(state, targetMonth = null) {
    const month = targetMonth || state.messes[0]?.currentMonth || "2026-10";
    const members = state.members || [];
    const shoppingList = (state.shopping || []).filter(s => s.month === month && s.status === "ACTIVE");
    const paymentsList = (state.payments || []).filter(p => p.month === month && p.status === "ACTIVE");
    const todayStr = this.getTodayString();

    let totalFoodExpense = 0;
    let totalGeneralExpense = 0;
    let totalMoneyCollected = 0;

    // Member balance trackers
    const memberMap = {};
    members.forEach(m => {
      memberMap[m.userId] = {
        userId: m.userId,
        membershipId: m.membershipId,
        name: m.name,
        email: m.email,
        phone: m.phone || "",
        role: m.role,
        joinDate: m.joinDate,
        leaveDate: m.leaveDate,
        status: m.status,
        
        // Full Month
        foodShare: 0,
        generalShare: 0,
        totalBill: 0,
        totalPaid: 0,
        due: 0,
        overpaid: 0,

        // Bill Till Today
        tillTodayFood: 0,
        tillTodayGeneral: 0,
        tillTodayTotal: 0,
        tillTodayDue: 0,
        tillTodayOverpaid: 0
      };
    });

    // 1. Process Shopping Transactions
    shoppingList.forEach(tx => {
      const isFood = tx.expenseType === "Food";
      const baseAmount = parseFloat(tx.baseAmount || tx.amount) || 0;
      
      if (isFood) totalFoodExpense += baseAmount;
      else totalGeneralExpense += baseAmount;

      const txDate = tx.originalDate;
      const isPastOrToday = (txDate <= todayStr);

      if (tx.participants && Array.isArray(tx.participants)) {
        tx.participants.forEach(p => {
          const mem = memberMap[p.userId];
          if (!mem) return;

          // CRITICAL: JOIN DATE & LEAVE DATE RULE
          // If transaction date is BEFORE member's join date, DO NOT charge!
          if (mem.joinDate && txDate < mem.joinDate) {
            return;
          }
          // If member has left and transaction date is AFTER leave date, DO NOT charge!
          if (mem.leaveDate && txDate > mem.leaveDate) {
            return;
          }

          const share = parseFloat(p.baseShareAmount || p.shareAmount) || 0;
          if (isFood) {
            mem.foodShare += share;
            if (isPastOrToday) mem.tillTodayFood += share;
          } else {
            mem.generalShare += share;
            if (isPastOrToday) mem.tillTodayGeneral += share;
          }
        });
      }
    });

    // 2. Process Money Collections
    paymentsList.forEach(pay => {
      const baseAmount = parseFloat(pay.baseAmount || pay.amount) || 0;
      totalMoneyCollected += baseAmount;

      const mem = memberMap[pay.memberUserId];
      if (mem) {
        mem.totalPaid += baseAmount;
      }
    });

    // 3. Compute Final Balances
    const memberBills = Object.values(memberMap).map(mem => {
      mem.totalBill = mem.foodShare + mem.generalShare;
      mem.tillTodayTotal = mem.tillTodayFood + mem.tillTodayGeneral;

      // Full month due/overpaid
      if (mem.totalPaid >= mem.totalBill) {
        mem.due = 0;
        mem.overpaid = mem.totalPaid - mem.totalBill;
      } else {
        mem.due = mem.totalBill - mem.totalPaid;
        mem.overpaid = 0;
      }

      // Till Today due/overpaid
      if (mem.totalPaid >= mem.tillTodayTotal) {
        mem.tillTodayDue = 0;
        mem.tillTodayOverpaid = mem.totalPaid - mem.tillTodayTotal;
      } else {
        mem.tillTodayDue = mem.tillTodayTotal - mem.totalPaid;
        mem.tillTodayOverpaid = 0;
      }

      return mem;
    });

    const totalMessExpense = totalFoodExpense + totalGeneralExpense;
    const cashInHand = totalMoneyCollected - totalMessExpense;
    const totalDueAcrossMess = memberBills.reduce((acc, m) => acc + m.due, 0);

    return {
      month,
      todayDate: todayStr,
      totalFoodExpense,
      totalGeneralExpense,
      totalMessExpense,
      totalMoneyCollected,
      cashInHand,
      totalDueAcrossMess,
      totalActiveMembers: members.filter(m => m.status === "ACTIVE").length,
      memberBills
    };
  }
};
