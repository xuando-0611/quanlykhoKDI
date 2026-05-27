/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  Download,
  Info
} from 'lucide-react';
import { Material, InventorySlip } from '../types';

interface ReportViewProps {
  materials: Material[];
  slips: InventorySlip[];
}

export const ReportView: React.FC<ReportViewProps> = ({ materials, slips }) => {
  const [warehouseFilter, setWarehouseFilter] = useState('ALL'); // ALL, NCT, HD
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Calculate Report Data dynamically for each material
  const reportRows = materials.map(item => {
    // 1. Double check warehouse filter. If material doesn't match, we can skip or flag.
    const isNct = item.location.toLowerCase().includes('nct') || item.location.toLowerCase().includes('nguyễn công trứ');
    const isHd = item.location.toLowerCase().includes('hđ') || item.location.toLowerCase().includes('hd');
    
    if (warehouseFilter === 'NCT' && !isNct) return null;
    if (warehouseFilter === 'HD' && !isHd) return null;

    // Filter slips that belong to this warehouse (or all) and date ranges
    const relevantSlips = slips.filter(slip => {
      // Filter by warehouse
      if (warehouseFilter === 'NCT' && slip.warehouseName !== 'Kho Nguyễn Công Trứ' && slip.warehouseName !== 'Kho NCT') return false;
      if (warehouseFilter === 'HD' && slip.warehouseName !== 'Kho HĐ') return false;

      // Filter by dates
      if (startDate && slip.date < startDate) return false;
      if (endDate && slip.date > endDate) return false;

      return true;
    });

    // Calculate sum of imports and exports for this item
    let importedQty = 0;
    let exportedQty = 0;

    relevantSlips.forEach(slip => {
      slip.items.forEach(slipItem => {
        if (slipItem.materialId === item.id) {
          if (slip.type === 'IMPORT') {
            importedQty += slipItem.quantity;
          } else if (slip.type === 'EXPORT') {
            exportedQty += slipItem.quantity;
          }
        }
      });
    });

    // For simplicity: Tồn Cuối Kỳ is exactly what is currently in stock (or we adjust if dates are active)
    // Tồn Đầu Kỳ = Tồn Cuối Kỳ - Nhập + Xuất
    const currentEnding = item.quantity;
    const computedStarting = currentEnding - importedQty + exportedQty;

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      location: item.location,
      startingQty: computedStarting,
      importQty: importedQty,
      exportQty: exportedQty,
      endingQty: currentEnding,
    };
  }).filter(Boolean) as any[];

  // Print-friendly reports drawer trigger
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Báo cáo Nhập Xuất Tồn Sổ Kho</h2>
          <p className="text-xs text-slate-500">Bảng theo dõi định mức tồn kho đầu kỳ, tổng lượng phát sinh xuất/nhập thực tế và sê-ri cuối kỳ.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Control query filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end text-xs">
          {/* Warehouse */}
          <div className="space-y-1">
            <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Lọc theo Kho</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Tất cả kho bãi (Nguyễn Công Trứ + HĐ)</option>
              <option value="NCT">Chỉ Kho Nguyễn Công Trứ</option>
              <option value="HD">Chỉ Kho HĐ</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Từ ngày (Bắt đầu)</label>
            <div className="relative">
              <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Đến ngày (Kết thúc)</label>
            <div className="relative">
              <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action to reset */}
          <div>
            <button
              onClick={() => {
                setWarehouseFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 py-2.5 text-center font-bold text-blue-700 transition"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Report Spreadsheet Sheet-like Representation */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-700">
            <FileSpreadsheet className="h-4.5 w-4.5 text-green-600" />
            <span className="font-extrabold text-slate-800 uppercase tracking-wide">BẢNG NHẬP XUẤT TỒN VẬT TƯ &amp; SẢN PHẨM</span>
          </div>
          <span className="text-[10px] text-slate-400 italic">Thư mục lập báo cáo: KDI-NCT-2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#f8fafc] text-[#475569] border-b-2 border-slate-300 font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 border-r border-[#e2e8f0] text-center" style={{ width: '50px' }}>STT</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] font-extrabold w-28 text-slate-800">Mã VT</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] font-extrabold text-slate-850">Tên nhãn hiệu quy cách vật liệu kỹ thuật</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] text-center w-20 text-slate-600">ĐVT</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] text-center bg-blue-50/40 text-blue-900 font-black w-28">1. Tồn Đầu Kỳ</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] text-center bg-emerald-50/40 text-emerald-950 font-black w-28">2. Nhập Trong Kỳ</th>
                <th className="px-3.5 py-3 border-r border-[#cbd5e1] text-center bg-orange-50/40 text-orange-950 font-black w-28">3. Xuất Trong Kỳ</th>
                <th className="px-3.5 py-3 text-center bg-indigo-50/40 text-indigo-950 font-black w-28">4. Tồn Cuối Kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition font-medium text-slate-800">
                  {/* STT */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-200 font-bold text-slate-400">{idx + 1}</td>
                  {/* Code */}
                  <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{r.code}</td>
                  {/* Name */}
                  <td className="px-3.5 py-2.5 font-bold text-slate-950 border-r border-slate-200 max-w-[200px] truncate" title={r.name}>
                    {r.name}
                  </td>
                  {/* Unit */}
                  <td className="px-3.5 py-2.5 text-center text-slate-500 border-r border-slate-200">{r.unit}</td>

                  {/* Starting stats */}
                  <td className="px-3.5 py-2.5 text-center border-r border-slate-200 bg-blue-50/10 font-bold text-slate-800">{r.startingQty}</td>

                  {/* Import stats */}
                  <td className={`px-3.5 py-2.5 text-center border-r border-slate-200 bg-emerald-50/10 font-bold ${r.importQty > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{r.importQty}</td>

                  {/* Export stats */}
                  <td className={`px-3.5 py-2.5 text-center border-r border-slate-200 bg-orange-50/10 font-bold ${r.exportQty > 0 ? 'text-orange-700' : 'text-slate-400'}`}>{r.exportQty}</td>

                  {/* Ending stats */}
                  <td className="px-3.5 py-2.5 text-center font-extrabold text-indigo-900 bg-indigo-50/15">{r.endingQty}</td>
                </tr>
              ))}
              
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold italic">
                    Không có số liệu báo cáo phù hợp với bộ lọc kho được chọn.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Sum-up Total Row */}
            {reportRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-300">
                  <td colSpan={4} className="px-3.5 py-3.5 text-right uppercase text-[10px] tracking-wider border-r border-slate-200 font-extrabold text-slate-500">
                    TỔNG CỘNG LƯỢNG VẬT TƯ:
                  </td>
                  
                  {/* Total starting qty */}
                  <td className="px-3.5 py-3.5 text-center border-r border-[#cbd5e1] font-extrabold text-slate-800">
                    {reportRows.reduce((sum, r) => sum + r.startingQty, 0)}
                  </td>
                  
                  {/* Total import qty */}
                  <td className="px-3.5 py-3.5 text-center border-r border-[#cbd5e1] font-extrabold text-emerald-800">
                    {reportRows.reduce((sum, r) => sum + r.importQty, 0)}
                  </td>
                  
                  {/* Total export qty */}
                  <td className="px-3.5 py-3.5 text-center border-r border-[#cbd5e1] font-extrabold text-orange-850">
                    {reportRows.reduce((sum, r) => sum + r.exportQty, 0)}
                  </td>
                  
                  {/* Total ending qty */}
                  <td className="px-3.5 py-3.5 text-center font-black text-indigo-950 text-sm">
                    {reportRows.reduce((sum, r) => sum + r.endingQty, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
