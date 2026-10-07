import os
import re

dir_path = "/home/laziz/Bobololadono"

patterns = [
    # Domain
    (re.compile(r'bobololadono\.uz', re.IGNORECASE), "bobololadono.uz"),
    # Variations
    (re.compile(r'Bobololadono', re.IGNORECASE), "bobololadono"),
    (re.compile(r'Bobololadono', re.IGNORECASE), "bobololadono"),
    (re.compile(r'Bobololadono', re.IGNORECASE), "bobololadono"),
    (re.compile(r'Bobololadono', re.IGNORECASE), "bobololadono"),
    (re.compile(r'bobololadono', re.IGNORECASE), "bobololadono"),
    (re.compile(r'bobololadono', re.IGNORECASE), "bobololadono"),
]

exclude_dirs = {".git", "node_modules", ".next", "dist", "build", "coverage", "out"}

for root, dirs, files in os.walk(dir_path):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.pdf')):
            continue
            
        file_path = os.path.join(root, file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            for regex, replacement in patterns:
                def rep_func(match):
                    original = match.group(0)
                    if replacement == "bobololadono.uz":
                        if original.isupper():
                            return "BOBOLOLADONO.UZ"
                        return "bobololadono.uz"
                    
                    if original.isupper():
                        return "BOBOLOLADONO"
                    elif original.istitle() or original[0].isupper():
                        return "Bobololadono"
                    else:
                        return "bobololadono"

                new_content = regex.sub(rep_func, new_content)
                
            if content != new_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}")
        except Exception as e:
            pass
