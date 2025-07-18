#![allow(nonstandard_style)]

use crate::TabManager::{CalibrateMultipleJumpCommand, CalibrateSingleJumpCommand, FindFolderType, FitRTCommand, GetIVCommand, GetIVIndexInfoCommand, GetPulseAnalysisCommand, GetPulseInfoCommand, GetRTCommand, IVDecrementCommand, IVIncrementCommand, RegisterProcessor, SaveCalibratedCommand, SetDataPathCommand, UnregisterProcessor};
use crate::TabManager::{AnalyzeRTFolderCommand,AnalyzeIVFolderCommand, AnalyzePulseFolderPreCommand,AnalyzePulseFolderCommand};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // ✅ すべてのコマンドをここでまとめて指定
        .invoke_handler(tauri::generate_handler![
            RegisterProcessor,
            UnregisterProcessor,
            SetDataPathCommand,
            AnalyzeIVFolderCommand,
            SaveCalibratedCommand,
            CalibrateSingleJumpCommand,
            CalibrateMultipleJumpCommand,
            GetIVCommand,
            IVIncrementCommand,
            IVDecrementCommand,
            GetIVIndexInfoCommand,
            AnalyzeRTFolderCommand,
            FitRTCommand,
            GetRTCommand,
                AnalyzePulseFolderPreCommand,
            AnalyzePulseFolderCommand,
            GetPulseInfoCommand,
            GetPulseAnalysisCommand,
            FindFolderType,
        ])
        // 実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
