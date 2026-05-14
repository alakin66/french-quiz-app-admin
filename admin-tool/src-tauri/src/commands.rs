use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Serialize, Deserialize, Default)]
pub struct Settings {
    #[serde(rename = "repoPath", default)]
    pub repo_path: String,
    #[serde(rename = "githubUser", default)]
    pub github_user: String,
    #[serde(rename = "githubRepo", default)]
    pub github_repo: String,
    #[serde(rename = "githubToken", default)]
    pub github_token: String,
    #[serde(rename = "llmProvider", default)]
    pub llm_provider: String,
    #[serde(rename = "llmApiKey", default)]
    pub llm_api_key: String,
}

fn expand_tilde(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(path)
}

fn settings_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|d| d.join("settings.json"))
        .map_err(|e| e.to_string())
}

fn read_settings_inner(app_handle: &tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_path(app_handle)?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn repo_root_from_settings(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let settings = read_settings_inner(app_handle)?;
    if settings.repo_path.is_empty() {
        return Err("repoPath non configuré. Veuillez configurer les paramètres.".to_string());
    }
    Ok(expand_tilde(&settings.repo_path))
}

#[tauri::command]
pub fn read_data(app_handle: tauri::AppHandle) -> Result<String, String> {
    let root = repo_root_from_settings(&app_handle)?;
    let path = root.join("data").join("quizzes.json");
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_data(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    let root = repo_root_from_settings(&app_handle)?;
    let path = root.join("data").join("quizzes.json");
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_quizzes_js(app_handle: tauri::AppHandle, content: String) -> Result<(), String> {
    let root = repo_root_from_settings(&app_handle)?;
    let path = root.join("data").join("quizzes.js");
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_publish(app_handle: tauri::AppHandle, commit_msg: String) -> Result<String, String> {
    let root = repo_root_from_settings(&app_handle)?;

    let git_check = Command::new("git")
        .args(["-C", root.to_str().unwrap_or(""), "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|_| "git introuvable. Veuillez installer GitHub Desktop ou Git.".to_string())?;
    if !git_check.status.success() {
        return Err(format!(
            "Le dossier '{}' n'est pas un dépôt git. Veuillez cloner votre dépôt GitHub dans ce dossier via GitHub Desktop.",
            root.display()
        ));
    }

    let settings = read_settings_inner(&app_handle)?;
    let token = if !settings.github_token.is_empty() {
        Some(settings.github_token)
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
        let remote_url = run_git(&root, &["remote", "get-url", "origin"]).unwrap_or_default();
        let remote_url = remote_url.trim().to_string();
        let auth_url = if remote_url.starts_with("https://github.com/") {
            remote_url.replacen("https://", &format!("https://{}@", tok), 1)
        } else {
            remote_url.clone()
        };
        run_git(&root, &["remote", "set-url", "origin", &auth_url])?;
        let push_result = run_git(&root, &["push"]);
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
pub fn read_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = settings_path(&app_handle)?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_settings(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = settings_path(&app_handle)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_repo_path(path: String) -> Result<(), String> {
    let root = expand_tilde(&path);
    let data_dir = root.join("data");
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let json_path = data_dir.join("quizzes.json");
    if !json_path.exists() {
        fs::write(&json_path, "{}").map_err(|e| e.to_string())?;
    }
    let js_path = data_dir.join("quizzes.js");
    if !js_path.exists() {
        fs::write(&js_path, "window.quizzesData = {};\n").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .pick_folder(move |folder| {
            let result = folder
                .and_then(|fp| fp.into_path().ok())
                .and_then(|p| p.to_str().map(String::from));
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn debug_log(msg: String) {
    eprintln!("[JS] {msg}");
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
pub async fn save_named_json_dialog(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&name)
        .save_file(move |file| {
            let result = file
                .and_then(|fp| fp.into_path().ok())
                .and_then(|p| p.to_str().map(String::from));
            let _ = tx.send(result);
        });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_student_app(app_handle: tauri::AppHandle, query: Option<String>) -> Result<(), String> {
    let root = repo_root_from_settings(&app_handle)?;
    let index = root.join("index.html");
    if !index.exists() {
        return Err("index.html introuvable dans le dossier racine.".to_string());
    }
    let path = index.to_str().ok_or("Chemin invalide")?;
    let encoded_path = path.replace(' ', "%20");
    let url = format!("file://{}{}", encoded_path, query.unwrap_or_default());
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
pub fn read_quiz_template() -> &'static str {
    include_str!("../../../quiz-template.json")
}

#[tauri::command]
pub fn write_text_file_at(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}
