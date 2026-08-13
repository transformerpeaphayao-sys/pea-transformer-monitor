from core import init_connection
def patch_sheet():
    client = init_connection()
    try:
        sheet = client.open('วัดโหลดหม้อแปลง หน้างาน').worksheet('Record Data')
    except Exception as e:
        print("Error opening sheet:", e)
        return
        
    new_header = [
        "วันที่", "เวลา", "PEA NO", "แท็ป", "ฟีดเดอร์", "ขนาดสาย (ตร.มม.)",
        "Vใต้หม้อแปลง_ab", "Vใต้หม้อแปลง_bc", "Vใต้หม้อแปลง_ca", "Vใต้หม้อแปลง_an", "Vใต้หม้อแปลง_bn", "Vใต้หม้อแปลง_cn",
        "Vปลายสาย_ab", "Vปลายสาย_bc", "Vปลายสาย_ca", "Vปลายสาย_an", "Vปลายสาย_bn", "Vปลายสาย_cn",
        "กระแส A", "กระแส B", "กระแส C", "กระแส N", "หมายเหตุ", "รูปถ่าย"
    ]
    sheet.update('A1:X1', [new_header])
    print("Header patched successfully!")

if __name__ == '__main__':
    patch_sheet()
