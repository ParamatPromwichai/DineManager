'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit, Trash2, Star, CheckCircle2, XCircle, 
  ImageOff, UploadCloud, Save, X, Zap, RefreshCw, 
  Utensils, Beef, Flame, Drumstick, Fish, Waves, Heart, 
  Loader2, Search, Anchor, ChevronDown, ChevronUp 
} from 'lucide-react';

type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended: boolean;
  is_sold_out?: boolean | number; 
};

// 📌 กำหนดหมวดหมู่และ Icon สำหรับปุ่มจัดการด่วน
const bulkCategories = [
  { id: 'minced_pork', name: 'หมูสับ', icon: Utensils, color: '#ef4444' },
  { id: 'sliced_pork', name: 'หมูชิ้น', icon: Beef, color: '#ef4444' },
  { id: 'crispy_pork', name: 'หมูกรอบ', icon: Flame, color: '#ea580c' },
  { id: 'chicken', name: 'ไก่', icon: Drumstick, color: '#d97706' },
  { id: 'liver', name: 'ตับ/เครื่องใน', icon: Heart, color: '#be185d' },
  { id: 'squid', name: 'หมึก', icon: Anchor, color: '#4f46e5' },
  { id: 'shrimp', name: 'กุ้ง', icon: Fish, color: '#e11d48' },
  { id: 'seafood', name: 'ทะเลรวม', icon: Waves, color: '#0891b2' },
];

export default function ManageMenusPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [imagePreview, setImagePreview] = useState<string>(''); 
  const [imageFile, setImageFile] = useState<File | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔽 State สำหรับเปิด/ปิดแผงจัดการด่วน (ค่าเริ่มต้น false = พับไว้)
  const [isBulkSectionOpen, setIsBulkSectionOpen] = useState(false);

  // 🛡️ เช็คสิทธิ์
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.replace('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // 🚀 โหลดข้อมูล
  const fetchMenus = async () => {
    try {
      const res = await fetch(`/api/customer/menus?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setMenus(data);
    } catch (error) {
      console.error("Error fetching menus", error);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchMenus();
  }, [isAuthorized]);

  // 📝 จัดการ Modal
  const handleOpenAdd = () => {
    setFormId(null); setFormName(''); setFormPrice('');
    setImagePreview(''); setImageFile(null);
    setIsEditing(false); setIsModalOpen(true);
  };

  const handleOpenEdit = (menu: Menu) => {
    setFormId(menu.id); setFormName(menu.name); setFormPrice(menu.price);
    setImagePreview(menu.image || ''); setImageFile(null); 
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

  // 💾 บันทึกข้อมูล (ปรับปรุงการแจ้งเตือน Error)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) return alert('กรุณากรอกชื่อและราคาให้ครบถ้วน');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (formId) formData.append('id', formId.toString());
      formData.append('name', formName);
      formData.append('price', formPrice.toString());
      if (imageFile) formData.append('image', imageFile); 

      const res = await fetch('/api/shop/menus', { 
        method: isEditing ? 'PUT' : 'POST', 
        body: formData 
      });
      
      // ✅ ถ้า Backend ส่ง Error กลับมา ให้แจ้งเตือนสาเหตุที่แท้จริง
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

  // 🗑️ ลบข้อมูล (ปรับปรุงการแจ้งเตือน Error)
  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?')) return;
    try {
      const res = await fetch('/api/shop/menus', { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id }) 
      });
      
      // ✅ แสดงคำแนะนำหากเมนูนั้นเคยถูกสั่งซื้อไปแล้ว (ป้องกัน Database พัง)
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'ลบไม่สำเร็จ');
      }
      
      fetchMenus();
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการลบเมนู');
    }
  };

  // 🔄 อัปเดตสถานะ (API)
  const updateMenuStatus = async (id: number, payload: any) => {
    try {
      await fetch('/api/shop/menus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) });
      fetchMenus();
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  // ⚡ จัดการด่วน (Bulk Actions)
  const handleBulkAction = async (type: string, typeName: string, action: 'sold_out' | 'available') => {
    const isMarkingSoldOut = action === 'sold_out';
    const actionText = isMarkingSoldOut ? 'หมด' : 'พร้อมขาย';

    if (!confirm(`ยืนยันการเปลี่ยนสถานะเมนู "${typeName}" ทั้งหมด ให้เป็น "${actionText}" ?`)) return;

    const menusToUpdate = menus.filter(m => {
      const isCurrentlySoldOut = Number(m.is_sold_out) === 1 || String(m.is_sold_out).toLowerCase() === 'true';
      if (isMarkingSoldOut && isCurrentlySoldOut) return false;
      if (!isMarkingSoldOut && !isCurrentlySoldOut) return false;
      if (type === 'all') return true;

      const name = m.name;
      switch(type) {
        case 'minced_pork': return name.includes('หมูสับ');
        case 'sliced_pork': return name.includes('หมูชิ้น');
        case 'crispy_pork': return name.includes('หมูกรอบ');
        case 'chicken': return name.includes('ไก่');
        case 'liver': return name.includes('ตับ') || name.includes('เครื่องใน');
        case 'squid': return name.includes('หมึก');
        case 'shrimp': return name.includes('กุ้ง');
        case 'seafood': return name.includes('ทะเล');
        default: return false;
      }
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

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#64748b' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' };

  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: '0 auto', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#1e293b' }}>
          <Utensils size={28} color="#2563eb" /> จัดการเมนู
        </h1>
        <button 
          onClick={handleOpenAdd} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}
        >
          <Plus size={18} /> เพิ่มเมนูใหม่
        </button>
      </div>

      {/* ⚡ แผงจัดการด่วน (Bulk Actions) แบบพับเก็บได้ */}
      <div style={{ background: '#fff', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* แถบ Header (กดเพื่อเปิด/ปิด) */}
        <div 
          onClick={() => setIsBulkSectionOpen(!isBulkSectionOpen)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: isBulkSectionOpen ? '#f8fafc' : '#fff', transition: 'background 0.2s' }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#eab308" fill="#eab308" /> จัดการสถานะวัตถุดิบด่วน
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* ปุ่ม Reset แยกออกมาเพื่อกดได้ทันทีโดยไม่ต้องกางแถบ (หยุด event ไม่ให้พับแถบเวลาคลิก) */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleBulkAction('all', 'ทั้งหมดในร้าน', 'available'); }} 
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} /> เปิดขายทั้งหมด
            </button>
            {/* Icon ลูกศรบอกสถานะ */}
            {isBulkSectionOpen ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
          </div>
        </div>

        {/* เนื้อหาที่จะโชว์ตอนกางออก */}
        {isBulkSectionOpen && (
          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '16px' }}>
              {bulkCategories.map((cat) => (
                <div key={cat.id} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <div style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <cat.icon size={16} color={cat.color} /> {cat.name}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                    <button 
                      onClick={() => handleBulkAction(cat.id, cat.name, 'sold_out')} 
                      disabled={isSubmitting} title="ตั้งเป็นของหมด"
                      style={{ flex: 1, padding: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                    >
                      <XCircle size={16} />
                    </button>
                    <button 
                      onClick={() => handleBulkAction(cat.id, cat.name, 'available')} 
                      disabled={isSubmitting} title="ตั้งเป็นพร้อมขาย"
                      style={{ flex: 1, padding: '6px', background: '#dcfce7', color: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 📋 รายการเมนู */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {menus.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
            <Search size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p>ยังไม่มีเมนูในระบบ</p>
          </div>
        ) : null}
        
        {menus.map((menu) => {
          const isSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

          return (
            <div key={menu.id} style={{ background: '#fff', padding: '12px 16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', opacity: isSoldOut ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              
              {/* ข้อมูลด้านซ้าย */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 55, height: 55, background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {menu.image ? (
                    <img src={menu.image} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isSoldOut ? 'grayscale(100%)' : 'none' }} />
                  ) : (
                    <ImageOff size={20} color="#cbd5e1" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#1e293b', marginBottom: '4px', textDecoration: isSoldOut ? 'line-through' : 'none' }}>{menu.name}</div>
                  <div style={{ color: isSoldOut ? '#94a3b8' : '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>{menu.price.toLocaleString()} ฿</div>
                </div>
              </div>

              {/* ปุ่มคำสั่งด้านขวา */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                
                {/* ปุ่มสถานะ พร้อมขาย/หมด (Pill) */}
                <button 
                  onClick={() => updateMenuStatus(menu.id, { is_sold_out: !isSoldOut })} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: '20px', border: 'none', background: isSoldOut ? '#fee2e2' : '#dcfce7', color: isSoldOut ? '#ef4444' : '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '8px' }}
                >
                  {isSoldOut ? <><XCircle size={14} /> หมด</> : <><CheckCircle2 size={14} /> มีขาย</>}
                </button>

                <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

                {/* ปุ่มแนะนำ */}
                <button 
                  title={menu.is_recommended ? "ยกเลิกแนะนำ" : "ตั้งเป็นเมนูแนะนำ"}
                  onClick={() => updateMenuStatus(menu.id, { is_recommended: !menu.is_recommended })} 
                  style={{ ...iconBtnStyle, color: menu.is_recommended ? '#eab308' : '#cbd5e1', background: menu.is_recommended ? '#fef9c3' : 'transparent' }}
                >
                  <Star size={18} fill={menu.is_recommended ? '#eab308' : 'none'} />
                </button>

                {/* ปุ่มแก้ไข */}
                <button title="แก้ไข" onClick={() => handleOpenEdit(menu)} style={{ ...iconBtnStyle, color: '#3b82f6', background: '#eff6ff' }}>
                  <Edit size={18} />
                </button>

                {/* ปุ่มลบ */}
                <button title="ลบ" onClick={() => handleDelete(menu.id)} style={{ ...iconBtnStyle, color: '#ef4444', background: '#fef2f2' }}>
                  <Trash2 size={18} />
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* 📝 Popup Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
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

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ชื่อเมนู <span style={{color: '#ef4444'}}>*</span></label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="เช่น ข้าวกะเพราหมูสับ" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} required />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ราคา (บาท) <span style={{color: '#ef4444'}}>*</span></label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} placeholder="0" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} required />
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
    </div>
  );
}