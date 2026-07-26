
import os

replacements = {
    "Add Item/Service": "Add System",
    "Edit Item": "Edit System",
    "????? ????": "????? ????",
    "????? ??????": "????? ??????"
}

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done")

