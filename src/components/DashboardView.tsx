/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { Material, InventorySlip, WarehouseStats } from '../types';
import { MaterialImage } from './MaterialImage';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';

interface DashboardViewProps {
  materials: Material[];
  slips: InventorySlip[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ materials, slips, onNavigate }) => {
  // 1. Calculate stats
  const totalItems = materials.length;
  const totalQuantity = materials.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockMaterials = materials.filter(item => item.quantity <= item.minQuantity);
  const lowStockCount = lowStockMaterials.length;

  const importCount = slips.filter(s => s.type === 'IMPORT').length;
  const exportCount = slips.filter(s => s.type === 'EXPORT').length;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // 2. Data for warehouse distribution (Nguyễn Công Trứ vs HĐ)
  const nctMaterials = materials.filter(m => m.location.toLowerCase().includes('nct') || m.location.toLowerCase().includes('nguyễn công trứ'));
  const hdMaterials = materials.filter(m => m.location.toLowerCase().includes('hđ') || m.location.toLowerCase().includes('hd'));
  const otherMaterials = materials.filter(m => !m.location.toLowerCase().includes('nct') && !m.location.toLowerCase().includes('nguyễn công trứ') && !m.location.toLowerCase().includes('hđ') && !m.location.toLowerCase().includes('hd'));

  const warehouseSummaryData = [
    {
      name: 'Kho Nguyễn Công Trứ',
      count: nctMaterials.length,
      qty: nctMaterials.reduce((sum, item) => sum + item.quantity, 0),
      color: '#3b82f6', // blue-500
    },
    {
      name: 'Kho HĐ',
      count: hdMaterials.length,
      qty: hdMaterials.reduce((sum, item) => sum + item.quantity, 0),
      color: '#10b981', // emerald-500
    },
    {
      name: 'Kho Khác / Chưa Phân',
      count: otherMaterials.length,
      qty: otherMaterials.reduce((sum, item) => sum + item.quantity, 0),
      color: '#8b5cf6', // purple-500
    }
  ].filter(d => d.count > 0);

  // 3. Top materials by quantity in stock
  const topAssets = [...materials]
    .map(m => ({
      name: m.name.length > 25 ? m.name.slice(0, 22) + '...' : m.name,
      code: m.code,
      value: m.quantity,
      quantity: m.quantity,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Upper Cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Quantity */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs pro-transition hover:shadow-md hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng vật tư lưu kho</p>
              <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight leading-none">
                {totalQuantity} <span className="text-xs font-normal text-slate-400">sản phẩm</span>
              </h3>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100/50 p-2.5 text-emerald-600 shadow-2xs">
              <Package className="h-5 w-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-5 flex items-center text-[11px] text-slate-500 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <span className="flex items-center text-emerald-600 font-bold whitespace-nowrap mr-2">
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              Tốc độ luân chuyển
            </span>
            <span className="truncate">đáp ứng định mức thi công</span>
          </div>
        </div>

        {/* Card 2: Total Items */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs pro-transition hover:shadow-md hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danh mục vật tư</p>
              <h3 className="mt-3 text-2xl font-extrabold text-slate-950 tracking-tight leading-none">
                {totalItems} <span className="text-xs font-normal text-slate-400">mã loại</span>
              </h3>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100/50 p-2.5 text-blue-600 shadow-2xs">
              <Layers className="h-5 w-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-5 flex items-center text-[11px] text-slate-500 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800 mr-1.5">{totalQuantity}</span>
            <span className="truncate">tổng số lượng đơn vị vật lý</span>
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs pro-transition hover:shadow-md hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cảnh báo tồn kho</p>
              <h3 className={`mt-3 text-2xl font-extrabold tracking-tight leading-none ${lowStockCount > 0 ? 'text-amber-500' : 'text-slate-950'}`}>
                {lowStockCount} <span className="text-xs font-normal text-slate-400">vật tư sắp hết</span>
              </h3>
            </div>
            <div className={`rounded-xl p-2.5 border ${
              lowStockCount > 0 
                ? 'bg-amber-50 border-amber-200/50 text-amber-600 animate-pulse' 
                : 'bg-slate-50 border-slate-200/50 text-slate-400'
            } shadow-2xs`}>
              <AlertTriangle className="h-5 w-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-5 flex items-center text-[11px] text-slate-500 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            {lowStockCount > 0 ? (
              <span className="text-amber-600 font-bold">Cần lập phiếu xuất/nhập bù kho</span>
            ) : (
              <span className="text-emerald-600 font-bold">Số dư kho ở mức an toàn</span>
            )}
          </div>
        </div>

        {/* Card 4: Activity counters */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs pro-transition hover:shadow-md hover:border-slate-300/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhập &amp; Xuất Kho</p>
              <h3 className="mt-3 text-2xl font-extrabold text-slate-950 tracking-tight leading-none">
                {importCount + exportCount} <span className="text-xs font-normal text-slate-400">giao dịch</span>
              </h3>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200/50 p-2.5 text-slate-600 shadow-2xs">
              <Package className="h-5 w-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <span className="flex items-center text-emerald-600 font-bold">
              <ArrowDownRight className="mr-0.5 h-3.5 w-3.5 stroke-[2]" /> {importCount} Nhập PN
            </span>
            <span className="h-3 w-[1px] bg-slate-200 mx-2" />
            <span className="flex items-center text-blue-600 font-bold">
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5 stroke-[2]" /> {exportCount} Xuất PX
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left chart: Quantity shares by warehouse */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs lg:col-span-1 pro-transition hover:border-slate-300">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-5">Thống kê sê-ri sản phẩm</h3>
          <div className="h-64 flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={warehouseSummaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={6}
                  dataKey="qty"
                >
                  {warehouseSummaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="focus:outline-none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} đơn vị`, 'Số lượng lưu kho']}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2 mt-3 text-xs">
              {warehouseSummaryData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({item.count} loại)</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.qty} đv</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center chart: Top assets by quantity */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs lg:col-span-2 pro-transition hover:border-slate-300">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-5">Vật tư có lượng lưu kho lớn nhất</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topAssets}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={10} fontFamily="var(--font-mono)" />
                <YAxis dataKey="name" type="category" stroke="#475569" width={115} fontSize={10} fontWeight={600} />
                <Tooltip 
                  formatter={(value: any) => [`${value} đơn vị`, 'Lượng tồn']}
                  labelFormatter={(label) => `Vật tư: ${label}`}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {topAssets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low stock list & Recent slips */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Low Stock (2 cols) */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between pro-transition hover:border-slate-300">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Cảnh báo tồn tối thiểu</h3>
              <button 
                onClick={() => onNavigate('materials')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center"
              >
                Chi tiết &rarr;
              </button>
            </div>
            {lowStockMaterials.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                🎉 Tất cả vật tư ở mức an toàn.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
                {lowStockMaterials.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 text-xs first:pt-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <MaterialImage name={item.name} code={item.code} image={item.image} className="h-9 w-9 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate leading-tight">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.code} &bull; Định mức: {item.minQuantity} {item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-extrabold text-amber-600 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded text-[11px] inline-block">{item.quantity} {item.unit}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Thiếu {item.minQuantity - item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {lowStockMaterials.length > 0 && (
            <button
              onClick={() => onNavigate('slips')}
              className="w-full mt-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold pro-transition cursor-pointer"
            >
              Lập phiếu nhập kho để bổ sung
            </button>
          )}
        </div>

        {/* Recent Slips (3 cols) */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs lg:col-span-3 pro-transition hover:border-slate-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Phiếu phát sinh gần đây</h3>
            <button 
              onClick={() => onNavigate('slips')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center"
            >
              Quản lý tất cả &rarr;
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg font-bold">Mã phiếu</th>
                  <th className="px-3 py-2.5 font-bold">Kho giao dịch</th>
                  <th className="px-3 py-2.5 font-bold">Người nhận / Bên giao</th>
                  <th className="px-3 py-2.5 font-bold">Ngày giao</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg font-bold">Lượng vật tư</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0, 4).map(slip => (
                  <tr key={slip.id} className="hover:bg-slate-50/50 pro-transition">
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold mr-2 ${
                        slip.type === 'IMPORT' 
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10' 
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10'
                      }`}>
                        {slip.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'}
                      </span>
                      <span className="font-mono font-bold">{slip.code}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-medium whitespace-nowrap">{slip.warehouseName}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700 max-w-[130px] truncate">{slip.partner}</td>
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center font-mono">
                        <Calendar className="mr-1 h-3.5 w-3.5 text-slate-400 stroke-[1.5]" />
                        {slip.date}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                      {slip.items.reduce((sum, item) => sum + item.quantity, 0)} {slip.items[0]?.unit || 'đv'}
                    </td>
                  </tr>
                ))}
                {slips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-405 text-xs font-semibold">
                      Chưa có phiếu nhập xuất nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
