import os

with open('app_backoffice.py', 'r', encoding='utf-8') as f:
    content = f.read()

with open('new_ui.py', 'r', encoding='utf-8') as f:
    new_ui = f.read()

start_marker = 'session_colors = ["#f0f7ff", "#fff8f0"]'
# find the start of the line where start_marker is
start_idx = content.find(start_marker)
# rewind to the beginning of that line
start_idx = content.rfind('\n', 0, start_idx) + 1

end_marker = 'st.markdown(full_html, unsafe_allow_html=True)'
end_idx = content.find(end_marker, start_idx)
# forward to the end of that line
end_idx = content.find('\n', end_idx) + 1

if start_idx > 0 and end_idx > 0:
    new_content = content[:start_idx] + new_ui + '\n' + content[end_idx:]
    with open('app_backoffice.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("UI update successful.")
else:
    print("Could not find markers.")
