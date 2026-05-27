/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  image: string; // Base64 or URL
  quantity: number; // Current stock level
  minQuantity: number; // Minimum alert stock
  unitPrice: number; // Unit price in VND
  location: string; // Warehouse location/rack
  description?: string;
  createdAt: string;
}

export type SlipType = 'IMPORT' | 'EXPORT';

export interface SlipItem {
  id: string; // Internal state ID
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InventorySlip {
  id: string;
  code: string; // e.g., PN-2026-001 or PX-2026-001
  type: SlipType;
  date: string;
  partner: string; // Supplier (for Import) or Receiver (for Export)
  reason: string; // Export/Import reason
  warehouseName: string; // e.g. "Kho NCT" or "Kho HĐ"
  items: SlipItem[];
  totalAmount: number;
  creator: string;
  notes?: string;
}

export interface WarehouseStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  importCount: number;
  exportCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  roleName: string;
  avatarInitials: string;
}

