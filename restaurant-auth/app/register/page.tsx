import Link from 'next/link';

export default function RegisterSelectPage() {
  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h1>เลือกประเภทการสมัคร</h1>

      <Link href="/register/customer">
        <button
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            cursor: 'pointer',
          }}
        >
          สมัครเป็นลูกค้า
        </button>
      </Link>

      <Link href="/register/shop">
        <button
          style={{
            width: '100%',
            padding: '12px',
            cursor: 'pointer',
          }}
        >
          สมัครเป็นร้านค้า
        </button>
      </Link>
    </div>
  );
}