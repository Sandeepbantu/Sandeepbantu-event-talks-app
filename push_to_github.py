import sys
import os
import requests
import subprocess

def get_token():
    # Try to get from environment first
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
        
    # Attempt GUI prompt via tkinter first
    try:
        import tkinter as tk
        from tkinter import simpledialog
        root = tk.Tk()
        root.withdraw() # hide main window
        token = simpledialog.askstring("GitHub Authentication", 
                                       "Enter your GitHub Personal Access Token (PAT) with 'repo' scope:", 
                                       show='*')
        root.destroy()
        if token:
            return token.strip()
    except Exception:
        # Fallback to CLI if tkinter is not available or errors out
        pass
        
    print("Please paste your GitHub Personal Access Token (PAT) here:")
    token = input().strip()
    return token

def create_github_repo(token, repo_name):
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "name": repo_name,
        "private": False,
        "description": "BigQuery Release Notes Viewer web application built with Python Flask and plain HTML/JS/CSS."
    }
    
    print(f"Creating repository '{repo_name}' on GitHub...")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print("Repository created successfully on GitHub!")
        return response.json()["clone_url"]
    elif response.status_code == 422:
        # 422 usually indicates the repo already exists or there is a validation issue
        print("Repository already exists or name is invalid. Attempting to resolve username and clone URL...")
        user_url = "https://api.github.com/user"
        user_res = requests.get(user_url, headers=headers)
        if user_res.status_code == 200:
            username = user_res.json()["login"]
            print(f"Found GitHub username: {username}")
            return f"https://github.com/{username}/{repo_name}.git"
        else:
            raise Exception("Failed to authorize/fetch GitHub user profile. Check your token scopes.")
    else:
        raise Exception(f"Failed to create repository: HTTP {response.status_code} - {response.text}")

def run_git_commands(git_path, clone_url, token):
    print("Initializing Git repository...")
    subprocess.run([git_path, "init"], check=True)
    
    # Configure user name/email locally if not set (using config values from system check)
    subprocess.run([git_path, "config", "user.name", "Sandeepbantu"], check=True)
    subprocess.run([git_path, "config", "user.email", "b121583@gmail.com"], check=True)
    
    print("Staging files...")
    subprocess.run([git_path, "add", "."], check=True)
    
    print("Committing files...")
    try:
        subprocess.run([git_path, "commit", "-m", "Initial commit: Flask app for BigQuery release notes and X sharing"], check=True)
    except subprocess.CalledProcessError:
        print("Nothing new to commit or commit failed.")
        
    # Rename branch to main
    subprocess.run([git_path, "branch", "-M", "main"], check=True)
    
    # Remove existing origin remote
    subprocess.run([git_path, "remote", "remove", "origin"], stderr=subprocess.DEVNULL)
    
    # Authenticate remote url with token
    auth_clone_url = clone_url.replace("https://github.com/", f"https://{token}@github.com/")
    subprocess.run([git_path, "remote", "add", "origin", auth_clone_url], check=True)
    
    print("Pushing repository to GitHub...")
    subprocess.run([git_path, "push", "-u", "origin", "main"], check=True)
    print("Pushed successfully!")

if __name__ == "__main__":
    repo_name = "Sandeepbantu-event-talks-app"
    git_path = r"C:\Users\Dell\AppData\Local\GitHubDesktop\app-3.5.12\resources\app\git\cmd\git.exe"
    
    token = get_token()
    if not token:
        print("Error: No token provided. Aborting.")
        sys.exit(1)
        
    try:
        clone_url = create_github_repo(token, repo_name)
        run_git_commands(git_path, clone_url, token)
        
        web_url = clone_url.replace(".git", "")
        print(f"\n=======================================================")
        print(f"SUCCESS! Repository is live on GitHub:")
        print(f"👉 {web_url}")
        print(f"=======================================================")
    except Exception as e:
        print(f"\nError pushing to GitHub: {e}", file=sys.stderr)
        sys.exit(1)
