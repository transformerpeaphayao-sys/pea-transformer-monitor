import re

with open('app_backoffice.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

summary_idx = 0
for i, line in enumerate(lines[:1403]):
    if 'elif st.session_state.page == "Summary":' in line or 'if st.session_state.page == "Summary":' in line:
        summary_idx = i
        break

if summary_idx == 0:
    print("Could not find summary_idx!")
    exit(1)

login_start = 0
for i, line in enumerate(lines):
    if 'if st.session_state.page == "Login":' in line:
        login_start = i
        break

summary_dup_start = 0
for i in range(login_start, len(lines)):
    line = lines[i]
    if 'elif st.session_state.page == "Summary":' in line or 'if st.session_state.page == "Summary":' in line:
        summary_dup_start = i
        break

print(f"Summary idx: {summary_idx}")
print(f"Login start: {login_start}")
print(f"Summary dup start: {summary_dup_start}")

if login_start > 0 and summary_dup_start > 0:
    # First chunk: Header + Sidebar (0 to login_start, but wait... Login start is 1404)
    # Ah, wait! The original summary_idx was 240? 
    # Let me see. If login_start is 177, that means "if st.session_state.page == 'Login':" is at 177?
    pass

# We know the duplicate starts at summary_dup_start, and it goes to the end.
# So lines[summary_dup_start:] is the duplicate.
# We also know the original summary was lines[summary_idx : login_start].
# Let's just do exactly what we need to restore it.

# Actually, we know lines[0:1404] is the original file (if login_start is 1404).
# Wait, let's just use the fact that lines[1404:1450] is the login logic, and lines[1451:2624] is the duplicate.
# Wait, my script printed:
# Summary idx: 240
# Login start: 177
# Why is login_start 177?!
# Ah, maybe I injected "if st.session_state.page == "Login":" twice?
