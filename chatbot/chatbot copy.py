import random
from db import *
from intent import detect_intents, is_similar

def get_response(msg, user_id):
    msg_lower = msg.lower()
    intents = detect_intents(msg_lower)
    
    # ==========================================
    # 🔥 เช็คว่าลูกค้าสั่งเพิ่มท็อปปิ้ง (ไข่ดาว / ไข่เจียว) ไหม
    # ==========================================
    addon_price = 0
    addons = []
    
    if "ไข่ดาว" in msg_lower:
        addon_price += 10
        addons.append("ไข่ดาว")
    if "ไข่เจียว" in msg_lower:
        addon_price += 10
        addons.append("ไข่เจียว")
        
    # สร้างข้อความต่อท้าย เช่น " + ไข่ดาว" หรือ " + ไข่ดาว + ไข่เจียว"
    addon_text = f" + {' + '.join(addons)}" if addons else ""

    menus = get_all_menus() 
    chat_history = get_chat_history(user_id, limit=2)
    last_user_msg = ""
    
    if chat_history:
        for chat in reversed(chat_history):
            if chat['sender'] == 'user':
                last_user_msg = chat['message'].lower()
                break

    last_menu = None
    if last_user_msg:
        for m in menus:
            if is_similar(last_user_msg, m[0].lower()):
                last_menu = m
                break

    found_menu = None
    for m in menus:
        if is_similar(msg_lower, m[0].lower()):
            found_menu = m
            break

    # ==========================================
    # 🔥 ถามราคาต่อเนื่องจากประโยคที่แล้ว
    # ==========================================
    if not found_menu and last_menu:
        is_out = last_menu[2] 
        
        if "sold_out" in intents:
            if is_out:
                reply = random.choice([f"{last_menu[0]} หมดแล้วครับ ❌", f"วันนี้ {last_menu[0]} หมดครับ ❌"])
            else:
                reply = random.choice([f"{last_menu[0]} ยังมีครับ ✅", f"ยังไม่หมดครับ สั่งได้เลย ✅"])
            save_chat(user_id, msg, reply)
            return reply

        elif "price" in intents:
            # คำนวณราคาเมนูเดิม + ท็อปปิ้งใหม่
            total_price = last_menu[1] + addon_price
            display_name = f"{last_menu[0]}{addon_text}"
            
            reply = random.choice([
                f"{display_name} ราคา {total_price} บาท",
                f"{display_name} {total_price} บาทครับ"
            ])
            if is_out:
                reply += " (แต่วันนี้หมดแล้วนะครับ ❌)"
            save_chat(user_id, msg, reply)
            return reply

    responses = []

    # ==========================================
    # 🔥 ตอบสั้นๆ สลับคำไปมา
    # ==========================================
    
    if "menu" in intents:
        menu_list = "\n".join([f"{m[0]} - {m[1]} บาท" + (" (หมด ❌)" if m[2] else "") for m in menus])
        prefix = random.choice(["เมนู:\n", "รายการอาหาร:\n", "เมนูร้านเรา:\n"])
        responses.append(prefix + menu_list)

    if "recommend" in intents:
        recom = ", ".join(get_recommended())
        responses.append(random.choice([f"เมนูแนะนำ: {recom}", f"แนะนำเป็น: {recom}", f"ขายดี: {recom}"]))

    if "queue" in intents:
        q = get_queue()
        if q == 0:
            responses.append(random.choice(["คิวว่างครับ", "ไม่มีคิวครับ", "คิวว่าง เข้ามาได้เลย"]))
        else:
            responses.append(random.choice([f"ตอนนี้มี {q} คิว", f"รอ {q} คิวครับ", f"มีคิวอยู่ {q} คิว"]))

    if "shop_open" in intents:
        if is_shop_open():
            responses.append(random.choice(["ร้านเปิด 🟢", "เปิดครับ 🟢", "ตอนนี้เปิดอยู่ 🟢"]))
        else:
            responses.append(random.choice(["ร้านปิด 🔴", "ปิดครับ 🔴", "ตอนนี้ปิดแล้ว 🔴"]))

    if "close_time" in intents:
        c_time = get_close_time()
        responses.append(random.choice([f"ร้านปิด {c_time} น. ครับ", f"ปิดตอน {c_time} ครับ", f"วันนี้ปิด {c_time} น. ครับ"]))

    # ==========================================
    # 🔥 ตอบคำถามเรื่องที่อยู่และแผนที่ (Google Maps)
    # ==========================================
    if "shop_address" in intents:
        shop_info = get_shop_info()
        if shop_info:
            addr = shop_info.get('address', 'ไม่ระบุ')
            lat = shop_info.get('latitude')
            lon = shop_info.get('longitude')
            
            # ถ้ามีทั้งละติจูดและลองติจูด ให้สร้างลิ้งก์แผนที่
            if lat and lon:
                # สร้างลิ้งก์แบบมี Pin ปักตรงจุดเป๊ะๆ
                map_url = f"https://maps.google.com/?q={lat},{lon}"
                responses.append(random.choice([
                    f"ร้านอยู่ที่:\n📍 {addr}\n🗺️ แผนที่นำทาง: {map_url}",
                    f"พิกัดร้านตามนี้เลยครับ 🚗\n{addr}\n📍 กดดูแผนที่: {map_url}"
                ]))
            elif addr != 'ไม่ระบุ':
                # ถ้ามีแค่ข้อความที่อยู่ ไม่มีพิกัด
                responses.append(f"ร้านตั้งอยู่ที่: {addr} ครับ")
            else:
                responses.append("ทางร้านยังไม่ได้ระบุที่อยู่ในระบบครับ")

    if "table" in intents:
        free_tables = get_free_tables()
        if free_tables:
            tables_str = ", ".join(free_tables)
            responses.append(random.choice([f"โต๊ะว่าง: {tables_str}", f"มีโต๊ะ {tables_str} ว่างครับ"]))
        else:
            responses.append(random.choice(["โต๊ะเต็มครับ", "ตอนนี้เต็มหมดเลย", "ไม่มีโต๊ะว่างครับ"]))

    # 🔥 ตอบเรื่องเมนู + ท็อปปิ้ง ที่เจอในประโยคปัจจุบัน
    if found_menu:
        is_out = found_menu[2]
        total_price = found_menu[1] + addon_price
        display_name = f"{found_menu[0]}{addon_text}"

        if "sold_out" in intents:
            if is_out:
                menu_reply = random.choice([f"{found_menu[0]} หมดแล้วครับ ❌", f"เสียใจด้วยครับ {found_menu[0]} หมดแล้ว ❌"])
            else:
                menu_reply = random.choice([f"{found_menu[0]} ยังมีอยู่ครับ ✅", f"ยังมีครับ สั่งได้เลย ✅"])
        else:
            # แจ้งราคาพร้อมท็อปปิ้ง
            menu_reply = random.choice([
                f"{display_name} ราคา {total_price} บาท", 
                f"{display_name} {total_price} บาทครับ"
            ])
            if is_out:
                menu_reply += " (แต่วันนี้หมดแล้วนะครับ ❌)"

        if not any(found_menu[0] in r for r in responses): 
            responses.append(menu_reply)

    if not responses or intents == ["unknown"]:
        reply = random.choice([
            "ลองถามเกี่ยวกับ เมนู / ราคา / เวลาปิด / คิว / โต๊ะ ได้เลย 😊",
            "พิมพ์ถาม เมนู, ราคา, คิว, โต๊ะ ได้เลยครับ 😊",
            "ถามเรื่อง เมนู / ราคา / โต๊ะ / คิว ได้เลย 😊"
        ])
    else:
        reply = "\n\n".join(responses)

    save_chat(user_id, msg, reply)
    return reply