/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Search, 
  Plus, 
  MapPin, 
  AlertTriangle, 
  DollarSign, 
  Grid, 
  List, 
  Upload, 
  Edit, 
  Trash2, 
  Info,
  X,
  PlusCircle,
  Hash,
  FileSpreadsheet,
  Check,
  Image,
  Camera
} from 'lucide-react';
import { Material } from '../types';
import { MaterialImage } from './MaterialImage';

const SHELVES = ['Kệ 1', 'Kệ 2', 'Kệ 3', 'Kệ 4', 'Kệ 5', 'Kệ 6', 'Kệ 7', 'Kệ 8'];
const ROWS = ['Hàng 1', 'Hàng 2', 'Hàng 3', 'Hàng 4', 'Hàng 5'];
const WAREHOUSES = ['Kho Nguyễn Công Trứ', 'Kho HĐ'];

const parseLocationString = (locStr: string) => {
  const norm = locStr || '';
  
  // Find Warehouse
  let warehouse = 'Kho Nguyễn Công Trứ';
  if (norm.toLowerCase().includes('hđ') || norm.toLowerCase().includes('hd')) {
    warehouse = 'Kho HĐ';
  }
  
  // Find Shelf 1-8
  let shelf = 'Kệ 1';
  const shelfMatch = norm.match(/Kệ\s*([1-8])/i);
  if (shelfMatch) {
    shelf = `Kệ ${shelfMatch[1]}`;
  }
  
  // Find Row 1-5
  let row = 'Hàng 1';
  const rowMatch = norm.match(/Hàng\s*([1-5])/i);
  if (rowMatch) {
    row = `Hàng ${rowMatch[1]}`;
  }
  
  return { shelf, row, warehouse };
};

interface MaterialsViewProps {
  materials: Material[];
  onAddMaterial: (material: Material) => void;
  onUpdateMaterial: (material: Material) => void;
  onDeleteMaterial: (id: string) => void;
  isAdmin?: boolean;
  onRequireAdmin?: (action?: () => void) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ 
  materials, 
  onAddMaterial, 
  onUpdateMaterial, 
  onDeleteMaterial,
  isAdmin = false,
  onRequireAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL'); // ALL, NCT, HD, OTHER
  const [alertFilter, setAlertFilter] = useState('ALL'); // ALL, LOW
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Google Spreadsheet connection states
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(() => {
    return localStorage.getItem('kdi_google_spreadsheet_url') || '';
  });
  const [pasteText, setPasteText] = useState('');
  const [parsedMats, setParsedMats] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState('');

  // Default demo template sheet URL
  const defaultTemplateUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUq_N-gA83XNTheLcfk/copy';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Deletion Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  // Inline Editing States
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [inlineCode, setInlineCode] = useState('');
  const [inlineUnit, setInlineUnit] = useState('');
  const [inlineQty, setInlineQty] = useState(0);
  const [inlineMinQty, setInlineMinQty] = useState(5);
  const [inlineUnitPrice, setInlineUnitPrice] = useState(0);
  const [inlineLocation, setInlineLocation] = useState('');
  const [inlineDesc, setInlineDesc] = useState('');
  const [inlineImage, setInlineImage] = useState('');

  // Quick Direct Base64 image upload (saves instantly)
  const handleDirectImageChange = (mat: Material, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert('Dung lượng ảnh lớn hơn 1.5MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUpdateMaterial({
          ...mat,
          image: base64
        });
        // If the same item is opened in details, update it reactively
        if (selectedMaterial && selectedMaterial.id === mat.id) {
          setSelectedMaterial(prev => prev ? { ...prev, image: base64 } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Turn on inline-edit inputs for a card or row
  const startInlineEdit = (mat: Material) => {
    const execute = () => {
      setInlineEditId(mat.id);
      setInlineName(mat.name);
      setInlineCode(mat.code);
      setInlineUnit(mat.unit);
      setInlineQty(mat.quantity);
      setInlineMinQty(mat.minQuantity ?? 5);
      setInlineUnitPrice(mat.unitPrice);
      setInlineLocation(mat.location);
      setInlineDesc(mat.description || '');
      setInlineImage(mat.image || '');
    };

    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin(execute);
    } else {
      execute();
    }
  };

  const openSpreadsheetTool = () => {
    const execute = () => {
      setIsSpreadsheetOpen(true);
    };

    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin(execute);
    } else {
      execute();
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
  };

  // Commit inline edit changes
  const saveInlineEdit = (matId: string) => {
    const original = materials.find(m => m.id === matId);
    if (!original) return;

    if (!inlineName.trim()) {
      alert('Tên vật tư không được để trống.');
      return;
    }

    const matCode = inlineCode.trim().toUpperCase() || original.code;

    // Duplication SKU integrity check
    if (matCode !== original.code) {
      const codeExists = materials.some(m => m.code.toUpperCase() === matCode.toUpperCase() && m.id !== matId);
      if (codeExists) {
        alert('Lỗi: Mã SKU mới đã được sử dụng cho một vật tư khác!');
        return;
      }
    }

    const updated: Material = {
      ...original,
      name: inlineName.trim(),
      code: matCode,
      unit: inlineUnit.trim() || original.unit,
      quantity: Number(inlineQty),
      minQuantity: Number(inlineMinQty),
      unitPrice: Number(inlineUnitPrice),
      location: inlineLocation,
      description: inlineDesc.trim(),
      image: inlineImage
    };

    onUpdateMaterial(updated);
    setInlineEditId(null);

    // Sync selected details view too
    if (selectedMaterial && selectedMaterial.id === matId) {
      setSelectedMaterial(updated);
    }
  };

  // Form Fields State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Cái');
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(5);
  const [unitPrice, setUnitPrice] = useState(0);
  const [location, setLocation] = useState('Khu A (Kho Nguyễn Công Trứ)');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [validationError, setValidationError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Convert File to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setValidationError('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setValidationError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Google Sheet URL saver
  const handleSaveSpreadsheetUrl = (url: string) => {
    setSpreadsheetUrl(url);
    localStorage.setItem('kdi_google_spreadsheet_url', url);
  };

  // Live parser for pasted cells from Spreadsheet (TSV/CSV)
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedMats([]);
      return;
    }
    const lines = text.split('\n');
    const list: any[] = [];
    
    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      // Part with tabs first (Standard spreadsheet cells copy format)
      let parts = cleanLine.split('\t');
      if (parts.length < 2) {
        // Fallback to commas or semicolons
        parts = cleanLine.split(',');
        if (parts.length < 2) {
          parts = cleanLine.split(';');
        }
      }
      
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        const rawCode = parts[0].trim().toUpperCase();
        const rawName = parts[1].trim();
        const rawUnit = parts[2]?.trim() || 'Cái';
        const rawQty = Math.max(0, Number(parts[3]?.trim()) || 0);
        const rawPrice = Math.max(0, Number(parts[4]?.trim().replace(/[^0-9.]/g, '')) || 0);
        const rawLoc = parts[5]?.trim() || 'Khu A (Kho NCT)';
        const rawDesc = parts[6]?.trim() || 'Nhập nhanh từ Spreadsheet';

        list.push({
          code: rawCode,
          name: rawName,
          unit: rawUnit,
          quantity: rawQty,
          unitPrice: rawPrice,
          location: rawLoc,
          description: rawDesc,
          isUpdate: materials.some(m => m.code.toUpperCase() === rawCode)
        });
      }
    });

    setParsedMats(list);
  };

  // Commit importing materials
  const handleCommitImport = () => {
    if (parsedMats.length === 0) return;
    
    let addedCount = 0;
    let updatedCount = 0;
    
    parsedMats.forEach((item, index) => {
      const existing = materials.find(m => m.code.toUpperCase() === item.code.toUpperCase());
      if (existing) {
        onUpdateMaterial({
          ...existing,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          location: item.location,
          description: item.description
        });
        updatedCount++;
      } else {
        onAddMaterial({
          id: `mat_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
          code: item.code,
          name: item.name,
          unit: item.unit,
          image: '',
          quantity: item.quantity,
          minQuantity: 5,
          unitPrice: item.unitPrice,
          location: item.location,
          description: item.description,
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    });

    setImportSummary(`Đã thêm mới thành công ${addedCount} vật tư và cập nhật ${updatedCount} vật tư hiện hữu!`);
    setPasteText('');
    setParsedMats([]);
    
    setTimeout(() => {
      setIsSpreadsheetOpen(false);
      setImportSummary('');
    }, 4000);
  };

  // Handle Save
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError('Tên vật tư không được để trống.');
      return;
    }

    const matCode = code.trim().toUpperCase() || `VT-${Math.floor(1000 + Math.random() * 9000)}`;

    if (modalMode === 'ADD') {
      // Check duplicate code
      const codeExists = materials.some(m => m.code.toUpperCase() === matCode.toUpperCase());
      if (codeExists) {
        setValidationError('Mã vật tư đã tồn tại trên hệ thống!');
        return;
      }

      const newMat: Material = {
        id: `mat_${Date.now()}`,
        code: matCode,
        name: name.trim(),
        unit: unit.trim(),
        image,
        quantity: Number(quantity),
        minQuantity: Number(minQuantity),
        unitPrice: Number(unitPrice),
        location,
        description: description.trim(),
        createdAt: new Date().toISOString()
      };
      onAddMaterial(newMat);
    } else if (modalMode === 'EDIT' && activeMaterial) {
      // Check duplicate code if altered
      if (matCode !== activeMaterial.code) {
        const codeExists = materials.some(m => m.code.toUpperCase() === matCode.toUpperCase() && m.id !== activeMaterial.id);
        if (codeExists) {
          setValidationError('Mã vật tư mới trùng với mã đã tồn tại!');
          return;
        }
      }

      const updatedMat: Material = {
        ...activeMaterial,
        code: matCode,
        name: name.trim(),
        unit: unit.trim(),
        image,
        quantity: Number(quantity),
        minQuantity: Number(minQuantity),
        unitPrice: Number(unitPrice),
        location,
        description: description.trim()
      };
      onUpdateMaterial(updatedMat);
    }

    closeModal();
  };

  const openAddModal = () => {
    const execute = () => {
      setModalMode('ADD');
      setCode('');
      setName('');
      setUnit('Cái');
      setQuantity(0);
      setMinQuantity(5);
      setUnitPrice(0);
      setLocation('Khu A (Kho Nguyễn Công Trứ)');
      setDescription('');
      setImage('');
      setValidationError('');
      setIsModalOpen(true);
    };

    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin(execute);
    } else {
      execute();
    }
  };

  const openEditModal = (mat: Material) => {
    const execute = () => {
      setModalMode('EDIT');
      setActiveMaterial(mat);
      setCode(mat.code);
      setName(mat.name);
      setUnit(mat.unit);
      setQuantity(mat.quantity);
      setMinQuantity(mat.minQuantity ?? 5);
      setUnitPrice(mat.unitPrice);
      setLocation(mat.location);
      setDescription(mat.description || '');
      setImage(mat.image || '');
      setValidationError('');
      setIsModalOpen(true);
    };

    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin(execute);
    } else {
      execute();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveMaterial(null);
  };

  const triggerDeleteTarget = (mat: Material) => {
    const execute = () => {
      setDeleteTarget(mat);
    };

    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin(execute);
    } else {
      execute();
    }
  };

  // Filter materials based on Search & Select dropdowns
  const filteredMaterials = materials.filter(item => {
    // 1. Search term (Code or Name or Location)
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Warehouse filter (NCT, HĐ, other)
    let matchesWarehouse = true;
    const warehouseLower = item.location.toLowerCase();
    if (warehouseFilter === 'NCT') {
      matchesWarehouse = warehouseLower.includes('nct');
    } else if (warehouseFilter === 'HD') {
      matchesWarehouse = warehouseLower.includes('hđ') || warehouseLower.includes('hd');
    } else if (warehouseFilter === 'OTHER') {
      matchesWarehouse = !warehouseLower.includes('nct') && !warehouseLower.includes('hđ') && !warehouseLower.includes('hd');
    }

    // 3. Alert filter (low stock)
    let matchesAlert = true;
    if (alertFilter === 'LOW') {
      matchesAlert = item.quantity <= item.minQuantity;
    }

    return matchesSearch && matchesWarehouse && matchesAlert;
  });

  return (
    <div className="space-y-6">
      {/* Header operations row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Danh mục Vật tư &amp; Sản phẩm</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <p className="text-xs text-slate-500">Quản lý định mức và vị trí vật tư</p>
            {isAdmin ? (
              <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-full text-[9px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
                <span>Quyền Admin: Đầy đủ (Thêm/Sửa/Xóa)</span>
              </span>
            ) : (
              <span className="inline-flex items-center bg-blue-50 text-blue-800 border border-blue-200/65 px-2 py-0.5 rounded-full text-[9px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-1" />
                <span>Thủ kho (Staff): Chỉ xem &amp; Nhập/Xuất phiếu</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Spreadsheet Integrator Link & Fast Import */}
          <button
            onClick={openSpreadsheetTool}
            id="btn-spreadsheet-tool"
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-green-300 bg-green-50 px-3.5 py-2 text-xs font-bold text-green-800 shadow-xs hover:bg-green-100 transition duration-150 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <span>Liên kết &amp; Nhập Google Sheet</span>
          </button>

          <button
            onClick={openAddModal}
            id="btn-add-material"
            className="flex items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Vật tư mới</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs space-y-4 pro-transition hover:border-slate-300">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12 items-center">
          {/* Search box (5 cols) */}
          <div className="relative md:col-span-5">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
            <input
              type="text"
              placeholder="Tìm kiếm vật tư, mã SKU, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-250 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:outline-none pro-transition shadow-2xs"
            />
          </div>

          {/* Warehouse dropdown (3 cols) */}
          <div className="md:col-span-3">
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-250 bg-slate-55/40 p-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:outline-none pro-transition"
            >
              <option value="ALL">Tất cả Kho (Nguyễn Công Trứ + HĐ)</option>
              <option value="NCT">Kho Nguyễn Công Trứ</option>
              <option value="HD">Kho HĐ</option>
              <option value="OTHER">Kho Vị trí Khác</option>
            </select>
          </div>

          {/* Alert Filter (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-250 bg-slate-55/40 p-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:outline-none pro-transition"
            >
              <option value="ALL">Tất cả định mức</option>
              <option value="LOW">⚠️ Sắp hết hạn (Cần nhập)</option>
            </select>
          </div>

          {/* Grid/List toggler (2 cols) */}
          <div className="flex items-center justify-end space-x-1 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 md:col-span-2">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-lg pro-transition cursor-pointer ${viewMode === 'GRID' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 font-bold' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Xem dạng ô lưới"
            >
              <Grid className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-lg pro-transition cursor-pointer ${viewMode === 'LIST' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 font-bold' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Xem dạng danh sách"
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500 shadow-2xs">
          <Info className="mb-2 h-9 w-9 text-slate-300 stroke-[1.5]" />
          <p className="text-sm font-bold text-slate-800">Không tìm thấy vật tư nào thỏa mãn</p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">Hãy kiểm tra từ khóa hoặc bộ lọc của bạn hoặc thêm vật tư mới.</p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredMaterials.map(mat => {
            const isLow = mat.quantity <= mat.minQuantity;
            const isEditing = inlineEditId === mat.id;

            if (isEditing) {
              return (
                <div 
                  key={mat.id} 
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-blue-500 bg-blue-50/15 p-4 shadow-md space-y-3 font-sans animate-fadeIn text-xs"
                >
                  {/* Inline material image input */}
                  <div className="relative overflow-hidden rounded-xl h-28 bg-slate-100 flex items-center justify-center border border-slate-200 group/inline-img">
                    {inlineImage ? (
                      <img src={inlineImage} alt="inline-preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-450 text-[10px]">
                        <Image className="h-6 w-6 mb-1 text-slate-300" />
                        <span className="font-bold">Nhấp để thêm ảnh</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover/inline-img:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                      <Camera className="h-4.5 w-4.5 mb-1 text-white" />
                      <span>{inlineImage ? 'Đổi ảnh mới' : 'Tải lên ảnh'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1.5 * 1024 * 1024) {
                              alert('Ảnh lớn hơn 1.5MB. Vui lòng chọn ảnh nhỏ hơn.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setInlineImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Fields for editing */}
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Tên Vật Tư / Sản Phẩm *</label>
                      <input
                        type="text"
                        value={inlineName}
                        onChange={(e) => setInlineName(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Mã SKU</label>
                        <input
                          type="text"
                          value={inlineCode}
                          onChange={(e) => setInlineCode(e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 font-mono font-extrabold text-slate-850 uppercase focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">ĐVT</label>
                        <input
                          type="text"
                          value={inlineUnit}
                          onChange={(e) => setInlineUnit(e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Số lượng tồn</label>
                        <input
                          type="number"
                          value={inlineQty}
                          onChange={(e) => setInlineQty(Number(e.target.value))}
                          className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Đơn giá (đ)</label>
                        <input
                          type="number"
                          value={inlineUnitPrice}
                          onChange={(e) => setInlineUnitPrice(Number(e.target.value))}
                          className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 font-mono text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Vị Trí Lưu Kho (Kho, Kệ, Hàng)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                        <select
                          value={parseLocationString(inlineLocation).warehouse}
                          onChange={(e) => {
                            const parsed = parseLocationString(inlineLocation);
                            setInlineLocation(`${parsed.shelf} - ${parsed.row} (${e.target.value})`);
                          }}
                          className="rounded border border-slate-300 bg-white px-1 py-1 text-slate-750 font-semibold focus:border-blue-500 focus:outline-none text-[9px] truncate"
                        >
                          {WAREHOUSES.map(w => <option key={w} value={w}>{w === 'Kho Nguyễn Công Trứ' ? 'Kho NCT' : 'Kho HĐ'}</option>)}
                        </select>
                        <select
                          value={parseLocationString(inlineLocation).shelf}
                          onChange={(e) => {
                            const parsed = parseLocationString(inlineLocation);
                            setInlineLocation(`${e.target.value} - ${parsed.row} (${parsed.warehouse})`);
                          }}
                          className="rounded border border-slate-300 bg-white px-1 py-1 text-slate-750 font-semibold focus:border-blue-500 focus:outline-none text-[9px]"
                        >
                          {SHELVES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                          value={parseLocationString(inlineLocation).row}
                          onChange={(e) => {
                            const parsed = parseLocationString(inlineLocation);
                            setInlineLocation(`${parsed.shelf} - ${e.target.value} (${parsed.warehouse})`);
                          }}
                          className="rounded border border-slate-300 bg-white px-1 py-1 text-slate-750 font-semibold focus:border-blue-500 focus:outline-none text-[9px]"
                        >
                          {ROWS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submission and Hủy controls */}
                  <div className="flex items-center justify-end space-x-1 border-t border-slate-105 pt-2 text-[10px]">
                    <button
                      type="button"
                      onClick={cancelInlineEdit}
                      className="rounded border border-slate-250 px-2.5 py-1 font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => saveInlineEdit(mat.id)}
                      className="rounded bg-blue-650 px-3.5 py-1.5 font-bold text-white hover:bg-blue-700 transition cursor-pointer flex items-center space-x-0.5 shadow-xs"
                    >
                      <Check className="h-3 w-3" />
                      <span>Xác nhận</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={mat.id} 
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-xs pro-transition hover:shadow-md hover:border-slate-300 ${
                  isLow ? 'border-l-4 border-l-amber-500' : 'border-slate-200/60'
                }`}
                onDoubleClick={() => startInlineEdit(mat)}
                title="Kích đúp chuột để sửa trực tiếp tại chỗ"
              >
                {/* Image and basic */}
                <div>
                  <div className="relative overflow-hidden rounded-xl group/img">
                    <MaterialImage name={mat.name} code={mat.code} image={mat.image} className="h-36 w-full rounded-xl object-cover pro-transition group-hover/img:scale-105" />
                    
                    {/* Hover direct image edit container overlays */}
                    <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[11px] font-bold">
                      <Camera className="h-6 w-6 mb-1 text-white stroke-[2]" />
                      <span>Thêm / Chọn ảnh trực tiếp</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDirectImageChange(mat, e)}
                        className="hidden"
                      />
                    </label>

                    {isLow && (
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center space-x-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 px-2 py-0.5 text-[9px] font-extrabold shadow-xs backdrop-blur-md">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        <span>Sắp hết</span>
                      </span>
                    )}
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center rounded-lg bg-slate-900/80 px-2.5 py-0.5 text-[9px] font-mono font-bold text-slate-100 backdrop-blur-[2px]">
                      {mat.unit}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">{mat.code}</span>
                      <span className="text-[10px] font-bold text-slate-550 flex items-center bg-slate-50 border border-slate-100/55 px-1.5 py-0.5 rounded">
                        <MapPin className="mr-0.5 h-3 w-3 text-slate-400" />
                        {mat.location.split('(')[0].trim()}
                      </span>
                    </div>
                    <h4 
                      onClick={() => {
                        setSelectedMaterial(mat);
                        setIsDetailOpen(true);
                      }}
                      className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-blue-600 pro-transition cursor-pointer leading-tight h-8"
                    >
                      {mat.name}
                    </h4>
                  </div>
                </div>

                {/* Quantitative info */}
                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Vị trí lưu kho</p>
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[130px]" title={mat.location}>{mat.location.split('(')[0].trim() || 'Chưa phân'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Số lượng tồn</p>
                      <p className={`text-sm font-extrabold ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>{mat.quantity} {mat.unit}</p>
                    </div>
                  </div>
                </div>

                {/* Actions row inside card */}
                <div className="mt-3.5 flex items-center justify-end space-x-1 border-t border-slate-50 pt-2 opacity-0 group-hover:opacity-100 pro-transition duration-200">
                  <button
                    onClick={() => {
                      setSelectedMaterial(mat);
                      setIsDetailOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                    title="Chi tiết"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {/* DIRECT INLINE EDIT MODE TOGGLER */}
                  <button
                    onClick={() => startInlineEdit(mat)}
                    className="p-1 px-1.5 font-bold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/90 rounded text-[10px] border border-blue-200/45 flex items-center space-x-0.5 cursor-pointer"
                    title="Sửa trực tiếp"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Sửa nhanh</span>
                  </button>
                  <button
                    onClick={() => openEditModal(mat)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                    title="Chỉnh sửa Chi tiết"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => triggerDeleteTarget(mat)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                    title="Xóa vật tư"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (TABLE) */
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-605">
              <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left w-14 font-extrabold">Ảnh</th>
                  <th className="px-5 py-3 font-extrabold">Mã vật tư</th>
                  <th className="px-5 py-3 font-extrabold">Tên vật tư</th>
                  <th className="px-5 py-3 font-extrabold">Đơn vị</th>
                  <th className="px-5 py-3 font-extrabold">Vị trí kho</th>
                  <th className="px-5 py-3 text-right font-extrabold">Số lượng tồn</th>
                  <th className="px-5 py-3 text-center font-extrabold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(mat => {
                  const isLow = mat.quantity <= mat.minQuantity;
                  const isEditing = inlineEditId === mat.id;

                  if (isEditing) {
                    return (
                      <tr key={mat.id} className="bg-blue-50/25 divide-x divide-slate-100 transition-colors">
                        {/* Image editable cell */}
                        <td className="px-5 py-2.5">
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg group/list-inline border border-slate-250">
                            {inlineImage ? (
                              <img src={inlineImage} alt="preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                <Image className="h-4 w-4" />
                              </div>
                            )}
                            <label className="absolute inset-0 bg-slate-900/65 flex items-center justify-center opacity-0 group-hover/list-inline:opacity-100 transition-opacity cursor-pointer text-white">
                              <Camera className="h-4.5 w-4.5 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 1.5 * 1024 * 1024) {
                                      alert('Dung lượng ảnh lớn hơn 1.5MB.');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setInlineImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </td>

                        {/* SKU editable */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={inlineCode}
                            onChange={(e) => setInlineCode(e.target.value)}
                            className="w-full max-w-[110px] rounded border border-slate-350 bg-white p-1 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 uppercase text-xs shadow-inner"
                            placeholder="Mã SKU"
                          />
                        </td>

                        {/* Tên & Mức cảnh báo + mô tả */}
                        <td className="px-3 py-2 space-y-1">
                          <input
                            type="text"
                            value={inlineName}
                            onChange={(e) => setInlineName(e.target.value)}
                            className="w-full rounded border border-slate-350 bg-white p-1 font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-xs shadow-inner"
                            placeholder="Tên sản phẩm *"
                          />
                          <div className="flex flex-wrap gap-2.5 pt-0.5 items-center text-[10px]">
                            <span className="text-slate-400 font-semibold">Min:</span>
                            <input
                              type="number"
                              value={inlineMinQty}
                              onChange={(e) => setInlineMinQty(Number(e.target.value))}
                              className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-slate-800 font-mono text-[10px]"
                              title="Cảnh báo tồn tối thiểu"
                            />
                            <span className="text-slate-400 font-semibold">Ghi chú:</span>
                            <input
                              type="text"
                              value={inlineDesc}
                              onChange={(e) => setInlineDesc(e.target.value)}
                              className="flex-1 min-w-[130px] rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700 text-[10px]"
                              placeholder="Mô tả tóm tắt kỹ thuật..."
                            />
                          </div>
                        </td>

                        {/* ĐVT edit */}
                        <td className="px-3 py-2 w-20">
                          <input
                            type="text"
                            value={inlineUnit}
                            onChange={(e) => setInlineUnit(e.target.value)}
                            className="w-full rounded border border-slate-350 bg-white p-1 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 text-xs text-center shadow-inner"
                          />
                        </td>

                        {/* Kho, Kệ, Hàng edit */}
                        <td className="px-3 py-2 min-w-[180px]">
                          <div className="flex flex-col space-y-1">
                            <select
                              value={parseLocationString(inlineLocation).warehouse}
                              onChange={(e) => {
                                const parsed = parseLocationString(inlineLocation);
                                setInlineLocation(`${parsed.shelf} - ${parsed.row} (${e.target.value})`);
                              }}
                              className="w-full rounded border border-slate-350 bg-white p-0.5 text-slate-850 focus:outline-none focus:border-blue-500 text-[10px]"
                            >
                              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-1">
                              <select
                                value={parseLocationString(inlineLocation).shelf}
                                onChange={(e) => {
                                  const parsed = parseLocationString(inlineLocation);
                                  setInlineLocation(`${e.target.value} - ${parsed.row} (${parsed.warehouse})`);
                                }}
                                className="w-full rounded border border-slate-350 bg-white p-0.5 text-slate-850 focus:outline-none focus:border-blue-500 text-[10px]"
                              >
                                {SHELVES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <select
                                value={parseLocationString(inlineLocation).row}
                                onChange={(e) => {
                                  const parsed = parseLocationString(inlineLocation);
                                  setInlineLocation(`${parsed.shelf} - ${e.target.value} (${parsed.warehouse})`);
                                }}
                                className="w-full rounded border border-slate-350 bg-white p-0.5 text-slate-850 focus:outline-none focus:border-blue-500 text-[10px]"
                              >
                                {ROWS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* Số lượng & Đơn giá edit */}
                        <td className="px-3 py-2 text-right space-y-1.5 w-32">
                          <div className="flex justify-end items-center space-x-1">
                            <span className="text-[10px] text-slate-400">Tồn:</span>
                            <input
                              type="number"
                              value={inlineQty}
                              onChange={(e) => setInlineQty(Number(e.target.value))}
                              className="w-16 rounded border border-slate-350 bg-white p-1 text-right font-mono font-extrabold text-slate-900 text-xs shadow-inner"
                            />
                          </div>
                          <div className="flex justify-end items-center space-x-1">
                            <span className="text-[9px] text-slate-400">Đơn giá:</span>
                            <input
                              type="number"
                              value={inlineUnitPrice}
                              onChange={(e) => setInlineUnitPrice(Number(e.target.value))}
                              className="w-20 rounded border border-slate-300 bg-white p-1 text-right font-mono text-slate-700 text-[10px]"
                            />
                          </div>
                        </td>

                        {/* Inline Actions */}
                        <td className="px-3 py-2 w-28">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => saveInlineEdit(mat.id)}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer flex items-center space-x-0.5 shadow-2xs"
                              title="Lưu thay đổi dòng này"
                            >
                              <Check className="h-3 w-3" />
                              <span>Lưu</span>
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition cursor-pointer"
                              title="Bỏ qua"
                            >
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={mat.id} 
                      className="hover:bg-slate-50/50 pro-transition divide-x divide-transparent"
                      onDoubleClick={() => startInlineEdit(mat)}
                      title="Kích đúp chuột để sửa nhanh trực tiếp tại dòng này"
                    >
                      <td className="px-5 py-2.5">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg group/list-img border border-slate-100/55">
                          <MaterialImage name={mat.name} code={mat.code} image={mat.image} className="h-10 w-10 object-cover rounded-lg" />
                          
                          {/* List view Hover Direct Image change */}
                          <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/list-img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                            <Camera className="h-4 w-4 text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDirectImageChange(mat, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{mat.code}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-910 hover:text-blue-650 cursor-pointer pro-transition" onClick={() => { setSelectedMaterial(mat); setIsDetailOpen(true); }}>{mat.name}</div>
                        {isLow && (
                          <span className="inline-flex items-center text-[9px] text-amber-600 bg-amber-55 border border-amber-200 px-1.5 py-0.5 rounded font-black mt-1.5 shadow-3xs animate-pulse">
                            🚨 Định mức tối thiểu: {mat.minQuantity} {mat.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-500">{mat.unit}</td>
                      <td className="px-5 py-3 text-slate-550 font-medium whitespace-nowrap">
                        <div className="flex items-center h-full">
                          <MapPin className="mr-1 h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[125px]">{mat.location}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold whitespace-nowrap">
                        <div className={isLow ? 'text-amber-500 font-black' : 'text-slate-900'}>{mat.quantity} {mat.unit}</div>
                        {mat.unitPrice > 0 && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">{formatVND(mat.unitPrice)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedMaterial(mat);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                            title="Chi tiết"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          {/* SỬA NHANH ON ROW BUTTON */}
                          <button
                            onClick={() => startInlineEdit(mat)}
                            className="p-1 px-1.5 font-bold text-blue-600 hover:text-blue-700 bg-blue-50/75 hover:bg-blue-100 rounded text-[10px] border border-blue-200/50 flex items-center space-x-0.5 cursor-pointer shadow-3xs"
                            title="Sửa nhanh hàng"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Sửa nhanh</span>
                          </button>
                          <button
                            onClick={() => openEditModal(mat)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                            title="Chỉnh sửa chi tiết đầy đủ"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDeleteTarget(mat)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 pro-transition cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE DIALOGS AND MODALS */}

      {/* Add / Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900">
              {modalMode === 'ADD' ? 'Thêm mới Vật tư Kho' : 'Cập nhật Vật tư Kho'}
            </h3>

            {validationError && (
              <div className="flex items-center space-x-1.5 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Tên vật tư / Sản phẩm *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Công tơ điện, Cáp Cadivi..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Mã vật tư (SKU)</label>
                  <input
                    type="text"
                    placeholder="Tự sinh nếu trống"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Đơn vị tính</label>
                  <input
                    type="text"
                    required
                    placeholder="Cái, Bộ, Mét, Cuộn..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Initial/Current Stock */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Tồn kho thực tế</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Warning margin */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Cảnh báo tồn tối thiểu</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>



                {/* Storage Site */}
                <div className="col-span-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">Vị trí kho lắp đặt chi tiết</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Kho lưu trữ</span>
                      <select
                        value={parseLocationString(location).warehouse}
                        onChange={(e) => {
                          const parsed = parseLocationString(location);
                          setLocation(`${parsed.shelf} - ${parsed.row} (${e.target.value})`);
                        }}
                        className="w-full rounded-md border border-slate-200 p-2 text-xs font-semibold text-slate-850 bg-white focus:border-blue-500 focus:outline-none"
                      >
                        {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Số Kệ (1-8)</span>
                      <select
                        value={parseLocationString(location).shelf}
                        onChange={(e) => {
                          const parsed = parseLocationString(location);
                          setLocation(`${e.target.value} - ${parsed.row} (${parsed.warehouse})`);
                        }}
                        className="w-full rounded-md border border-slate-200 p-2 text-xs font-semibold text-slate-850 bg-white focus:border-blue-500 focus:outline-none"
                      >
                        {SHELVES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Số Hàng (1-5)</span>
                      <select
                        value={parseLocationString(location).row}
                        onChange={(e) => {
                          const parsed = parseLocationString(location);
                          setLocation(`${parsed.shelf} - ${e.target.value} (${parsed.warehouse})`);
                        }}
                        className="w-full rounded-md border border-slate-200 p-2 text-xs font-semibold text-slate-850 bg-white focus:border-blue-500 focus:outline-none"
                      >
                        {ROWS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Material image uploads */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Hình ảnh vật liệu</label>
                  <div className="flex items-center space-x-3">
                    {/* Image Preview or Vector representation */}
                    {image ? (
                      <div className="relative h-14 w-14 rounded-lg border border-slate-200 overflow-hidden">
                        <img src={image} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-250 bg-slate-50 text-slate-400">
                        No Image
                      </div>
                    )}

                    {/* Dragger button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition whitespace-nowrap"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                      <span>Chọn file ảnh tải lên</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="upload-material-image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hệ thống chuyển đổi ảnh sang Base64 để lưu cục bộ an toàn (&lt; 1.5MB).</p>
                </div>

                {/* Description */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Ghi chú / Đặc tính kỹ thuật</label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả tóm tắt kỹ thuật hoặc xuất xứ chứng chỉ CO/CQ..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  id="btn-save-material-submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail slide-over or Detail modal */}
      {isDetailOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start space-x-4">
              <div className="relative group/detimg">
                <MaterialImage name={selectedMaterial.name} code={selectedMaterial.code} image={selectedMaterial.image} className="h-24 w-24 flex-shrink-0 object-cover" />
                <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/detimg:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[9px] font-extrabold rounded-lg">
                  <Camera className="h-5 w-5 mb-1" />
                  <span>ĐỔI ẢNH</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDirectImageChange(selectedMaterial, e)}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="space-y-1 flex-1">
                <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 tracking-wider">
                  {selectedMaterial.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedMaterial.name}</h3>
                <p className="text-[11px] text-slate-500 flex items-center">
                  <MapPin className="mr-0.5 h-3.5 w-3.5 text-slate-400" />
                  {selectedMaterial.location}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Số lượng tồn kho:</span>
                <p className="text-lg font-black text-slate-800">
                  {selectedMaterial.quantity} {selectedMaterial.unit}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">Định mức tối thiểu:</span>
                <p className="text-lg font-semibold text-amber-600">
                  {selectedMaterial.minQuantity} {selectedMaterial.unit}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 font-medium">Mô tả chi tiết kỹ thuật:</span>
              <p className="rounded-lg bg-slate-50 p-3 italic text-slate-600 leading-relaxed">
                {selectedMaterial.description || 'Chưa có ghi chú mô tả chi tiết được thiết lập cho vật tư này.'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  startInlineEdit(selectedMaterial);
                }}
                className="rounded-lg bg-blue-50 hover:bg-blue-104 px-4 py-2 text-xs font-bold text-blue-700 transition flex items-center space-x-1 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Chỉnh sửa trực tiếp</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE SPREADSHEET CONFIG & FAST IMPORTER MODAL */}
      {isSpreadsheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
          <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsSpreadsheetOpen(false);
                setPasteText('');
                setParsedMats([]);
                setImportSummary('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title Header */}
            <div>
              <span className="inline-flex rounded-lg bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 ring-1 ring-green-600/10">
                Google Sheets Sync Manager
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
                Liên kết &amp; Nhập nhanh vật tư từ Spreadsheet
              </h3>
              <p className="text-xs text-slate-550 mt-0.5">
                Quản lý kho tự động bằng cách kết nối liên kết Google Sheet của bạn và nhập tải hàng loạt dữ liệu vật tư siêu tốc.
              </p>
            </div>

            {importSummary && (
              <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 border border-emerald-150 p-4 text-xs font-bold text-emerald-800 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{importSummary}</span>
              </div>
            )}

            {/* PART 1: Google Sheet URL configuration link */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-3.5">
              <h4 className="font-bold text-slate-800 text-xs">1. Khai báo liên kết Google Spreadsheet để Quản lý</h4>
              
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="url"
                  placeholder="Dán link chia sẻ Google Spreadsheet của bạn tại đây (https://docs.google.com/...)"
                  value={spreadsheetUrl}
                  onChange={(e) => handleSaveSpreadsheetUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-green-500 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/50 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Mẫu bảng vật tư gốc:</span>
                  <a
                    href={defaultTemplateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-650 hover:underline flex items-center"
                  >
                    Tạo bản sao Mẫu Sheet chuẩn ↗
                  </a>
                </div>
                
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 font-bold text-green-700 bg-green-100/50 border border-green-200 px-3 py-1 rounded-md hover:bg-green-100 transition shadow-2xs"
                  >
                    <span>Mở Google Sheet của bạn ↗</span>
                  </a>
                )}
              </div>
            </div>

            {/* PART 2: Bulk Cell Paste Input Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">2. Dán khối dữ liệu từ Google Sheet để thêm/cập nhật nhanh</h4>
                <span className="text-[10px] text-slate-400 font-mono italic">Định dạng tab-delimited từ phím Ctrl+C</span>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/45 border border-blue-100/55 p-3 rounded-lg">
                <span className="font-black text-blue-800 block mb-0.5">💡 Quy trình bôi đen copy trên Sheet:</span>
                Thứ tự 6 cột cần quét trên File Google Sheet trước khi Copy:
                <div className="mt-1 font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200/60 p-1.5 rounded text-[10px] tracking-wide flex justify-around select-all">
                  <span>[Mã SKU]</span> → <span>[Tên Vật Tư]</span> → <span>[Đơn Vị Tính]</span> → <span>[Tồn Kho]</span> → <span>[Đơn Giá]</span> → <span>[Vị Trí Kho]</span>
                </div>
              </div>

              <textarea
                rows={4}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="Ví dụ dán (Ctrl+V) tại đây:&#10;CADIVI-01	Cáp đồng cadivi 2x4	Cuộn	25	1200000	Khu A (Kho NCT)&#10;PANA-10	Công tắc Panasonic	Cái	120	45000	Khu B (Kho NCT)"
                className="w-full rounded-xl border border-slate-200 font-mono text-[11px] p-3 text-slate-800 focus:border-green-500 focus:outline-none transition-all shadow-2xs bg-slate-50/30"
              />
            </div>

            {/* Preview parsed materials container */}
            {parsedMats.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-850">
                    🔍 Xem trước danh sách nạp ({parsedMats.length} vật tư phát hiện):
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full select-none">
                    Dữ liệu chưa lưu vào sê-ri kho thực tế
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse bg-white">
                    <thead className="bg-[#f8fafc] text-slate-550 border-b border-slate-250 font-bold sticky top-0 uppercase text-[9px] tracking-wider z-10">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-200 text-center">STT</th>
                        <th className="px-3 py-2 border-r border-slate-200">Trạng thái</th>
                        <th className="px-3 py-2 border-r border-slate-200">Mã SKU</th>
                        <th className="px-3 py-2 border-r border-slate-200">Tên vật tư kỹ thuật</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-center">ĐVT</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-right">Số lượng tồn</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-right">Đơn giá (đ)</th>
                        <th className="px-3 py-2">Vị trí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedMats.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-center text-slate-400 font-bold border-r border-slate-100">{index + 1}</td>
                          <td className="px-3 py-2 border-r border-slate-100 whitespace-nowrap">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-extrabold ${
                              item.isUpdate 
                                ? 'bg-amber-50 text-amber-700 border border-amber-250' 
                                : 'bg-blue-50 text-blue-700 border border-blue-250'
                            }`}>
                              {item.isUpdate ? 'CẬP NHẬT TỚI' : 'THÊM MỚI'}
                            </span>
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono font-bold text-slate-900">{item.code}</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-semibold text-slate-800 max-w-[140px] truncate" title={item.name}>{item.name}</td>
                          <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-500 font-medium">{item.unit}</td>
                          <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-900 font-mono">{item.quantity}</td>
                          <td className="px-3 py-2 border-r border-slate-100 text-right font-semibold text-slate-600 font-mono">{formatVND(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-slate-500 truncate text-[10px] font-medium" title={item.location}>{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer triggers */}
            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSpreadsheetOpen(false);
                  setPasteText('');
                  setParsedMats([]);
                  setImportSummary('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={parsedMats.length === 0}
                onClick={handleCommitImport}
                className={`rounded-lg px-5 py-2 text-xs font-extrabold text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5 ${
                  parsedMats.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Nạp {parsedMats.length} vật tư vào Kho</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="delete-confirm-overlay">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              id="close-delete-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-tight">Xác nhận xóa vật tư</h3>
                <p className="text-[10px] text-slate-400">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-xs text-slate-650">
              <p>Bạn có chắc chắn muốn xóa vật tư kỹ thuật sau đây?</p>
              <div className="font-mono bg-white border border-slate-200 p-2.5 rounded-lg text-[11px] text-slate-800 space-y-1">
                <p><span className="text-slate-400 font-bold">Mã SKU:</span> <span className="text-red-600 font-bold">{deleteTarget.code}</span></p>
                <p><span className="text-slate-400 font-bold">Tên vật tư:</span> <span className="font-semibold">{deleteTarget.name}</span></p>
                <p><span className="text-slate-400 font-bold">Tồn hiện tại:</span> {deleteTarget.quantity} {deleteTarget.unit}</p>
                <p><span className="text-slate-400 font-bold">Vị trí:</span> <span className="text-blue-600 font-semibold">{deleteTarget.location}</span></p>
              </div>
              <p className="text-[10px] text-red-500 font-medium">⚠️ Cảnh báo: Việc xóa này có thể làm ảnh hưởng đến dữ liệu hiển thị lịch sử trên các Phiếu xuất/nhập hiện hành.</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                id="cancel-delete-btn"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMaterial(deleteTarget.id);
                  setDeleteTarget(null);
                  // Close detail if opened
                  if (selectedMaterial && selectedMaterial.id === deleteTarget.id) {
                    setIsDetailOpen(false);
                  }
                }}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center space-x-1.5"
                id="confirm-delete-btn"
              >
                <Trash2 className="h-4 w-4" />
                <span>Đồng ý xóa dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
