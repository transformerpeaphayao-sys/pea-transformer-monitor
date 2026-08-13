import os

with open('core.py', 'r', encoding='utf-8') as f:
    content = f.read()

with open('new_css.py', 'r', encoding='utf-8') as f:
    new_css = f.read()

start_marker = 'def load_custom_css():'
# find the start of the line where start_marker is
start_idx = content.find(start_marker)

end_marker = 'def hash_password(password):'
end_idx = content.find(end_marker, start_idx)

if start_idx > -1 and end_idx > -1:
    new_content = content[:start_idx] + new_css + '\n' + content[end_idx:]
    with open('core.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("CSS update successful.")
else:
    print("Could not find markers.")
