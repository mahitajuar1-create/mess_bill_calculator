/**
 * Mess Management System - Authentication Service
 */

const MESS_AUTH = {
  currentUser: null,

  init() {
    const session = localStorage.getItem(MESS_CONFIG.sessionKey);
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
      } catch (e) {
        this.logout();
      }
    }
    // Default to Super Admin (Mahi) if not logged in for instant demonstration
    if (!this.currentUser) {
      this.currentUser = {
        userId: "USR-MAHI001",
        name: "মাহি (Mahi)",
        email: "mahi@mess.local",
        phone: "+8801308650721",
        role: "ADMIN",
        token: "MOCK_TOKEN_MAHI"
      };
      this.saveSession();
    }
    return this.currentUser;
  },

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem(MESS_CONFIG.sessionKey, JSON.stringify(this.currentUser));
    }
  },

  getCurrentUser() {
    if (!this.currentUser) this.init();
    return this.currentUser;
  },

  isAdmin() {
    const u = this.getCurrentUser();
    return u && (u.role === "ADMIN" || u.role === "SUPER_ADMIN");
  },

  async login(email, password) {
    if (MESS_API.isCloudMode()) {
      const res = await MESS_API.callBackend("auth/login", { email, password });
      if (res.success) {
        this.currentUser = res.data;
        this.saveSession();
      }
      return res;
    }

    // Local Auth simulation
    const users = MESS_API.state?.users || [];
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      this.currentUser = {
        userId: found.userId,
        name: found.name,
        email: found.email,
        phone: found.phone,
        role: found.role === "SUPER_ADMIN" ? "ADMIN" : found.role,
        token: "TOKEN_" + Date.now()
      };
      this.saveSession();
      return { success: true, data: this.currentUser };
    }

    // Allow mock login
    this.currentUser = {
      userId: "USR-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      name: email.split("@")[0],
      email: email,
      role: "MEMBER",
      token: "TOKEN_" + Date.now()
    };
    this.saveSession();
    return { success: true, data: this.currentUser };
  },

  async register(name, email, password, phone) {
    if (MESS_API.isCloudMode()) {
      const res = await MESS_API.callBackend("auth/register", { name, email, password, phone });
      if (res.success) {
        this.currentUser = res.data;
        this.saveSession();
      }
      return res;
    }

    const newUser = {
      userId: "USR-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      name,
      email,
      phone,
      role: "MEMBER",
      token: "TOKEN_" + Date.now()
    };
    if (MESS_API.state?.users) {
      MESS_API.state.users.push({ ...newUser, status: "ACTIVE" });
      MESS_API.saveLocal();
    }
    this.currentUser = newUser;
    this.saveSession();
    return { success: true, data: newUser };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(MESS_CONFIG.sessionKey);
  }
};
