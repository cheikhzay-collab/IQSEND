export interface UserPermissions {
  canAccessDashboard: boolean;
  canAccessOrders: boolean;
  canAccessLeads: boolean;
  canAccessConfirmation: boolean;
  canAccessInbox: boolean;
  canAccessAiAgents: boolean;
  canAccessPacking: boolean;
  canAccessTracking: boolean;
  canAccessProducts: boolean;
  canAccessCustomers: boolean;
  canAccessFinance: boolean;
  canAccessAutomations: boolean;
  canAccessIntegrations: boolean;
  canAccessTeam: boolean;
  canAccessSettings: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  ADMIN: {
    canAccessDashboard: true,
    canAccessOrders: true,
    canAccessLeads: true,
    canAccessConfirmation: true,
    canAccessInbox: true,
    canAccessAiAgents: true,
    canAccessPacking: true,
    canAccessTracking: true,
    canAccessProducts: true,
    canAccessCustomers: true,
    canAccessFinance: true,
    canAccessAutomations: true,
    canAccessIntegrations: true,
    canAccessTeam: true,
    canAccessSettings: true,
  },
  CONFIRMATION_AGENT: {
    canAccessDashboard: true,
    canAccessOrders: true,
    canAccessLeads: true,
    canAccessConfirmation: true,
    canAccessInbox: true,
    canAccessAiAgents: true,
    canAccessPacking: false,
    canAccessTracking: false,
    canAccessProducts: true,
    canAccessCustomers: true,
    canAccessFinance: false,
    canAccessAutomations: false,
    canAccessIntegrations: false,
    canAccessTeam: false,
    canAccessSettings: false,
  },
  PACKER: {
    canAccessDashboard: true,
    canAccessOrders: false,
    canAccessLeads: false,
    canAccessConfirmation: false,
    canAccessInbox: false,
    canAccessAiAgents: false,
    canAccessPacking: true,
    canAccessTracking: true,
    canAccessProducts: true,
    canAccessCustomers: false,
    canAccessFinance: false,
    canAccessAutomations: false,
    canAccessIntegrations: false,
    canAccessTeam: false,
    canAccessSettings: false,
  },
  TRACKING_AGENT: {
    canAccessDashboard: true,
    canAccessOrders: true,
    canAccessLeads: false,
    canAccessConfirmation: false,
    canAccessInbox: true,
    canAccessAiAgents: false,
    canAccessPacking: false,
    canAccessTracking: true,
    canAccessProducts: false,
    canAccessCustomers: true,
    canAccessFinance: false,
    canAccessAutomations: true,
    canAccessIntegrations: false,
    canAccessTeam: false,
    canAccessSettings: false,
  },
  CALL_AGENT: {
    canAccessDashboard: true,
    canAccessOrders: true,
    canAccessLeads: true,
    canAccessConfirmation: true,
    canAccessInbox: true,
    canAccessAiAgents: true,
    canAccessPacking: false,
    canAccessTracking: false,
    canAccessProducts: false,
    canAccessCustomers: true,
    canAccessFinance: false,
    canAccessAutomations: false,
    canAccessIntegrations: false,
    canAccessTeam: false,
    canAccessSettings: false,
  },
};

export interface TeamMemberDto {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONFIRMATION_AGENT' | 'PACKER' | 'TRACKING_AGENT' | 'CALL_AGENT';
  jobTitle: string;
  phone?: string;
  avatarUrl?: string;
  assignedCity?: string;
  confirmedCount?: number;
  isActive: boolean;
  isOnline: boolean;
  permissions: UserPermissions;
  lastActiveAt?: string;
  createdAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONFIRMATION_AGENT' | 'PACKER' | 'TRACKING_AGENT' | 'CALL_AGENT';
  jobTitle: string;
  phone?: string;
  avatarUrl?: string;
  assignedCity?: string;
  confirmedCount?: number;
  isActive: boolean;
  isOnline: boolean;
  permissions: UserPermissions;
  lastActiveAt?: string;
}
