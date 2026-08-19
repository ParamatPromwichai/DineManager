'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(res => res.json());
import {
  Plus, Edit, Trash2, Star, CheckCircle2, XCircle,
  ImageOff, UploadCloud, Save, X, Zap, RefreshCw,
  Utensils, Beef, Flame, Drumstick, Fish, Waves, Heart,
  Loader2, Search, Anchor, ChevronDown, ChevronUp, AlignLeft, ListPlus, FileSpreadsheet, Download, FolderOpen
} from 'lucide-react';

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadCsv = (rows: Array<Record<string, string | number>>, fileName: string) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  const [headers = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ''])));
};

// 🟢 เพิ่ม Type สำหรับตัวเลือกเสริมและหมวดหมู่
type MenuOption = {
  id?: number;
  option_group: string;
  option_name: string;
  extra_price: number;
  is_multiple: boolean | number;
};

type GlobalOption = {
  id?: number;
  option_group: string;
  option_name: string;
  extra_price: number;
  is_multiple: boolean | number;
};

type Category = {
  id: number;
  name: string;
};

type Menu = {
  ingredients: any;
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended: boolean;
  is_sold_out?: boolean | number;
  category_id?: number;
  description?: string;
  addon_option_ids?: number[];
};


export default function ManageMenusPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isShop = status === 'authenticated' && (session?.user as any)?.role === 'shop';

  const { data: fetchedMenus, mutate: mutateMenus, isLoading: isMenusLoading } = useSWR<Menu[]>(
    isShop ? '/api/shop/menus' : null,
    fetcher
  );
  const menus = fetchedMenus || [];

  const [categories, setCategories] = useState<Category[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');

  const filteredMenus = useMemo(() => {
    return menus.filter(menu => {
      const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || menu.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menus, searchQuery, selectedCategory]);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formCategoryId, setFormCategoryId] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddonOptionIds, setFormAddonOptionIds] = useState<number[]>([]);

  // Global Options States
  const [isGlobalAddonsModalOpen, setIsGlobalAddonsModalOpen] = useState(false);
  const [globalOptions, setGlobalOptions] = useState<GlobalOption[]>([]);
  const [globalOptionForm, setGlobalOptionForm] = useState<GlobalOption>({ option_group: '', option_name: '', extra_price: 0, is_multiple: true });

  const uniqueGlobalGroups = Array.from(new Set(globalOptions.map(opt => opt.option_group)));

  // จัดกลุ่ม Global Options เพื่อแสดงผล
  const groupedGlobalOptions = useMemo(() => {
    const groups: Record<string, GlobalOption[]> = {};
    globalOptions.forEach(opt => {
      if (!groups[opt.option_group]) groups[opt.option_group] = [];
      groups[opt.option_group].push(opt);
    });
    return groups;
  }, [globalOptions]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSectionOpen, setIsBulkSectionOpen] = useState(false);
  const [quickIngredients, setQuickIngredients] = useState<any[]>([]);
  const [newBulkCategory, setNewBulkCategory] = useState('');

  // Bulk Upload States
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkMenusPreview, setBulkMenusPreview] = useState<any[]>([]);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk Apply Options to Category State
  const [selectedOptionsToApply, setSelectedOptionsToApply] = useState<number[]>([]);
  const [targetCategoryToApply, setTargetCategoryToApply] = useState<number | ''>('');
  const [isApplyingOptions, setIsApplyingOptions] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop');
    } else if (status === 'authenticated') {
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role');
      }
    }
  }, [status, session, router]);

  const fetchMenus = () => {
    mutateMenus();
  };

  const fetchGlobalOptions = async () => {
    try {
      const res = await fetch(`/api/shop/global-options`);
      const data = await res.json();
      setGlobalOptions(data);
    } catch (error) {
      console.error("Error fetching global options", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/shop/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        setCategories([
          { id: 1, name: 'อาหารจานเดียว' }, { id: 2, name: 'เครื่องดื่ม' },
          { id: 3, name: 'ของทานเล่น' }, { id: 4, name: 'ของหวาน' }
        ]);
      }
    } catch (error) {
      console.error("Error fetching categories", error);
    }
  };

  const fetchQuickIngredients = async () => {
    try {
      const res = await fetch(`/api/shop/ingredients`);
      if (res.ok) {
        const data = await res.json();
        setQuickIngredients(data);
      }
    } catch (error) {
      console.error("Error fetching quick ingredients", error);
    }
  };

  const handleAddQuickIngredient = async () => {
    if (!newBulkCategory.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/shop/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBulkCategory.trim() })
      });
      setNewBulkCategory('');
      fetchQuickIngredients();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเพิ่มวัตถุดิบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuickIngredient = async (id: number) => {
    if (!confirm('ยืนยันการลบวัตถุดิบนี้?')) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/shop/ingredients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchQuickIngredients();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการลบวัตถุดิบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && (session.user as any)?.role === 'shop') {
      fetchCategories();
      fetchCategories();
      fetchGlobalOptions();
      fetchQuickIngredients();
    }
  }, [status, session]);

  // 📝 จัดการ Modal
  const handleOpenAdd = () => {
    setFormId(null); setFormName(''); setFormPrice('');
    setImagePreview(''); setImageFile(null);
    setFormCategoryId(''); setFormDescription(''); setFormAddonOptionIds([]);
    setIsEditing(false); setIsModalOpen(true);
  };

  const handleOpenEdit = (menu: Menu) => {
    setFormId(menu.id); setFormName(menu.name); setFormPrice(menu.price);
    setImagePreview(menu.image || ''); setImageFile(null);
    setFormCategoryId(menu.category_id || '');
    setFormDescription(menu.description || '');
    let parsedIds: number[] = [];
    try {
      if (menu.addon_option_ids) {
        parsedIds = typeof menu.addon_option_ids === 'string' ? JSON.parse(menu.addon_option_ids) : menu.addon_option_ids;
      }
    } catch (e) { }
    setFormAddonOptionIds(parsedIds);
    setIsEditing(true); setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('รูปภาพใหญ่เกินไป (กรุณาใช้ไฟล์ขนาดไม่เกิน 2MB)');
        return;
      }
      setImageFile(file); setImagePreview(URL.createObjectURL(file));
    }
  };

  // 💾 บันทึกข้อมูล
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) return alert('กรุณากรอกชื่อและราคาให้ครบถ้วน');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (formId) formData.append('id', formId.toString());
      formData.append('name', formName);
      formData.append('price', formPrice.toString());
      if (formCategoryId) formData.append('category_id', formCategoryId.toString());
      if (formDescription) formData.append('description', formDescription);

      formData.append('addon_option_ids', JSON.stringify(formAddonOptionIds));

      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/shop/menus', {
        method: isEditing ? 'PUT' : 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'บันทึกไม่สำเร็จ');
      }

      setIsModalOpen(false);
      fetchMenus();
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?')) return;
    try {
      const res = await fetch('/api/shop/menus', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'ลบไม่สำเร็จ');
      }

      fetchMenus();
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการลบเมนู');
    }
  };

  // 📝 จัดการ Bulk CSV Upload
  const handleDownloadTemplate = () => {
    downloadCsv([{
      name: 'Sample Menu',
      price: 50,
      category: 'Main Dish',
      description: 'Optional description'
    }], "Template_Menus.csv");
  };

  const processCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = parseCsv(String(evt.target?.result ?? ''));

        const parsedMenus = data.map((row: any) => ({
          name: row['????????'] || row['name'] || '',
          price: row['????'] || row['price'] || 0,
          categoryName: row['????????'] || row['category'] || '',
          description: row['??????????'] || row['description'] || ''
        })).filter((m) => m.name && m.price !== undefined);

        setBulkMenusPreview(parsedMenus);
      } catch (err) {
        alert('??????????????????????????? CSV ????????????????????');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
    e.target.value = ''; // reset input
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCsvFile(file);
  };

  const handlePreviewChange = (index: number, field: string, value: string | number) => {
    const updated = [...bulkMenusPreview];
    updated[index] = { ...updated[index], [field]: value };
    setBulkMenusPreview(updated);
  };

  const handlePreviewDelete = (index: number) => {
    const updated = bulkMenusPreview.filter((_, i) => i !== index);
    setBulkMenusPreview(updated);
  };

  const handleSaveBulk = async () => {
    if (bulkMenusPreview.length === 0) return alert('ไม่มีข้อมูลเมนู');
    setIsUploadingBulk(true);
    try {
      const res = await fetch('/api/shop/menus/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkMenusPreview)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'บันทึกไม่สำเร็จ');
      }
      setIsBulkUploadModalOpen(false);
      setBulkMenusPreview([]);
      fetchMenus();
      alert('เพิ่มเมนูสำเร็จ!');
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const handleApplyOptionsToCategory = async () => {
    if (!targetCategoryToApply) return alert('กรุณาเลือกหมวดหมู่เป้าหมาย');
    if (selectedOptionsToApply.length === 0) return alert('กรุณาเลือกตัวเลือกเสริมอย่างน้อย 1 รายการ');

    setIsApplyingOptions(true);
    try {
      const res = await fetch('/api/shop/global-options/apply-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: targetCategoryToApply,
          option_ids: selectedOptionsToApply
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'เกิดข้อผิดพลาด');
      }

      alert('นำตัวเลือกเสริมไปใช้กับหมวดหมู่สำเร็จ!');
      setSelectedOptionsToApply([]);
      setTargetCategoryToApply('');
      fetchMenus(); // Refresh menu data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsApplyingOptions(false);
    }
  };

  const updateMenuStatus = async (id: number, payload: any) => {
    try {
      await fetch('/api/shop/menus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) });
      fetchMenus();
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const handleBulkAction = async (type: string, typeName: string, action: 'sold_out' | 'available') => {
    const isMarkingSoldOut = action === 'sold_out';
    const actionText = isMarkingSoldOut ? 'หมด' : 'พร้อมขาย';

    if (!confirm(`ยืนยันการเปลี่ยนสถานะเมนู "${typeName}" ทั้งหมด ให้เป็น "${actionText}" ?`)) return;

    const menusToUpdate = menus.filter(m => {
      const isCurrentlySoldOut = Number(m.is_sold_out) === 1 || String(m.is_sold_out).toLowerCase() === 'true';
      if (isMarkingSoldOut && isCurrentlySoldOut) return false;
      if (!isMarkingSoldOut && !isCurrentlySoldOut) return false;
      if (type === 'all') return true;

      return m.name.includes(typeName) || (m.ingredients && m.ingredients.includes(typeName));
    });

    if (menusToUpdate.length === 0) return alert(`ไม่มีเมนูที่ต้องอัปเดตสถานะให้เป็น "${actionText}" แล้ว`);

    setIsSubmitting(true);
    try {
      await Promise.all(menusToUpdate.map(m => fetch('/api/shop/menus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, is_sold_out: isMarkingSoldOut }) })));
      fetchMenus();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูลด่วน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Loading State (Skeleton) ---
  if (status === 'loading' || (isMenusLoading && !fetchedMenus)) {
    return (
      <div className="animate-pulse" style={{ padding: '20px', maxWidth: '850px', margin: '0 auto', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ width: '200px', height: '32px', background: '#e2e8f0', borderRadius: '8px' }}></div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ width: '160px', height: '42px', background: '#e2e8f0', borderRadius: '10px' }}></div>
            <div style={{ width: '150px', height: '42px', background: '#e2e8f0', borderRadius: '10px' }}></div>
            <div style={{ width: '130px', height: '42px', background: '#e2e8f0', borderRadius: '10px' }}></div>
          </div>
        </div>

        {/* Bulk Action Skeleton */}
        <div style={{ width: '100%', height: '56px', background: '#e2e8f0', borderRadius: '16px', marginBottom: '24px' }}></div>

        {/* Menu Items Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', padding: '16px', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '12px', flexShrink: 0 }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                <div style={{ width: '60%', height: '20px', background: '#f1f5f9', borderRadius: '6px' }}></div>
                <div style={{ width: '40%', height: '16px', background: '#f1f5f9', borderRadius: '6px' }}></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '8px' }}></div>
                <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '8px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || (session.user as any)?.role !== 'shop') {
    return null;
  }

  const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' };

  return (
    <div className="p-4 sm:p-5 max-w-[850px] mx-auto pb-24 font-sans">

      {/* 🌟 Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold m-0 flex items-center gap-2 text-slate-800">
          <Utensils size={28} className="text-blue-600" /> จัดการเมนู
        </h1>
        <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsGlobalAddonsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-700 border border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-sm hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <ListPlus size={18} className="text-blue-600 shrink-0" /> <span className="hidden sm:inline">จัดการตัวเลือกเสริม</span><span className="sm:hidden">ตัวเลือกเสริม</span>
          </button>
          <button
            onClick={() => setIsBulkUploadModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white border-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-sm hover:bg-emerald-600 transition-colors shadow-sm whitespace-nowrap"
          >
            <FileSpreadsheet size={18} className="shrink-0" /> <span className="hidden sm:inline">อัปโหลด CSV</span><span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white border-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-sm hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} className="shrink-0" /> <span className="hidden sm:inline">เพิ่มเมนูใหม่</span><span className="sm:hidden">เพิ่ม</span>
          </button>
        </div>
      </div>

      {/* ⚡ แผงจัดการด่วน (Bulk Actions) แบบพับเก็บได้ */}
      <div className="bg-white rounded-2xl mb-6 border border-slate-200 shadow-sm overflow-hidden">
        <div
          onClick={() => setIsBulkSectionOpen(!isBulkSectionOpen)}
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 cursor-pointer transition-colors gap-3 sm:gap-0 ${isBulkSectionOpen ? 'bg-slate-50' : 'bg-white'}`}
        >
          <h3 className="m-0 text-base font-bold text-slate-700 flex items-center gap-2">
            <Zap size={18} className="text-amber-500 fill-amber-500 shrink-0" /> จัดการสถานะวัตถุดิบด่วน
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); handleBulkAction('all', 'ทั้งหมดในร้าน', 'available'); }}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-bold text-sm disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors w-full sm:w-auto justify-center"
            >
              <RefreshCw size={14} className="shrink-0" /> เปิดขายทั้งหมด
            </button>
            <div className="shrink-0">
              {isBulkSectionOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>
        </div>

        {isBulkSectionOpen && (
          <div className="p-4 pt-0 sm:p-5 sm:pt-0 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
              {quickIngredients.map((cat) => (
                <div key={`quick-${cat.id}`} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2.5 items-center relative">
                  <button
                    onClick={() => handleDeleteQuickIngredient(cat.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-[10px] hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  <div className="text-slate-600 text-[13px] font-bold flex items-center gap-1.5 text-center leading-tight">
                    <Utensils size={14} color={cat.color || "#64748b"} className="shrink-0" /> {cat.name}
                  </div>
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={() => handleBulkAction('custom', cat.name, 'sold_out')}
                      disabled={isSubmitting} title="ตั้งเป็นของหมด"
                      className="flex-1 py-1.5 bg-red-100 text-red-500 rounded-lg cursor-pointer flex justify-center hover:bg-red-200 transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleBulkAction('custom', cat.name, 'available')}
                      disabled={isSubmitting} title="ตั้งเป็นพร้อมขาย"
                      className="flex-1 py-1.5 bg-emerald-100 text-emerald-500 rounded-lg cursor-pointer flex justify-center hover:bg-emerald-200 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Input for new custom category */}
            <div className="mt-4 flex gap-2 w-full sm:max-w-[300px]">
              <input
                type="text"
                placeholder="เพิ่มวัตถุดิบใหม่ (เช่น หมูเด้ง)"
                value={newBulkCategory}
                onChange={e => setNewBulkCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickIngredient(); }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-shadow"
                disabled={isSubmitting}
              />
              <button
                onClick={handleAddQuickIngredient}
                disabled={isSubmitting || !newBulkCategory.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer font-bold text-sm hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
              >
                เพิ่ม
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 ค้นหาและตัวกรอง */}
      <div className="flex flex-row gap-2 mb-4 w-full">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อเมนู..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[13px] sm:text-sm font-bold text-slate-700 shadow-sm"
          />
        </div>
        <div className="w-[120px] sm:w-[160px] shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[13px] sm:text-sm font-bold text-slate-700 shadow-sm appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 📋 รายการเมนู */}
      <div className="flex flex-col gap-3">
        {filteredMenus.length === 0 ? (
          <div className="text-center text-slate-400 py-10">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p>ยังไม่มีเมนูในระบบ</p>
          </div>
        ) : null}

        {filteredMenus.map((menu) => {
          const isSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

          return (
            <div key={menu.id} className={`bg-white p-3 sm:p-4 rounded-2xl flex flex-row justify-between items-center border border-slate-200 gap-2 sm:gap-4 transition-opacity ${isSoldOut ? 'opacity-60' : 'opacity-100'}`}>

              <div className="flex flex-row items-center gap-2.5 sm:gap-4 w-full sm:w-auto min-w-0 flex-1">
                <div className="w-14 h-14 sm:w-14 sm:h-14 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  {menu.image ? (
                    <img src={menu.image} alt={menu.name} className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`} />
                  ) : (
                    <ImageOff size={20} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-[14px] sm:text-[1.05rem] text-slate-800 mb-0.5 truncate ${isSoldOut ? 'line-through' : ''}`}>{menu.name}</div>
                  <div className={`font-bold text-[12px] sm:text-sm ${isSoldOut ? 'text-slate-400' : 'text-blue-600'}`}>{menu.price.toLocaleString()} ฿</div>

                  {/* แสดงแถบออปชันใต้ชื่อเมนูในหน้าหลัก */}
                  {menu.addon_option_ids && menu.addon_option_ids.length > 0 ? (
                    <div className="mt-1">
                      <span className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-200 inline-block">
                        + ตัวเลือกเสริม
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-1 shrink-0">
                <button
                  onClick={() => updateMenuStatus(menu.id, { is_sold_out: !isSoldOut })}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-[11px] sm:text-[13px] mr-0 sm:mr-2 ${isSoldOut ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}
                >
                  {isSoldOut ? <><XCircle size={12} className="sm:w-3.5 sm:h-3.5" /> หมด</> : <><CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5" /> มีขาย</>}
                </button>

                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

                <div className="flex items-center gap-1 sm:gap-1">
                  <button
                    title={menu.is_recommended ? "ยกเลิกแนะนำ" : "ตั้งเป็นเมนูแนะนำ"}
                    onClick={() => updateMenuStatus(menu.id, { is_recommended: !menu.is_recommended })}
                    className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition-colors ${menu.is_recommended ? 'bg-yellow-50 text-yellow-500' : 'bg-transparent text-slate-300 hover:bg-slate-50'}`}
                  >
                    <Star size={16} className={`sm:w-[18px] sm:h-[18px] ${menu.is_recommended ? 'fill-yellow-500' : ''}`} />
                  </button>

                  <button title="แก้ไข" onClick={() => handleOpenEdit(menu)} className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors">
                    <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>

                  <button title="ลบ" onClick={() => handleDelete(menu.id)} className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 📝 Popup Modal สร้าง/แก้ไขเมนู */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                {isEditing ? <><Edit size={20} color="#3b82f6" /> แก้ไขเมนู</> : <><Plus size={20} color="#10b981" /> เพิ่มเมนูใหม่</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 120, height: 120, background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageOff size={28} color="#94a3b8" />
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                  <UploadCloud size={16} /> อัปโหลดรูปภาพ
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ชื่อเมนู <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="เช่น ข้าวกะเพราหมูสับ" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ราคา (฿) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} placeholder="0" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>หมวดหมู่อาหาร</label>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem', background: '#fff' }}>
                  <option value="">-- เลือกหมวดหมู่ (ไม่บังคับ) --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold', alignItems: 'center', gap: 6 }}><AlignLeft size={16} /> คำอธิบายเมนู</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="ส่วนผสม หรืออธิบายความอร่อยให้น่าทาน..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>

              {/* เลือกว่าเมนูนี้จะมีตัวเลือกเสริมอะไรบ้าง */}
              <div style={{ background: formAddonOptionIds.length > 0 ? '#eff6ff' : '#f8fafc', padding: 15, borderRadius: 12, border: formAddonOptionIds.length > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}><ListPlus size={18} color={formAddonOptionIds.length > 0 ? "#2563eb" : "#94a3b8"} /> เลือกตัวเลือกเสริมสำหรับเมนูนี้</label>
                  <p style={{ margin: '4px 0 0 24px', fontSize: '0.8rem', color: '#64748b' }}>(ติ๊กเลือกเฉพาะรายการที่ต้องการให้แสดงในเมนูนี้)</p>
                </div>

                {Object.keys(groupedGlobalOptions).length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 0 24px' }}>ยังไม่มีกลุ่มตัวเลือกเสริมในระบบ</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginLeft: 24 }}>
                    {Object.entries(groupedGlobalOptions).map(([group, options]) => (
                      <div key={group}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{group}</div>
                          <button
                            type="button"
                            onClick={() => {
                              const optionIds = options.map(o => o.id!);
                              const allSelected = optionIds.every(id => formAddonOptionIds.includes(id));
                              if (allSelected) {
                                setFormAddonOptionIds(formAddonOptionIds.filter(id => !optionIds.includes(id)));
                              } else {
                                const newIds = new Set([...formAddonOptionIds, ...optionIds]);
                                setFormAddonOptionIds(Array.from(newIds));
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                          >
                            {options.every(o => formAddonOptionIds.includes(o.id!)) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {options.map(opt => (
                            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={formAddonOptionIds.includes(opt.id!)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormAddonOptionIds([...formAddonOptionIds, opt.id!]);
                                  } else {
                                    setFormAddonOptionIds(formAddonOptionIds.filter(id => id !== opt.id));
                                  }
                                }}
                              />
                              {opt.option_name} <span style={{ color: '#2563eb' }}>(+{opt.extra_price}฿)</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isSubmitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึกข้อมูล</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 📝 Popup Modal จัดการตัวเลือกเสริม (Global) */}
      {isGlobalAddonsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '20px', padding: '24px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                <ListPlus size={20} color="#2563eb" /> จัดการตัวเลือกเสริม (ทั้งหมด)
              </h2>
              <button onClick={() => setIsGlobalAddonsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
              {/* Form เพิ่มตัวเลือก */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  const method = globalOptionForm.id ? 'PUT' : 'POST';
                  const res = await fetch('/api/shop/global-options', {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(globalOptionForm)
                  });
                  if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
                  setGlobalOptionForm({ option_group: '', option_name: '', extra_price: 0, is_multiple: true });
                  fetchGlobalOptions();
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>{globalOptionForm.id ? 'แก้ไขตัวเลือก' : 'เพิ่มตัวเลือกใหม่'}</h4>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                  <input
                    type="text"
                    list="global-groups"
                    placeholder="กลุ่ม (พิมพ์ใหม่ หรือเลือกจากรายการ)"
                    value={globalOptionForm.option_group}
                    onChange={e => setGlobalOptionForm({ ...globalOptionForm, option_group: e.target.value })}
                    className="flex-1 p-2.5 rounded-lg border border-slate-300 w-full"
                    required
                  />
                  <datalist id="global-groups">
                    {uniqueGlobalGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                  <input 
                    type="text" 
                    placeholder="ชื่อ (เช่น ไข่ดาว)" 
                    value={globalOptionForm.option_name} 
                    onChange={e => setGlobalOptionForm({ ...globalOptionForm, option_name: e.target.value })} 
                    className="flex-1 p-2.5 rounded-lg border border-slate-300 w-full" 
                    required 
                  />
                </div>
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 whitespace-nowrap">ราคา +</span>
                    <input type="number" value={globalOptionForm.extra_price} onChange={e => setGlobalOptionForm({ ...globalOptionForm, extra_price: Number(e.target.value) })} className="w-20 p-2 rounded-lg border border-slate-300 text-center" />
                    <span className="text-sm text-slate-500">฿</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {globalOptionForm.id && (
                      <button type="button" onClick={() => setGlobalOptionForm({ option_group: '', option_name: '', extra_price: 0, is_multiple: true })} className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg font-bold">
                        ยกเลิก
                      </button>
                    )}
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap disabled:opacity-50">
                      {globalOptionForm.id ? 'บันทึกแก้ไข' : '+ เพิ่ม'}
                    </button>
                  </div>
                </div>
              </form>

              {/* ⚡ นำตัวเลือกไปใช้กับหมวดหมู่ (Bulk Apply Options) */}
              {globalOptions.length > 0 && categories.length > 0 && (
                <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12, border: '1px solid #bfdbfe', marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={18} fill="#3b82f6" color="#3b82f6" /> นำตัวเลือกไปใช้กับหมวดหมู่อาหารแบบรวดเร็ว
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', marginBottom: 6, display: 'block' }}>1. เลือกตัวเลือกเสริม:</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: '100px', overflowY: 'auto', padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        {globalOptions.map(opt => (
                          <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer', background: selectedOptionsToApply.includes(opt.id!) ? '#dbeafe' : '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${selectedOptionsToApply.includes(opt.id!) ? '#93c5fd' : '#e2e8f0'}` }}>
                            <input 
                              type="checkbox" 
                              checked={selectedOptionsToApply.includes(opt.id!)} 
                              onChange={(e) => {
                                if (e.target.checked) setSelectedOptionsToApply([...selectedOptionsToApply, opt.id!]);
                                else setSelectedOptionsToApply(selectedOptionsToApply.filter(id => id !== opt.id));
                              }}
                              style={{ display: 'none' }}
                            />
                            {opt.option_name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', marginBottom: 6, display: 'block' }}>2. เลือกหมวดหมู่อาหารเป้าหมาย:</label>
                        <select 
                          value={targetCategoryToApply} 
                          onChange={e => setTargetCategoryToApply(Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        >
                          <option value="">-- เลือกหมวดหมู่ --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <button 
                        onClick={handleApplyOptionsToCategory}
                        disabled={isApplyingOptions || selectedOptionsToApply.length === 0 || !targetCategoryToApply}
                        style={{ marginTop: '24px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: (isApplyingOptions || selectedOptionsToApply.length === 0 || !targetCategoryToApply) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (isApplyingOptions || selectedOptionsToApply.length === 0 || !targetCategoryToApply) ? 0.6 : 1 }}
                      >
                        {isApplyingOptions ? 'กำลังอัปเดต...' : 'นำไปใช้'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {globalOptions.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>ยังไม่มีตัวเลือกเสริม</p>
                ) : (
                  globalOptions.map(opt => (
                    <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{opt.option_name} <span style={{ color: '#2563eb', fontSize: '0.9rem' }}>(+{opt.extra_price}฿)</span></div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>กลุ่ม: {opt.option_group}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setGlobalOptionForm(opt as GlobalOption)} style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}><Edit size={16} /></button>
                        <button onClick={async () => {
                          if (!confirm('ยืนยันการลบ?')) return;
                          await fetch(`/api/shop/global-options?id=${opt.id}`, { method: 'DELETE' });
                          fetchGlobalOptions();
                        }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Modal อัปโหลด CSV */}
      {isBulkUploadModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '700px', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b', margin: 0 }}>
                <FileSpreadsheet size={24} color="#10b981" /> เพิ่มหลายเมนูผ่าน CSV
              </h2>
              <button onClick={() => { setIsBulkUploadModalOpen(false); setBulkMenusPreview([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Download size={16} className="text-blue-600" /> โหลดไฟล์ Template ต้นแบบ
              </button>
            </div>

            {bulkMenusPreview.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`,
                  background: isDragging ? '#eff6ff' : '#f8fafc',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <UploadCloud size={48} color={isDragging ? '#2563eb' : '#94a3b8'} />
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>
                    ลากไฟล์ CSV (.csv) มาวางที่นี่
                  </p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>หรือ</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <FolderOpen size={16} /> เลือกไฟล์จากเครื่อง
                  <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
              </div>
            )}

            {bulkMenusPreview.length > 0 && (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', minWidth: '150px' }}>ชื่อเมนู</th>
                      <th style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', width: '100px' }}>ราคา (฿)</th>
                      <th style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', minWidth: '120px' }}>หมวดหมู่</th>
                      <th style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', width: '50px', textAlign: 'center' }}>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkMenusPreview.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input 
                            type="text" 
                            value={m.name} 
                            onChange={(e) => handlePreviewChange(i, 'name', e.target.value)} 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input 
                            type="number" 
                            value={m.price} 
                            onChange={(e) => handlePreviewChange(i, 'price', Number(e.target.value))} 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input 
                            type="text" 
                            value={m.categoryName} 
                            onChange={(e) => handlePreviewChange(i, 'categoryName', e.target.value)} 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handlePreviewDelete(i)} 
                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                            title="ลบแถวนี้"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto' }}>
              <button onClick={() => { setIsBulkUploadModalOpen(false); setBulkMenusPreview([]); }} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveBulk} 
                disabled={bulkMenusPreview.length === 0 || isUploadingBulk}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: bulkMenusPreview.length > 0 ? '#10b981' : '#94a3b8', color: 'white', fontWeight: 'bold', cursor: bulkMenusPreview.length > 0 ? 'pointer' : 'not-allowed' }}
              >
                {isUploadingBulk ? 'กำลังบันทึก...' : `ยืนยันและบันทึก (${bulkMenusPreview.length} รายการ)`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}