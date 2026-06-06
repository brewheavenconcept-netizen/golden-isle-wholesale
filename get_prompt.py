import json
import os

log_path = r'C:\Users\eddyr\.gemini\antigravity-ide\brain\92a0a2a5-604d-4075-9f86-853797affe2a\.system_generated\logs\transcript.jsonl'
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    if '"type":"USER_INPUT"' in line:
        data = json.loads(line)
        content = data['content']
        with open('prompt.md', 'w', encoding='utf-8') as out:
            out.write(content)
        break
