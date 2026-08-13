import json

with open('credentials.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('copy_this_to_secrets.txt', 'w', encoding='utf-8') as out:
    out.write('[gcp_service_account]\n')
    for k, v in data.items():
        if isinstance(v, str):
            if '\\n' in v or '\n' in v:
                out.write(f'{k} = """{v}"""\n')
            else:
                out.write(f'{k} = "{v}"\n')
        else:
            out.write(f'{k} = {v}\n')
