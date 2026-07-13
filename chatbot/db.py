import os
import pymysql
from dotenv import load_dotenv

# โหลดค่า Environment Variables จากไฟล์ .env
load_dotenv()

def connect_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 4000)), # ค่าเริ่มต้นพอร์ตของ TiDB คือ 4000
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        # 🔥 กุญแจสำคัญสำหรับ TiDB: ต้องเปิดใช้งาน SSL เสมอ
        ssl_verify_cert=True,
        ssl_verify_identity=True
    )

def get_all_menus():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT name, price, is_sold_out FROM menus")
    data = cur.fetchall()
    conn.close()
    return data

def get_recommended():
    conn = connect_db()
    cur = conn.cursor(pymysql.cursors.DictCursor)
    query = """
    SELECT m.name, 
           COALESCE(SUM(oi.quantity), 0) AS total_sold,
           COALESCE(AVG(r.rating), 0) AS avg_rating
    FROM menus m
    LEFT JOIN order_items oi ON m.id = oi.menu_id
    LEFT JOIN reviews r ON m.id = r.menu_id
    GROUP BY m.id, m.name
    HAVING total_sold > 0 OR avg_rating > 0
    ORDER BY avg_rating DESC, total_sold DESC
    LIMIT 3
    """
    cur.execute(query)
    data = cur.fetchall()
    
    # ถ้ายังไม่มีข้อมูลการสั่งซื้อเลย ให้ดึงจาก is_recommended ตามเดิม
    if not data:
        cur.execute("SELECT name FROM menus WHERE is_recommended = 1 LIMIT 3")
        fallback_data = cur.fetchall()
        conn.close()
        return [row['name'] for row in fallback_data]

    conn.close()
    
    # จัด format คำตอบให้น่ากิน
    recommended_list = []
    for row in data:
        sold = int(row['total_sold'])
        rating = float(row['avg_rating'])
        
        text = f"⭐ {row['name']}"
        if rating > 0:
            text += f" (รีวิว {rating:.1f}/5"
            if sold > 0:
                text += f", ขายไปแล้ว {sold} จาน)"
            else:
                text += ")"
        elif sold > 0:
            text += f" (ขายดี! สั่งไปแล้ว {sold} จาน)"
            
        recommended_list.append(text)
        
    return recommended_list

def is_shop_open():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT is_open FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    return data[0] == 1 if data else False

def get_queue():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM orders WHERE status IN ('cooking', 'delivery')")
    data = cur.fetchone()
    conn.close()
    return data[0] if data else 0

def get_free_tables():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT name FROM tables WHERE is_occupied = 0")
    data = [x[0] for x in cur.fetchall()]
    conn.close()
    return data

# ==========================================
# ส่วนที่ปรับปรุงใหม่ให้รองรับตาราง `chats`
# ==========================================

def save_chat(user_id, user_message, bot_response):
    conn = connect_db()
    cur = conn.cursor()
    
    # 1. บันทึกข้อความของลูกค้า (sender = 'user')
    cur.execute(
        "INSERT INTO chats (user_id, sender, message) VALUES (%s, %s, %s)",
        (user_id, 'user', user_message)
    )
    
    # 2. บันทึกข้อความที่บอทตอบกลับ (sender = 'bot')
    cur.execute(
        "INSERT INTO chats (user_id, sender, message) VALUES (%s, %s, %s)",
        (user_id, 'bot', bot_response)
    )
    
    conn.commit()
    conn.close()

def get_chat_history(user_id, limit=4): 
    conn = connect_db()
    cur = conn.cursor(pymysql.cursors.DictCursor)
    
    # 🔥 จุดสำคัญ: เปลี่ยน ORDER BY created_at เป็น ORDER BY id DESC 
    # เพื่อแก้ปัญหาข้อความที่บันทึกพร้อมกันใน 1 วินาทีสลับลำดับกัน
    cur.execute(
        "SELECT sender, message FROM chats WHERE user_id=%s ORDER BY id DESC LIMIT %s",
        (user_id, limit)
    )
    data = cur.fetchall()
    conn.close()
    
    return data[::-1]

def get_close_time():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT close_time FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    
    if data and data[0]:
        time_str = str(data[0]) 
        return time_str[:5] 
    return "ไม่ระบุ"

def get_open_time():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT open_time FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    
    if data and data[0]:
        time_str = str(data[0]) 
        return time_str[:5] # ตัดเอาแค่ชั่วโมงกับนาที เช่น "09:00"
    return "ไม่ระบุ"

def get_shop_info():
    conn = connect_db()
    # ใช้ DictCursor เพื่อให้อ่านข้อมูลตามชื่อคอลัมน์ได้ง่ายขึ้น เช่น data['address']
    cur = conn.cursor(pymysql.cursors.DictCursor)
    cur.execute("SELECT name, is_open, open_time, close_time, address, latitude, longitude FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    return data

def get_menu_options_by_name(menu_name):
    conn = connect_db()
    cur = conn.cursor(pymysql.cursors.DictCursor)
    query = """
    SELECT mo.option_name, mo.extra_price
    FROM menu_options mo
    JOIN menus m ON mo.menu_id = m.id
    WHERE m.name = %s
    """
    cur.execute(query, (menu_name,))
    data = cur.fetchall()
    conn.close()
    return data