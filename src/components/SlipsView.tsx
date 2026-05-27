/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Search, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  User,
  Building,
  ClipboardList
} from 'lucide-react';
import { Material, InventorySlip, SlipItem, SlipType } from '../types';

import { UserProfile } from '../types';

interface SlipsViewProps {
  materials: Material[];
  slips: InventorySlip[];
  onAddSlip: (slip: InventorySlip) => void;
  currentUser?: UserProfile;
}

export const SlipsView: React.FC<SlipsViewProps> = ({ materials, slips, onAddSlip, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IMPORT' | 'EXPORT'>('ALL');
  
  // Create Slip modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [slipType, setSlipType] = useState<SlipType>('EXPORT'); // default to EXPORT as requested
  const [partner, setPartner] = useState('');
  const [reason, setReason] = useState('');
  const [warehouseName, setWarehouseName] = useState('Kho Nguyễn Công Trứ');
  const [creator, setCreator] = useState('Đỗ Thị Thanh Xuân (Thủ kho)');
  const [notes, setNotes] = useState('');
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [slipValErr, setSlipValErr] = useState('');

  // Auto-sync creator name when active user changes or modal opens
  React.useEffect(() => {
    if (currentUser) {
      setCreator(`${currentUser.name} (${currentUser.role === 'ADMIN' ? 'Admin' : 'Thủ kho trưởng'})`);
    }
  }, [currentUser, isCreateOpen]);

  // Sub-search material item query state
  const [matQuery, setMatQuery] = useState('');
  const [isMatDropdownOpen, setIsMatDropdownOpen] = useState(false);

  // Print Slip Dialog State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printSlip, setPrintSlip] = useState<InventorySlip | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Slip code generator
  const generateSlipCode = (type: SlipType) => {
    const prefix = type === 'IMPORT' ? 'PN' : 'PX';
    const year = new Date().getFullYear();
    const count = slips.filter(s => s.type === type).length + 1;
    const padded = String(count).padStart(3, '0');
    return `${prefix}-${year}-${padded}`;
  };

  // Add Item to drafting slip
  const handleAddDraftItem = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;

    // Check if already in list
    const exists = slipItems.find(item => item.materialId === materialId);
    if (exists) {
      setSlipValErr(`Vật tư "${mat.name}" đã có trong danh sách!`);
      return;
    }

    const newItem: SlipItem = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      materialId: mat.id,
      materialCode: mat.code,
      materialName: mat.name,
      unit: mat.unit,
      quantity: 1,
      unitPrice: mat.unitPrice,
      totalPrice: mat.unitPrice,
    };

    setSlipItems([...slipItems, newItem]);
    setSlipValErr('');
  };

  // Update quantity / price in drafting slip
  const handleUpdateDraftItem = (id: string, field: 'quantity' | 'unitPrice', val: number) => {
    setSlipItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        updated.totalPrice = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  // Remove draft item
  const handleRemoveDraftItem = (id: string) => {
    setSlipItems(prev => prev.filter(item => item.id !== id));
  };

  // Save the full Slip
  const handleSaveSlip = (shouldPrint: boolean) => {
    if (!partner.trim()) {
      setSlipValErr(slipType === 'IMPORT' ? 'Vui lòng nhập Họ tên nhân viên thực hiện.' : 'Vui lòng điền thông tin Người / Đội nhận vật tư.');
      return;
    }
    if (slipItems.length === 0) {
      setSlipValErr('Vui lòng thêm ít nhất một vật tư vào phiếu.');
      return;
    }

    // Verify quantities & stock availability for EXPORT slips
    if (slipType === 'EXPORT') {
      for (const item of slipItems) {
        if (item.quantity <= 0) {
          setSlipValErr(`Số lượng xuất của "${item.materialName}" phải lớn hơn 0.`);
          return;
        }
        const storeMat = materials.find(m => m.id === item.materialId);
        if (!storeMat || storeMat.quantity < item.quantity) {
          setSlipValErr(
            `Không đủ tồn kho cho "${item.materialName}". Tồn hiện bách: ${storeMat ? storeMat.quantity : 0} ${item.unit}, cần xuất: ${item.quantity} ${item.unit}.`
          );
          return;
        }
      }
    } else { // IMPORT
      for (const item of slipItems) {
        if (item.quantity <= 0) {
          setSlipValErr(`Số lượng nhập của "${item.materialName}" phải lớn hơn 0.`);
          return;
        }
      }
    }

    const totalAmount = slipItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const slipCode = generateSlipCode(slipType);

    const newSlip: InventorySlip = {
      id: `slip_${Date.now()}`,
      code: slipCode,
      type: slipType,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      partner: partner.trim(),
      reason: reason.trim() || (slipType === 'EXPORT' ? 'Xuất kho sản xuất' : 'Nhập bổ sung'),
      warehouseName,
      items: slipItems,
      totalAmount,
      creator: creator.trim(),
      notes: notes.trim()
    };

    onAddSlip(newSlip);
    setIsCreateOpen(false);
    
    // Clear form
    setPartner('');
    setReason('');
    setSlipItems([]);
    setNotes('');
    
    if (shouldPrint) {
      setPrintSlip(newSlip);
      setIsPrintOpen(true);
    } else {
      setSuccessMsg(`Đã xác nhận & lưu phiếu ${slipCode} thành công! Bạn có thể xem và in lại phiếu bất cứ khi nào.`);
      setTimeout(() => setSuccessMsg(''), 6000);
    }
  };

  const openCreateDialog = (type: SlipType) => {
    setSlipType(type);
    setPartner('');
    setReason('');
    setWarehouseName('Kho Nguyễn Công Trứ');
    setSlipItems([]);
    setSlipValErr('');
    setMatQuery('');
    setIsMatDropdownOpen(false);
    setIsCreateOpen(true);
  };

  // Filters
  const filteredSlips = slips.filter(slip => {
    const matchesSearch = 
      slip.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || slip.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header operations row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Phiếu Nhập / Xuất Kho</h2>
          <p className="text-xs text-slate-500">Tạo mới, lưu trữ, kiểm tra định lượng xuất kho và in biên bản bàn giao</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openCreateDialog('IMPORT')}
            id="btn-new-import-slip"
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition duration-150"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-600" />
            <span>+ Nhập vật tư</span>
          </button>
          <button
            onClick={() => openCreateDialog('EXPORT')}
            id="btn-new-export-slip"
            className="flex items-center justify-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition duration-150"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Phiếu Xuất Kho</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 border border-emerald-150 p-4 text-xs font-bold text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search box (7 cols) */}
          <div className="relative sm:col-span-8">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phiếu theo mã số, đối tác, người nhận, lý do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200/80 bg-slate-50 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Type Filter dropdown (4 cols) */}
          <div className="sm:col-span-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Tất cả chứng từ (Nhập + Xuất)</option>
              <option value="IMPORT">Chỉ Phiếu Nhập Kho (PN)</option>
              <option value="EXPORT">Chỉ Phiếu Xuất Kho (PX)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Slips records table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-extrabold w-28">Loại phiếu</th>
                <th className="px-5 py-3 font-extrabold w-28">Mã phiếu</th>
                <th className="px-5 py-3 font-extrabold w-36">Ngày lập</th>
                <th className="px-5 py-3 font-extrabold">Bên Giao / Bên Nhận</th>
                <th className="px-5 py-3 font-extrabold">Lý do xuất/nhập</th>
                <th className="px-5 py-3 font-extrabold w-28">Vị trí Kho</th>
                <th className="px-5 py-3 text-right font-extrabold w-36">Tổng lượng VT</th>
                <th className="px-5 py-3 text-center font-extrabold w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSlips.map(slip => (
                <tr key={slip.id} className="hover:bg-slate-50/50 pro-transition">
                  {/* Type */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold ${
                      slip.type === 'IMPORT' 
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10' 
                        : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10'
                    }`}>
                      {slip.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO'}
                    </span>
                  </td>
                  {/* Code */}
                  <td className="px-5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{slip.code}</td>
                  {/* Date */}
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                      <span>{slip.date}</span>
                    </div>
                  </td>
                  {/* Receiver/Supplier */}
                  <td className="px-5 py-3 font-bold text-slate-900 max-w-[180px] truncate">{slip.partner}</td>
                  {/* Reason */}
                  <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate font-medium">{slip.reason}</td>
                  {/* Warehouse */}
                  <td className="px-5 py-3 font-semibold text-slate-500">{slip.warehouseName}</td>
                  {/* Value */}
                  <td className="px-5 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {slip.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => {
                        setPrintSlip(slip);
                        setIsPrintOpen(true);
                      }}
                      className="p-1.5 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-bold rounded-lg flex items-center justify-center space-x-1.5 pro-transition text-[10px] cursor-pointer shadow-2xs mx-auto"
                    >
                      <Printer className="h-3 w-3 text-slate-500" />
                      <span>In / Xem</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSlips.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 text-xs font-medium">
                    <FileText className="mx-auto mb-2.5 h-9 w-9 text-slate-300 stroke-[1.5]" />
                    Chưa có ghi chép phiếu nào thỏa mãn bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDER ACTIVE MODALS */}

      {/* CREATE SLIP DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title Header */}
            <div>
              <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                slipType === 'IMPORT' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
              }`}>
                {slipType === 'IMPORT' ? 'Tạo phiếu nhập mới' : 'Tạo phiếu xuất mới'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                {slipType === 'IMPORT' ? 'LẬP BIÊN BẢN NHẬP VẬT TƯ' : 'LẬP PHIẾU XUẤT KHO VẬT TƯ (Nguyễn Công Trứ / HĐ)'}
              </h3>
            </div>

            {slipValErr && (
              <div className="flex items-center space-x-1.5 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{slipValErr}</span>
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4 text-xs">
              {/* Slip Metadata parameters */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Partner: who outputs to or who imports from */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    {slipType === 'IMPORT' ? 'Họ tên nhân viên thực hiện nhập vật tư *' : 'Người / Đội nhận vật tư *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={slipType === 'IMPORT' ? 'Nhập họ tên nhân viên (Ví dụ: Nguyễn Văn A...)' : 'Đội thi công số 1, Nguyễn Văn A...'}
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Lý do xuất / nhập kho</label>
                  <input
                    type="text"
                    placeholder="Lắp công trình trạm biến áp, bổ sung kho quý II..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Selector for Warehouse */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Vị trí Kho xuất / nhập</label>
                  <select
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Kho Nguyễn Công Trứ">Kho Nguyễn Công Trứ</option>
                    <option value="Kho HĐ">Kho HĐ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Người lập phiếu (Thủ kho)</label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Ghi chú đi kèm phiếu</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đội thi công chịu phí vận chuyển, có chứng thư CO/CQ đính kèm..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION: Searchable Item Selection */}
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 space-y-2 relative">
                <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  Tác vụ: Tìm &amp; Thêm vật tư kỹ thuật vào phiếu (gõ tên hoặc mã)
                </label>
                
                <div className="relative">
                  <div className="relative z-30">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Gõ tìm tên, nhãn hiệu hoặc mã vật tư (Ví dụ: Cadivi, Panasonic, uPVC...)"
                      value={matQuery}
                      onChange={(e) => {
                        setMatQuery(e.target.value);
                        setIsMatDropdownOpen(true);
                      }}
                      onFocus={() => setIsMatDropdownOpen(true)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all shadow-sm font-medium"
                    />
                    {matQuery && (
                      <button
                        type="button"
                        onClick={() => setMatQuery('')}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results Box */}
                  {isMatDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10 bg-transparent" 
                        onClick={() => setIsMatDropdownOpen(false)} 
                      />
                      <div className="absolute left-0 right-0 mt-1.5 z-40 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-50">
                        {(() => {
                          const matched = materials.filter(m => {
                            const query = matQuery.toLowerCase().trim();
                            if (!query) return true; // show all when focused with empty query
                            return (
                              m.name.toLowerCase().includes(query) ||
                              m.code.toLowerCase().includes(query)
                            );
                          });

                          if (matched.length === 0) {
                            return (
                              <div className="p-3 text-center text-slate-400 text-xs font-semibold">
                                Không tìm thấy vật tư nào khớp với "{matQuery}"
                              </div>
                            );
                          }

                          return matched.slice(0, 30).map(m => {
                            const inStore = m.quantity;
                            const isZero = inStore <= 0;
                            const isAlreadySelected = slipItems.some(item => item.materialId === m.id);

                            return (
                              <button
                                key={m.id}
                                type="button"
                                disabled={slipType === 'EXPORT' && isZero}
                                onClick={() => {
                                  handleAddDraftItem(m.id);
                                  setMatQuery('');
                                  setIsMatDropdownOpen(false);
                                }}
                                className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                                  slipType === 'EXPORT' && isZero
                                    ? 'bg-slate-50 text-slate-350 cursor-not-allowed'
                                    : isAlreadySelected
                                    ? 'bg-blue-50/40 hover:bg-blue-50/60 text-blue-700'
                                    : 'hover:bg-slate-50 text-slate-755'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isAlreadySelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {m.code}
                                  </span>
                                  <span className="font-semibold truncate max-w-[280px] sm:max-w-md">{m.name}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                  <span className={`font-bold ${isZero ? 'text-red-400' : 'text-slate-900'}`}>
                                    Tồn: {inStore} {m.unit}
                                  </span>
                                  {isAlreadySelected && (
                                    <span className="block text-[8px] text-blue-500 font-bold mt-0.5">Đã chọn ✔</span>
                                  )}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* List of items drafted inside the Slip */}
              <div className="border rounded-md overflow-hidden bg-white">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Mã VT</th>
                      <th className="px-3 py-2">Tên vật tư kỹ thuật</th>
                      <th className="px-3 py-2">ĐVT</th>
                      <th className="px-3 py-2 text-center" style={{ width: '120px' }}>Số lượng bàn giao</th>
                      <th className="px-3 py-2 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slipItems.map((item, index) => {
                      const matSource = materials.find(m => m.id === item.materialId);
                      const maxStock = matSource ? matSource.quantity : 0;
                      const hasStockWarning = slipType === 'EXPORT' && item.quantity > maxStock;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/20">
                          {/* Code */}
                          <td className="px-3 py-2 font-mono text-[10px] font-bold text-slate-500">{item.materialCode}</td>
                          {/* Name */}
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-800">{item.materialName}</span>
                            {slipType === 'EXPORT' && (
                              <div className="text-[9px] font-semibold text-slate-400">
                                Số lượng có sẵn trong sê-ri kho: <span className="font-bold text-slate-700">{maxStock} {item.unit}</span>
                              </div>
                            )}
                          </td>
                          {/* Unit */}
                          <td className="px-3 py-2 font-medium text-slate-500">{item.unit}</td>
                          {/* Qty field */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateDraftItem(item.id, 'quantity', Number(e.target.value))}
                              className={`w-full rounded border p-1 text-center font-bold text-slate-800 focus:outline-none ${
                                hasStockWarning ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50'
                              }`}
                            />
                            {hasStockWarning && (
                              <div className="text-[8px] font-bold text-red-600 mt-0.5 whitespace-nowrap">⚠️ Vượt tồn kho ({maxStock})</div>
                            )}
                          </td>
                          {/* Delete Item */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {slipItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Chưa có vật tư nào được chọn. Hãy gõ từ khóa tìm và chọn vật tư từ ô bên trên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {slipItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={3} className="px-3 py-2.5 text-right font-semibold text-slate-500 uppercase">Tổng lượng bàn giao:</td>
                        <td className="px-3 py-2.5 text-center text-xs text-blue-700 font-extrabold whitespace-nowrap">
                          {slipItems.reduce((sum, item) => sum + item.quantity, 0)} đơn vị vật tư
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Submit panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400 italic">
                  * Số lượng vật tư sẽ tự động đồng bộ vào kho gốc ngay khi lưu.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSlip(false)}
                    id="btn-save-slip-only"
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                  >
                    Xác nhận &amp; Lưu Phiếu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSlip(true)}
                    id="btn-save-slip-print"
                    className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
                  >
                    Lưu &amp; Xem/In Phiếu
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT-FRIENDLY BILL-OF-LADING DIALOG / RECEIPT SCREEN */}
      {isPrintOpen && printSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="absolute top-4 right-4 flex items-center space-x-3 no-print">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center space-x-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Xuất file In (PDF/Print)</span>
              </button>
              <button
                onClick={() => {
                  setIsPrintOpen(false);
                  setPrintSlip(null);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document wrapper */}
            <div id="print-sheet-area" className="p-4 bg-white text-slate-900 selection:bg-slate-100 font-sans mt-6">
              {/* Receipt metadata banner heading */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 pb-4 text-xs">
                <div>
                  <h4 className="font-extrabold uppercase tracking-wide text-slate-700 text-[10px] md:text-xs">
                    ỦY BAN HẠ TẦNG KHO Nguyễn Công Trứ / HĐ
                  </h4>
                  <p className="text-[10px] text-slate-500">Mã kho lưu giữ: KHO_NCT_MAIN_2026</p>
                  <p className="text-[10px] text-slate-500">Vị trí giao dịch: {printSlip.warehouseName} - Q. Nguyễn Công Trứ</p>
                </div>
                <div className="md:text-right">
                  <span className="font-semibold text-slate-500">Mẫu số: 02-VT (Ban hành theo TT 200/BTC)</span>
                  <p className="font-mono mt-0.5 text-slate-600">Mã số phiếu: <span className="font-bold text-slate-900">{printSlip.code}</span></p>
                  <p className="text-[10px] text-slate-500">Ngày in chứng từ: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* Central Slip Title */}
              <div className="text-center my-6 space-y-0.5">
                <h1 className="text-xl md:text-2xl font-black uppercase text-slate-950 tracking-tight">
                  {printSlip.type === 'IMPORT' ? 'PHIẾU NHẬP KHO VẬT TƯ' : 'PHIẾU XUẤT KHO VẬT TƯ'}
                </h1>
                <p className="text-xs italic text-slate-500">Ngày lập phiếu: {printSlip.date}</p>
                <p className="text-[11px] font-mono text-slate-400">Số chứng từ gốc: {printSlip.id.toUpperCase()}</p>
              </div>

              {/* Informational elements list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-800 bg-slate-50/60 rounded-lg p-3.5 border border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-500">Bên nhận / Bên giao:</span>
                  <strong className="text-slate-900">{printSlip.partner}</strong>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-500">Lý do điều chuyển:</span>
                  <strong className="text-slate-900">{printSlip.reason}</strong>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-500">Kho xuất / nhập:</span>
                  <strong className="text-blue-700">{printSlip.warehouseName}</strong>
                </div>
                <div className="flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-500">Người lập phiếu:</span>
                  <strong className="text-slate-900">{printSlip.creator}</strong>
                </div>
                {printSlip.notes && (
                  <div className="col-span-2 flex items-start space-x-1.5 pt-1.5 border-t border-slate-200/50">
                    <span className="font-semibold text-slate-500">Ghi chú phiếu:</span>
                    <span className="italic text-slate-600">{printSlip.notes}</span>
                  </div>
                )}
              </div>

              {/* Printable Material Grid Table */}
              <div className="mt-5 border border-slate-400 overflow-hidden rounded-md">
                <table className="w-full text-left text-xs text-slate-900">
                  <thead className="bg-slate-100 border-b border-slate-400 font-bold uppercase tracking-wide text-[10px]">
                    <tr>
                      <th className="px-3 py-2 text-center border-r border-slate-300" style={{ width: '40px' }}>STT</th>
                      <th className="px-3 py-2 border-r border-slate-300">Mã vật tư</th>
                      <th className="px-3 py-2 border-r border-slate-300">Tên nhãn hiệu quy cách vật liệu kỹ thuật</th>
                      <th className="px-3 py-2 text-center border-r border-slate-300">ĐVT</th>
                      <th className="px-3 py-2 text-center">Số lượng bàn giao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {printSlip.items.map((item, index) => (
                      <tr key={item.id || index} className="text-xs">
                        <td className="px-3 py-2.5 text-center border-r border-slate-300 font-bold">{index + 1}</td>
                        <td className="px-3 py-2.5 font-mono font-semibold border-r border-slate-300 text-[11px]">{item.materialCode}</td>
                        <td className="px-3 py-2.5 border-r border-slate-300">
                          <p className="font-extrabold text-slate-950">{item.materialName || (item as any).name}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-slate-300 text-slate-600">{item.unit}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-950 bg-slate-50/40">{item.quantity}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-100/90 font-bold border-t border-slate-400">
                      <td colSpan={4} className="px-3 py-3 text-right font-black uppercase text-[10px] tracking-wider border-r border-slate-300">
                        Tổng cộng khối lượng sê-ri vật tư bàn giao:
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-950 font-extrabold font-mono">
                        {printSlip.items.reduce((sum, item) => sum + item.quantity, 0)} {printSlip.items[0]?.unit || 'vật tư'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Textualized total amount helper */}
              <div className="mt-4 text-xs italic text-slate-700">
                <span>* Chỉ tiêu bàn giao: </span>
                <span className="font-bold font-sans text-slate-900 border-b border-dashed border-slate-300">
                  Hai bên đại diện tiến hành bàn giao đúng quy cách nhãn mác, quy trình kỹ thuật và số lượng thực vật thực tế.
                </span>
              </div>

              {/* Four signatures column grids */}
              <div className="grid grid-cols-4 gap-4 text-center text-xs mt-10 pb-6">
                <div>
                  <strong className="block uppercase text-[10px] text-slate-800">Người lập phiếu</strong>
                  <span className="block text-[10px] text-slate-400 italic font-medium">(Ký, họ tên)</span>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900">{printSlip.creator.split('(')[0].trim()}</p>
                </div>
                <div>
                  <strong className="block uppercase text-[10px] text-slate-800">Người giao hàng</strong>
                  <span className="block text-[10px] text-slate-400 italic"> (Ký, họ tên)</span>
                  <div className="h-16"></div>
                  <p className="text-slate-400 italic">Biên nhận</p>
                </div>
                <div>
                  <strong className="block uppercase text-[10px] text-slate-800">Thủ kho</strong>
                  <span className="block text-[10px] text-slate-400 italic">(Ký, họ tên)</span>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-700">Bảo quản lý</p>
                </div>
                <div>
                  <strong className="block uppercase text-[10px] text-slate-800">Thủ trưởng đơn vị</strong>
                  <span className="block text-[10px] text-slate-400 italic">(Ký, đóng dấu)</span>
                  <div className="h-16"></div>
                  <p className="text-slate-400 italic">Phê duyệt</p>
                </div>
              </div>
            </div>

            {/* Print bottom panel footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => {
                  setIsPrintOpen(false);
                  setPrintSlip(null);
                }}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 transition"
              >
                Đóng trình xem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
