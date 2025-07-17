#![allow(non_snake_case)]
use std::path::Path;
use tes_gui_lib::{TESAnalyzer, TabManager};
use tes_gui_lib::PulseProcessor;
use tes_gui_lib::DataProcessor::DataProcessorT;

fn main() -> Result<(), String> {

    let mut IV = TESAnalyzer::IV::IVProcessorS::new();
    IV.SetDataPath(Path::new("Test/IV"));
    IV.AnalyzeFolder()?;
    IV.CalculateR_TES()?;
    IV.CalibrateSingleJump(170,200.0,400.0)?;
    IV.CalibrateSingleJump(170,200.0,400.0)?;
    IV.SaveFig(&"IV.png".to_string())?;

    let mut RT=TESAnalyzer::RT::RTProcessorS::new();
    RT.SetDataPath(Path::new("Test/RT"));
    RT.AnalyzeRTFolder()?;
    RT.FitRT()?;

    let mut P=PulseProcessor::PulseProcessorS::new();
    P.SetDataPath(Path::new("Test/Pulse"));
    P.AnalyzePulseFolder()?;

    let folder:String=TabManager::FindFolderType("Test/Pulse".to_string())?;

    match folder.as_str(){
        "IV"=>{
            println!("IV");
        }
        "RT"=>{
            println!("RT");
        },
        "Pulse"=>{
            println!("Pulse");
        },
        _ => println!("未定義のフォルダタイプです")
    }

    Ok(())
}
