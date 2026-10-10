with open(r'google-apps-script\Index.html', 'r', encoding='utf-8') as f:
    gas = f.read()

with open(r'index.html', 'r', encoding='utf-8') as f:
    root = f.read()

# Locate the corrupted block in gas Index.html
anchor_start = '          message: "রাতে খাওয়ার পর সকলে যাতে রান্নাঘরের লাইট ও ফ্যান বন্ধ রাখে সে বিষয়ে সতর্ক দৃষ্টি দেওয়ার অনুরোধ রইল।",\n          timestamp: "2026-10-05 21:30",\n'
anchor_end = ': "আগস্ট ২০২৬ (August 2026)",'

pos1 = gas.find(anchor_start)
pos2 = gas.find(anchor_end, pos1)

if pos1 != -1 and pos2 != -1:
    # Find good replacement in root index.html
    r_pos1 = root.find(anchor_start)
    r_pos2 = root.find(anchor_end, r_pos1)
    
    good_chunk = root[r_pos1:r_pos2 + len(anchor_end)]
    bad_chunk_end = pos2 + len(anchor_end)
    
    gas_fixed = gas[:pos1] + good_chunk + gas[bad_chunk_end:]
    with open(r'google-apps-script\Index.html', 'w', encoding='utf-8') as f:
        f.write(gas_fixed)
    print("RESTORED_OK")
else:
    print("FAILED", pos1, pos2)
