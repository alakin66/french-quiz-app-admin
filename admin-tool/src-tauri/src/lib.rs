mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_data,
            commands::write_data,
            commands::write_quizzes_js,
            commands::git_publish,
            commands::read_settings,
            commands::write_settings,
            commands::quit_app,
            commands::debug_log,
            commands::open_and_read_excel_files,
            commands::open_excel_dialog,
            commands::open_json_dialog,
            commands::save_json_dialog,
            commands::save_named_json_dialog,
            commands::open_student_app,
            commands::open_folder_dialog,
            commands::init_repo_path,
            commands::read_binary_file,
            commands::read_text_file_at,
            commands::write_text_file_at,
            commands::read_quiz_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
