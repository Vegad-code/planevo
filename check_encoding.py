import os

def check_encoding(directory):
    found_errors = False
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.md', '.sql', '.css', '.json')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                        content.decode('utf-8')
                except UnicodeDecodeError as e:
                    print(f"ENCODING ERROR in {path}: {e}")
                    found_errors = True
    if not found_errors:
        print("No UTF-8 decoding errors found.")

if __name__ == "__main__":
    check_encoding('.')
