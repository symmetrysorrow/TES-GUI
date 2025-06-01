#![allow(nonstandard_style)]
pub mod DataProcessor;
pub mod TESAnalyzer;
pub mod Config;
pub mod PulseProcessor;
pub mod TabManager;
pub mod PyMod;

use std::sync::Mutex;

// 状態管理構造体
struct RTState {
    RTProcessor: Mutex<Option<TESAnalyzer::RT::RTProcessorS>>,
}
struct IVState {
    IVProcessor: Mutex<Option<TESAnalyzer::IV::IVProcessorS>>,
}
struct PulseState {
    PulseProcessor: Mutex<Option<PulseProcessor::PulseProcessorS>>,
}

// Tauri コマンドの例
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())

        // 状態の管理
        .manage(PulseState {
            PulseProcessor: Mutex::new(None),
        })
        .manage(IVState {
            IVProcessor: Mutex::new(None),
        })
        .manage(RTState {
            RTProcessor: Mutex::new(None),
        })

        // ✅ すべてのコマンドをここでまとめて指定
        .invoke_handler(tauri::generate_handler![
            greet,
        ])

        // 実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
