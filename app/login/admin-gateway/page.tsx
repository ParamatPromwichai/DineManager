'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function AdminGateway() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/admin-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      
      if (res.ok) {
        // Success - redirect to the actual admin login page
        // The middleware will now see the cookie and allow access
        router.push('/login/admin');
      } else {
        setError('รหัสการเข้าถึงไม่ถูกต้อง (Invalid Access Key)');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
      fontFamily: "'Inter', sans-serif" 
    }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'rgba(30, 41, 59, 0.95)', 
        backdropFilter: 'blur(10px)',
        padding: '40px 30px', 
        borderRadius: '20px', 
        color: 'white',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        border: '1px solid #334155',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            padding: '16px', 
            borderRadius: '50%',
            color: '#3b82f6'
          }}>
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', margin: '0 0 5px 0' }}>Secure Gateway</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 25px 0', fontWeight: 'bold' }}>System Administrator Access</p>
        
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="password" 
            value={key} 
            onChange={(e) => setKey(e.target.value)} 
            placeholder="Enter Admin Access Key"
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: '14px 16px', 
              borderRadius: '12px', 
              border: '1.5px solid #334155', 
              background: '#0f172a', 
              color: '#f8fafc',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease'
            }}
            autoFocus
          />
        </div>
        
        {error && <p style={{ color: '#ef4444', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 'bold' }}>{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading || !key}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: (loading || !key) ? '#475569' : '#3b82f6', 
            color: (loading || !key) ? '#94a3b8' : 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: (loading || !key) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 900,
            transition: 'all 0.2s ease',
            boxShadow: (loading || !key) ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          {loading ? "Verifying..." : "Enter System"}
        </button>
        
        <div style={{ marginTop: '20px' }}>
          <a href="/" style={{ color: '#64748b', fontSize: '14px', textDecoration: 'none' }}>
            &larr; กลับหน้าหลัก
          </a>
        </div>
      </form>
    </div>
  );
}
