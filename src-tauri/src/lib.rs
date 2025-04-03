#![allow(nonstandard_style)]

mod PulseProcessor;
mod TESAnalyzer;
mod DataProcessor;
mod PyMod;
mod TES_Err;
mod Config;

pub use DataProcessor::*;
pub use TESAnalyzer::*;
pub use PulseProcessor::*;

use std::sync::Mutex;
use tauri::State;
use PulseProcessor::{CreatePulseProcessor, DeletePulseProcessor, PPAnalyzeFolderCommand,PPSetDataPathCommand};
use TESAnalyzer::IV::{IVProcessorS, CreateIVProcessor, DeleteIVProcessor, IVAnalyzeFolderCommand, IVSetDataPathCommand,SingleCalibCommand,MultipleCalibCommand};
use TESAnalyzer::RT::{RTProcessorS, CreateRTProcessor, DeleteRTProcessor, RTAnalyzeFolderCommand, RTSetDataPathCommand};
struct RTState{
    RTProcessor: Mutex<Option<TESAnalyzer::RT::RTProcessorS>>,
}
struct IVState{
    IVProcessor: Mutex<Option<TESAnalyzer::IV::IVProcessorS>>,
}

struct PulseState{
    PulseProcessor: Mutex<Option<PulseProcessor::PulseProcessorS>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PulseState{
            PulseProcessor: Mutex::new(None),
        })
        .manage(IVState{
            IVProcessor: Mutex::new(None),
        })
        .manage(RTState{
            RTProcessor: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            CreatePulseProcessor,
            DeletePulseProcessor,
            PPAnalyzeFolderCommand,
            PPSetDataPathCommand
        ])
        .invoke_handler(tauri::generate_handler![
            CreateIVProcessor,
            DeleteIVProcessor,
            IVAnalyzeFolderCommand,
            IVSetDataPathCommand,
            SingleCalibCommand,
            MultipleCalibCommand
        ])
        .invoke_handler(tauri::generate_handler![
            CreateRTProcessor,
            DeleteRTProcessor,
            RTAnalyzeFolderCommand,
            RTSetDataPathCommand
        ])
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
