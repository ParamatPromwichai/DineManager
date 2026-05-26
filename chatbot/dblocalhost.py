import pymysql

def connect_db():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="restaurant_db1",
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
    cur = conn.cursor()
    cur.execute("SELECT name FROM menus WHERE is_recommended = 1")
    data = [x[0] for x in cur.fetchall()]
    conn.close()
    return data

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
    cur.execute("SELECT remaining_queue FROM queue_status LIMIT 1")
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

def get_chat_history(user_id, limit=10):
    """
    ดึงประวัติแชทล่าสุดของ user คนนั้นๆ เพื่อนำไปแสดงผลหรือส่งให้ AI 
    (เปลี่ยนชื่อจาก get_last_chat ให้ดูสื่อความหมายมากขึ้น)
    """
    conn = connect_db()
    # ใช้ DictCursor เพื่อให้คืนค่ามาเป็น Dictionary (อ่านข้อมูลตาม Key ง่ายกว่า Index)
    cur = conn.cursor(pymysql.cursors.DictCursor) 
    
    # ดึงข้อความล่าสุดจำนวน `limit` ข้อความ (เรียงจากใหม่สุด)
    cur.execute(
        "SELECT sender, message FROM chats WHERE user_id=%s ORDER BY created_at DESC LIMIT %s",
        (user_id, limit)
    )
    data = cur.fetchall()
    conn.close()
    
    # กลับด้าน List (Reverse) เพื่อให้เวลาเอาไปใช้ ข้อความเก่าอยู่บน ข้อความใหม่อยู่ล่าง เหมือนแอปแชททั่วไป
    return data[::-1]


def get_close_time():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT close_time FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    
    if data and data[0]:
        # แปลงเวลาให้อยู่ในรูปแบบ HH:MM น.
        time_str = str(data[0]) 
        return time_str[:5] 
    return "ไม่ระบุ"

def get_shop_info():
    conn = connect_db()
    # ใช้ DictCursor เพื่อให้อ่านข้อมูลตามชื่อคอลัมน์ได้ง่ายขึ้น เช่น data['address']
    cur = conn.cursor(pymysql.cursors.DictCursor)
    cur.execute("SELECT name, is_open, open_time, close_time, address, latitude, longitude FROM shops LIMIT 1")
    data = cur.fetchone()
    conn.close()
    return data

def get_chat_history(user_id, limit=4): # เพิ่ม limit ให้ดึงลึกขึ้นอีกนิด
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