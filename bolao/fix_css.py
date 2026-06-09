import re
with open('bolao/style.css', encoding='utf-8', errors='replace') as f:
    c = f.read()
clean = ''.join(ch if ord(ch) <= 0x02FF else ' ' for ch in c)
with open('bolao/style.css', 'w', encoding='utf-8') as f:
    f.write(clean)
print('OK, chars:', len(clean))
