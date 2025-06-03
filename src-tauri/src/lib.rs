#![allow(nonstandard_style)]

use crate::TabManager::{
    AnalyzeFolderCommand, CalibrateMultipleJumpCommand, CalibrateSingleJumpCommand, FindFolderType,
    FitRTCommand, GetIVCommand, GetPulseAnalysisCommand, GetPulseInfoCommand, GetRTCommand,
    RegisterProcessor, SaveCalibratedCommand, SetDataPathCommand, UnregisterProcessor,
};
pub mod Config;
pub mod DataProcessor;
pub mod PulseProcessor;
pub mod PyMod;
pub mod TESAnalyzer;
pub mod TabManager;

// Tauri コマンドの例
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
#[tauri::command]
fn greet_string(name: String) -> String {
    format!("Hello, {}! You've been greeted from String!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // ✅ すべてのコマンドをここでまとめて指定
        .invoke_handler(tauri::generate_handler![
            greet,
            greet_string,
            RegisterProcessor,
            UnregisterProcessor,
            SetDataPathCommand,
            AnalyzeFolderCommand,
            SaveCalibratedCommand,
            CalibrateSingleJumpCommand,
            CalibrateMultipleJumpCommand,
            GetIVCommand,
            FitRTCommand,
            GetRTCommand,
            GetPulseInfoCommand,
            GetPulseAnalysisCommand,
            FindFolderType,
        ])
        // 実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
