/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Warehouse, 
  Layers, 
  FileText, 
  FileSpreadsheet, 
  User, 
  LogOut,
  Bell,
  HardDriveDownload,
  Activity,
  ShieldCheck,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports types & preloaded data
import { Material, InventorySlip, UserProfile } from './types';
import { DEFAULT_MATERIALS, DEFAULT_SLIPS } from './data';

// Components
import { DashboardView } from './components/DashboardView';
import { MaterialsView } from './components/MaterialsView';
import { SlipsView } from './components/SlipsView';
import { ReportView } from './components/ReportView';

const STAFF_USER: UserProfile = {
  name: 'Đỗ Thị Thanh Xuân',
  email: 'xuan.do@kdi.edu.vn',
  role: 'STAFF',
  roleName: 'Thủ kho (Staff)',
  avatarInitials: 'ĐX'
};

const ADMIN_USER: UserProfile = {
  name: 'Quản trị viên Hệ thống',
  email: 'admin@kdi.edu.vn',
  role: 'ADMIN',
  roleName: 'Quản trị viên (Admin)',
  avatarInitials: 'AD'
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Current user state
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('kdi_inventory_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return STAFF_USER;
  });

  useEffect(() => {
    localStorage.setItem('kdi_inventory_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Auth modal state for admin password verification
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleRequireAdmin = (action?: () => void) => {
    if (currentUser.role === 'ADMIN') {
      if (action) action();
      return;
    }
    setPendingAction(() => action || null);
    setAuthError('');
    setAuthPassword('');
    setIsAuthModalOpen(true);
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (authPassword === 'admin') {
      setCurrentUser(ADMIN_USER);
      setIsAuthModalOpen(false);
      setAuthPassword('');
      setAuthError('');
      if (pendingAction) {
        // Execute the deferred admin action on success
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setAuthError('Mật khẩu "admin" không chính xác. Vui lòng thử lại!');
    }
  };

  const handleLogoutAdmin = () => {
    setCurrentUser(STAFF_USER);
  };
  
  // Persistent Storage initialization
  const [materials, setMaterials] = useState<Material[]>(() => {
    const saved = localStorage.getItem('kdi_inventory_materials');
    return saved ? JSON.parse(saved) : DEFAULT_MATERIALS;
  });

  const [slips, setSlips] = useState<InventorySlip[]>(() => {
    const saved = localStorage.getItem('kdi_inventory_slips');
    return saved ? JSON.parse(saved) : DEFAULT_SLIPS;
  });

  // Save changes to localStorage on any state modification
  useEffect(() => {
    localStorage.setItem('kdi_inventory_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('kdi_inventory_slips', JSON.stringify(slips));
  }, [slips]);

  // Handlers for Materials
  const handleAddMaterial = (newMat: Material) => {
    setMaterials(prev => [newMat, ...prev]);
  };

  const handleUpdateMaterial = (updatedMat: Material) => {
    setMaterials(prev => prev.map(m => m.id === updatedMat.id ? updatedMat : m));
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  // Handler for adding a Slip (IMPORT/EXPORT)
  // This must reactively update matching material's stock quantity!
  const handleAddSlip = (newSlip: InventorySlip) => {
    // 1. Add slip to record
    setSlips(prev => [newSlip, ...prev]);

    // 2. Adjust material quantities
    setMaterials(prevMaterials => {
      return prevMaterials.map(mat => {
        // Find matching item in this new slip
        const itemInSlip = newSlip.items.find(i => i.materialId === mat.id);
        
        if (itemInSlip) {
          const delta = itemInSlip.quantity;
          let newQuantity = mat.quantity;

          if (newSlip.type === 'IMPORT') {
            newQuantity += delta;
          } else if (newSlip.type === 'EXPORT') {
            newQuantity = Math.max(0, newQuantity - delta); // guard negative values
          }

          return {
            ...mat,
            quantity: newQuantity
          };
        }
        return mat;
      });
    });
  };

  // Helper values
  const lowStockCount = materials.filter(m => m.quantity <= m.minQuantity).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row antialiased">
      {/* 1. Left Sidebar Navigation Panel */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-200 border-r border-slate-900 flex flex-col justify-between flex-shrink-0 z-10 pro-transition shadow-lg">
        <div>
          {/* Logo brand */}
          <div className="p-5 border-b border-slate-900 flex items-center space-x-3 bg-slate-950/40">
            <div className="rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 text-white shadow-md shadow-blue-500/10">
              <Warehouse className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white uppercase tracking-wider leading-tight">Kho Nguyễn Công Trứ / HĐ</h1>
              <p className="text-[10px] text-slate-400 tracking-wide mt-0.5 font-sans">Hệ thống quản lý vật tư &amp; xuất nhập</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide border-l-4 pro-transition ${
                currentTab === 'dashboard'
                  ? 'bg-slate-900 border-l-blue-500 text-white shadow-inner font-bold'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <BarChart className="h-4 w-4" />
              <span>Bảng Điều Khiển</span>
            </button>

            <button
              onClick={() => setCurrentTab('materials')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide border-l-4 pro-transition ${
                currentTab === 'materials'
                  ? 'bg-slate-900 border-l-blue-500 text-white shadow-inner font-bold'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <Layers className="h-4 w-4" />
              <div className="flex-1 flex justify-between items-center">
                <span>Vật tư &amp; Sản phẩm</span>
                {lowStockCount > 0 && (
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold px-2 py-0.5 rounded-full text-[9px] leading-none">
                    {lowStockCount} Hết
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('slips')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide border-l-4 pro-transition ${
                currentTab === 'slips'
                  ? 'bg-slate-900 border-l-blue-500 text-white shadow-inner font-bold'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Phiếu Nhập / Xuất</span>
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide border-l-4 pro-transition ${
                currentTab === 'reports'
                  ? 'bg-slate-900 border-l-blue-500 text-white shadow-inner font-bold'
                  : 'border-l-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Báo Cáo Sổ Kho</span>
            </button>
          </nav>
        </div>

        {/* User Account / Context details at bottom with Role Permissions switcher */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20 space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`h-9 w-9 rounded-xl ${currentUser.role === 'ADMIN' ? 'bg-gradient-to-br from-amber-500 to-red-600 text-white' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100'} flex items-center justify-center font-bold text-xs border border-slate-800 shadow-sm`}>
              {currentUser.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate tracking-wide mt-0.5">{currentUser.email}</p>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 font-mono space-y-2 bg-slate-900/30 p-2.5 rounded-lg border border-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <User className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className={`${currentUser.role === 'ADMIN' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                  {currentUser.roleName}
                </span>
              </div>
            </div>
            
            {currentUser.role === 'ADMIN' ? (
              <button
                onClick={handleLogoutAdmin}
                className="w-full flex items-center justify-center space-x-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-800 py-1.5 px-2 rounded-md font-sans text-[10px] font-bold tracking-wide transition cursor-pointer"
                id="logout-admin-sidebar-btn"
              >
                <LogOut className="h-3 w-3" />
                <span>Thoát Quyền Admin</span>
              </button>
            ) : (
              <button
                onClick={() => handleRequireAdmin()}
                className="w-full flex items-center justify-center space-x-1 bg-blue-950/40 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 border border-blue-900/30 hover:border-blue-800 py-1.5 px-2 rounded-md font-sans text-[10px] font-bold tracking-wide transition cursor-pointer"
                id="login-admin-sidebar-btn"
              >
                <Lock className="h-3 w-3" />
                <span>Đăng nhập quyền Admin</span>
              </button>
            )}
            <p className="text-[8px] text-slate-500/80 pt-1 border-t border-slate-900/40">Hệ thống: KHO_NCT_V2.0</p>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Canvas */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/85 h-16 flex-shrink-0 px-6 flex items-center justify-between no-print shadow-xs z-2">
          <div className="flex items-center space-x-2.5">
            <span className="text-slate-400 uppercase font-mono text-[9px] tracking-widest font-bold">Trạng thái</span>
            <div className="flex items-center bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              <span>Đồng bộ cục bộ</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => setCurrentTab('materials')}
                className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 relative pro-transition"
              >
                <Bell className="h-4 w-4" />
                {lowStockCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white border-none animate-bounce" />
                )}
              </button>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            
            {/* Backup to file button */}
            <button
              onClick={() => {
                const schema = {
                  materials,
                  slips,
                  exportTime: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_kho_nct_hd_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              title="Sao lưu dữ liệu kho về máy tính"
              className="flex items-center space-x-1.5 py-2 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[11px] font-semibold text-slate-650 pro-transition shadow-xs"
            >
              <HardDriveDownload className="h-3.5 w-3.5 text-slate-400" />
              <span>Sao lưu dữ liệu</span>
            </button>
          </div>
        </header>

        {/* View Canvas Stage with Motion Fade */}
        <div id="view-canvas-content" className="flex-1 p-4 md:p-6 pb-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {currentTab === 'dashboard' && (
                <DashboardView 
                  materials={materials} 
                  slips={slips} 
                  onNavigate={(tab) => setCurrentTab(tab)} 
                />
              )}
              {currentTab === 'materials' && (
                <MaterialsView
                  materials={materials}
                  onAddMaterial={handleAddMaterial}
                  onUpdateMaterial={handleUpdateMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                  isAdmin={currentUser.role === 'ADMIN'}
                  onRequireAdmin={handleRequireAdmin}
                />
              )}
              {currentTab === 'slips' && (
                <SlipsView
                  materials={materials}
                  slips={slips}
                  onAddSlip={handleAddSlip}
                  currentUser={currentUser}
                />
              )}
              {currentTab === 'reports' && (
                <ReportView
                  materials={materials}
                  slips={slips}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Auth Password modal overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="admin-auth-overlay">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              id="close-auth-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2 rounded-lg bg-blue-50">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-950">Xác thực quyền Admin</h3>
                <p className="text-[10px] text-slate-400">Yêu cầu mật khẩu "admin" để tiếp tục</p>
              </div>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Mật khẩu quản trị</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  autoFocus
                  className="w-full rounded-md border border-slate-200 p-2.5 text-center font-mono text-slate-850 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition text-sm font-bold tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-xs font-sans"
                  id="admin-password-input"
                />
                {authError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse" id="auth-error-msg">❌ {authError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setPendingAction(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  id="cancel-auth-btn"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 hover:bg-red-650 text-white hover:bg-blue-750 px-5 py-2 text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center space-x-1.5"
                  id="submit-auth-btn"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Xác nhận</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
