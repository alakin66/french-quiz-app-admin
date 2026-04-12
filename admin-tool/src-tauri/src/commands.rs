use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Serialize, Deserialize)]
pub struct Settings {
    #[serde(rename = "githubUser", default)]
    pub github_user: String,
    #[serde(rename = "githubRepo", default)]
    pub github_repo: String,
    #[serde(rename = "githubToken", default)]
    pub github_token: String,
}

fn is_repo_root(dir: &Path) -> bool {
    (dir.join("admin-tool").exists() && dir.join("data").exists())
        || dir.join(".git").exists()
        || (dir.join("index.html").exists() && dir.join("data").exists())
}

fn repo_root() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    eprintln!("[repo_root] exe = {:?}", exe);

    // Walk up from exe — .app bundles are deep inside target/
    let mut dir = exe.as_path();
    for _ in 0..20 {
        if let Some(p) = dir.parent() {
            dir = p;
            if is_repo_root(dir) {
                eprintln!("[repo_root] found via exe walk: {:?}", dir);
                return Ok(dir.to_path_buf());
            }
        } else {
            break;
        }
    }

    // Fallback: walk up from current working directory
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    eprintln!("[repo_root] cwd = {:?}", cwd);
    let mut dir = cwd.as_path();
    for _ in 0..10 {
        if is_repo_root(dir) {
            eprintln!("[repo_root] found via cwd walk: {:?}", dir);
            return Ok(dir.to_path_buf());
        }
        match dir.parent() {
            Some(p) => dir = p,
            None => break,
        }
    }

    eprintln!("[repo_root] not found, falling back to cwd: {:?}", cwd);
    Ok(cwd)
}

fn settings_path(root: &Path) -> PathBuf {
    root.join("admin-tool").join("settings.json")
}

#[tauri::command]
pub fn read_data() -> Result<String, String> {
    let root = repo_root()?;
    let path = root.join("data").join("quizzes.json");
    eprintln!("[read_data] path = {:?}, exists = {}", path, path.exists());
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_data(json: String) -> Result<(), String> {
    let root = repo_root()?;
    let path = root.join("data").join("quizzes.json");
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_quizzes_js(content: String) -> Result<(), String> {
    let root = repo_root()?;
    let path = root.join("data").join("quizzes.js");
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_publish(commit_msg: String) -> Result<String, String> {
    let root = repo_root()?;
    let settings_file = settings_path(&root);
    let token = if settings_file.exists() {
        fs::read_to_string(&settings_file)
            .ok()
            .and_then(|s| serde_json::from_str::<Settings>(&s).ok())
            .map(|s| s.github_token)
            .filter(|t| !t.is_empty())
    } else {
        None
    };

    let rel_path = "data/quizzes.js";

    run_git(&root, &["add", rel_path])?;

    let status = run_git(&root, &["status", "--porcelain", rel_path])?;
    if status.trim().is_empty() {
        return Ok("Aucun changement à publier.".to_string());
    }

    run_git(&root, &["commit", "-m", &commit_msg])?;

    if let Some(ref tok) = token {
        // Get current remote URL to restore later
        let remote_url = run_git(&root, &["remote", "get-url", "origin"]).unwrap_or_default();
        let remote_url = remote_url.trim().to_string();

        // Build authenticated URL
        let auth_url = if remote_url.starts_with("https://github.com/") {
            remote_url.replacen("https://", &format!("https://{}@", tok), 1)
        } else {
            remote_url.clone()
        };

        run_git(&root, &["remote", "set-url", "origin", &auth_url])?;
        let push_result = run_git(&root, &["push"]);
        // Always restore clean URL
        let _ = run_git(&root, &["remote", "set-url", "origin", &remote_url]);
        push_result?;
    } else {
        run_git(&root, &["push"])?;
    }

    Ok("Publication réussie !".to_string())
}

fn run_git(root: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|e| format!("git error: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn read_settings() -> Result<String, String> {
    let root = repo_root()?;
    let path = settings_path(&root);
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_settings(json: String) -> Result<(), String> {
    let root = repo_root()?;
    let path = settings_path(&root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn debug_log(msg: String) {
    eprintln!("[JS] {msg}"); // v2
}

#[tauri::command]
pub async fn open_and_read_excel_files(app: tauri::AppHandle) -> Result<Vec<(String, Vec<u8>)>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Excel", &["xlsx"])
        .pick_files(move |files| {
            let result: Vec<(String, Vec<u8>)> = files
                .unwrap_or_default()
                .into_iter()
                .filter_map(|fp| {
                    let path = match fp {
                        FilePath::Path(p) => p,
                        FilePath::Url(u) => u.to_file_path().ok()?,
                    };
                    let name = path.file_name()?.to_str()?.to_string();
                    let bytes = fs::read(&path)
                        .map_err(|e| eprintln!("[open_and_read_excel_files] read {:?}: {}", path, e))
                        .ok()?;
                    Some((name, bytes))
                })
                .collect();
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_excel_dialog(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Excel", &["xlsx"])
        .pick_files(move |files| {
            let result: Vec<String> = files
                .unwrap_or_default()
                .into_iter()
                .filter_map(|fp| fp.into_path().ok().and_then(|p| p.to_str().map(String::from)))
                .collect();
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_json_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .pick_file(move |file| {
            let result = file
                .and_then(|fp| fp.into_path().ok())
                .and_then(|p| p.to_str().map(String::from));
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_json_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("quizzes.json")
        .save_file(move |file| {
            let result = file
                .and_then(|fp| fp.into_path().ok())
                .and_then(|p| p.to_str().map(String::from));
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_student_app(query: Option<String>) -> Result<(), String> {
    let root = repo_root()?;
    let index = root.join("index.html");
    if !index.exists() {
        return Err("index.html introuvable dans le dossier racine.".to_string());
    }
    let path = index.to_str().ok_or("Chemin invalide")?;
    let url = format!("file://{}{}", path, query.unwrap_or_default());
    Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_text_file_at(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_file_at(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}
