with open("app_backoffice.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("app_backoffice.py", "w", encoding="utf-8") as f:
    f.writelines(lines[:1403])

print(f"Truncated app_backoffice.py to 1403 lines.")
