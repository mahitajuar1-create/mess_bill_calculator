/**
 * Mess Management System - Global Configuration
 */
const MESS_CONFIG = {
  // Google Apps Script Web App Deployment URL
  // Users can paste their deployed exec URL here or in the Settings UI!
  gasWebAppUrl: localStorage.getItem("MESS_GAS_URL") || "",
  
  // Storage Mode: 'AUTO' | 'CLOUD' | 'LOCAL'
  storageMode: localStorage.getItem("MESS_STORAGE_MODE") || "AUTO",
  
  // Active Mess ID
  activeMessId: localStorage.getItem("MESS_ACTIVE_ID") || "MSS-JALALABAD",
  
  // Active Month (defaults to current year-month, e.g. '2026-10')
  currentMonth: localStorage.getItem("MESS_ACTIVE_MONTH") || "2026-10",
  
  // Base Currency symbol/code
  baseCurrency: "BDT",
  
  // Session key
  sessionKey: "MESS_USER_SESSION"
};
