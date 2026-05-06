'use client';

import { useEffect, useState } from 'react';

type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended: boolean;
};

export default function ManageMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  
  // States สำหรับจัดการ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // State สำหรับฟอร์ม
  const [formId, setFormId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  
  // 📸 State สำหรับรูปภาพแบบใหม่
  const [imagePreview, setImagePreview] = useState<string>(''); 
  const [imageFile, setImageFile] = useState<File | null>(null); 

  const [isSubmitting, setIsSubmitting] = useState(false);

  // โหลดเมนู
  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/customer/menus');
      const data = await res.json();
      setMenus(data);
    } catch (error) {
      console.error("Error fetching menus", error);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // 📝 เปิด Modal สำหรับ "เพิ่มเมนูใหม่"
  const handleOpenAdd = () => {
    setFormId(null);
    setFormName('');
    setFormPrice('');
    setImagePreview('');
    setImageFile(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // ✏️ เปิด Modal สำหรับ "แก้ไขเมนู"
  const handleOpenEdit = (menu: Menu) => {
    setFormId(menu.id);
    setFormName(menu.name);
    setFormPrice(menu.price);
    setImagePreview(menu.image || ''); 
    setImageFile(null); 
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // 📸 จัดการเมื่อเลือกรูป (สร้าง Preview และเก็บ File)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('รูปภาพใหญ่เกินไป (กรุณาใช้ไฟล์ขนาดไม่เกิน 2MB)');
        return;
      }
      setImageFile(file); 
      setImagePreview(URL.createObjectURL(file)); 
    }
  };

  // 💾 บันทึกข้อมูล (เปลี่ยนมาใช้ FormData สำหรับส่งไฟล์)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      alert('กรุณากรอกชื่อและราคาให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (formId) formData.append('id', formId.toString());
      formData.append('name', formName);
      formData.append('price', formPrice.toString());
      if (imageFile) formData.append('image', imageFile); 

      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch('/api/shop/menus', {
        method,
        body: formData, 
      });

      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');

      alert(isEditing ? 'แก้ไขเมนูเรียบร้อย!' : 'เพิ่มเมนูใหม่เรียบร้อย!');
      setIsModalOpen(false);
      fetchMenus(); 
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ ลบเมนู
  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?')) return;

    try {
      const res = await fetch('/api/shop/menus', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      fetchMenus();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบเมนู');
    }
  };

  // ⭐ สลับสถานะเมนูแนะนำ
  const toggleRecommended = async (id: number, currentStatus: boolean) => {
    try {
      await fetch('/api/shop/menus', {
        method: 'PATCH', // ✅ เปลี่ยนเป็น PATCH แล้ว เพื่อไม่ให้ชนกับ FormData
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_recommended: !currentStatus }),
      });
      fetchMenus();
    } catch (error) {
      console.error("Error toggling recommend status", error);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', paddingBottom: 100 }}>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>📖 จัดการเมนู</h1>
        <button onClick={handleOpenAdd} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
          + เพิ่มเมนูใหม่
        </button>
      </div>
      
      {/* Menu List */}
      <div style={{ display: 'grid', gap: 15 }}>
        {menus.length === 0 ? <p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มีเมนูในระบบ</p> : null}
        
        {menus.map((menu) => (
          <div key={menu.id} style={{ background: 'white', padding: 15, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 60, height: 60, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {menu.image ? (
                  <img src={menu.image} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>🍽️</span>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{menu.name}</div>
                <div style={{ color: '#2563eb', fontWeight: 'bold' }}>{menu.price} ฿</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => toggleRecommended(menu.id, menu.is_recommended)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: menu.is_recommended ? '#fef3c7' : '#f3f4f6', color: menu.is_recommended ? '#d97706' : '#9ca3af', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {menu.is_recommended ? '⭐ แนะนำ' : '⚪ ทั่วไป'}
              </button>
              <button onClick={() => handleOpenEdit(menu)} style={{ padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>✏️ แก้ไข</button>
              <button onClick={() => handleDelete(menu.id)} style={{ padding: '6px 10px', background: '#fef2f2', color: '#b91c1c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>🗑️ ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {/* 📝 Popup Modal สำหรับเพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: 12, padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem' }}>{isEditing ? '✏️ แก้ไขเมนู' : '✨ เพิ่มเมนูใหม่'}</h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              
              {/* ส่วนอัปโหลดรูปภาพ */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 120, height: 120, background: '#f3f4f6', borderRadius: 12, margin: '0 auto 10px auto', overflow: 'hidden', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.9rem' }}>ไม่มีรูปภาพ</span>
                  )}
                </div>
                <label style={{ display: 'inline-block', background: '#e5e7eb', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                  📸 เลือกรูปภาพ
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 5, color: '#444' }}>ชื่อเมนู *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 5, color: '#444' }}>ราคา (บาท) *</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                  {isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}