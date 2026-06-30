import json

with open('sample_candidates.json', encoding='utf-8') as f:
    data = json.load(f)

# Find Ela Singh or the first candidate with Swiggy
for c in data:
    name = c['profile'].get('anonymized_name', '')
    companies = [r['company'] for r in c.get('career_history', [])]
    if 'Swiggy' in companies or 'Ela' in name:
        print(f"Candidate: {c['candidate_id']} — {name}")
        for i, role in enumerate(c.get('career_history', [])):
            desc = role.get('description', 'NO DESCRIPTION')
            print(f"  Role {i}: {role['company']} | {role['title']}")
            print(f"    desc[:120]: {desc[:120]}")
        print()
