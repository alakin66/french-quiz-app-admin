use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};

fn settings_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|d| d.join("settings.json"))
        .map_err(|e| e.to_string())
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
pub fn open_student_app(url: String) -> Result<(), String> {
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
