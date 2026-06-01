use std::fs;
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Serialize, Deserialize, Default)]
pub struct Settings {
    #[serde(rename = "workingDir", default)]
    pub working_dir: String,
    #[serde(rename = "githubRepo", default)]
    pub github_repo: String,
    #[serde(rename = "githubToken", default)]
    pub github_token: String,
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

fn working_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let settings = read_settings_inner(app_handle)?;
    if settings.working_dir.is_empty() {
        return Err("Dossier de travail non configuré. Voir Paramètres.".to_string());
    }
    Ok(expand_tilde(&settings.working_dir))
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
pub fn init_working_dir(path: String) -> Result<(), String> {
    let root = expand_tilde(&path);
    for sub in ["data", "questionnaires", "excel", "js", "css"] {
        fs::create_dir_all(root.join(sub)).map_err(|e| e.to_string())?;
    }
    let json = root.join("data").join("quizzes.json");
    if !json.exists() {
        fs::write(&json, "{}").map_err(|e| e.to_string())?;
    }
    let js = root.join("data").join("quizzes.js");
    if !js.exists() {
        fs::write(&js, "window.quizzesData = {};\n").map_err(|e| e.to_string())?;
    }
    fs::write(root.join("index.html"), include_str!("../../../index.html"))
        .map_err(|e| e.to_string())?;
    fs::write(root.join("js").join("student.js"), include_str!("../../../js/student.js"))
        .map_err(|e| e.to_string())?;
    fs::write(root.join("css").join("student.css"), include_str!("../../../css/student.css"))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn read_data(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = working_dir(&app_handle)?.join("data").join("quizzes.json");
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_data(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = working_dir(&app_handle)?.join("data").join("quizzes.json");
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_quizzes_js(app_handle: tauri::AppHandle, content: String) -> Result<(), String> {
    let path = working_dir(&app_handle)?.join("data").join("quizzes.js");
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_questionnaire(app_handle: tauri::AppHandle, name: String, content: String) -> Result<String, String> {
    let path = working_dir(&app_handle)?.join("questionnaires").join(&name);
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_excel(app_handle: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<(), String> {
    let path = working_dir(&app_handle)?.join("excel").join(&name);
    fs::write(&path, bytes).map_err(|e| e.to_string())
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
    let index = working_dir(&app_handle)?.join("index.html");
    if !index.exists() {
        return Err("index.html absent du dossier de travail.".to_string());
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
