const fs = require('fs');
let data = fs.readFileSync('proxy.ts', 'utf8');

const target = `  // 🛡️ 0. ตรวจสอบ IP Blocklist
  try {
    // ดึงข้อมูล IP ที่ถูกบล็อค โดยมีการแคช 60 วินาที
    const res = await fetch(\`\${req.nextUrl.origin}/api/admin/blocked-ips\`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json() as { ips?: Array<{ ip_address: string }> };
      const blockedIps = data.ips?.map((row) => row.ip_address) || [];
      // IP ถูก trim แล้วจากด้านบน
      const clientIp = ip;`;

const replacement = `  // 🛡️ 0. ตรวจสอบ IP Blocklist
  try {
    const now = Date.now();
    // ดึงข้อมูล IP ที่ถูกบล็อค โดยมีการแคช 60 วินาที
    if (!globalBlockedIps || now - lastBlockedIpsFetch > 60000) {
      const res = await fetch(\`\${req.nextUrl.origin}/api/admin/blocked-ips\`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json() as { ips?: Array<{ ip_address: string }> };
        globalBlockedIps = data.ips?.map((row) => row.ip_address) || [];
        lastBlockedIpsFetch = now;
      }
    }
    const blockedIps = globalBlockedIps || [];
    // IP ถูก trim แล้วจากด้านบน
    const clientIp = ip;`;

if(data.includes(target)) {
    fs.writeFileSync('proxy.ts', data.replace(target, replacement));
    console.log('Success');
} else {
    console.log('Target not found');
}
