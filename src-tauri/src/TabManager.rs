#![allow(non_snake_case)]
use std::collections::HashMap;
use std::path::{Path,PathBuf};
use std::sync::{LazyLock, Mutex};
use ndarray::Array1;
use crate::DataProcessor::{DataProcessorT, LoadBi};
use crate::PulseProcessor::PulseProcessorS;
use crate::TESAnalyzer::IV::IVProcessorS;
use crate::TESAnalyzer::RT::RTProcessorS;

pub enum TabProcessor {
    IV(IVProcessorS),
    RT(RTProcessorS),
    Pulse(PulseProcessorS),
}

pub static PROCESSORS: LazyLock<Mutex<HashMap<String, TabProcessor>>> = LazyLock::new(|| {
    Mutex::new(HashMap::new())
});

#[tauri::command]
pub fn RegisterProcessor(tab_name: String, processor_type: String) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;

    if map.contains_key(&tab_name) {
        return Err(format!("Tab '{}' already registered", tab_name));
    }

    let processor = match processor_type.as_str() {
        "IV" => TabProcessor::IV(IVProcessorS::new()),
        "RT" => TabProcessor::RT(RTProcessorS::new()),
        "Pulse" => TabProcessor::Pulse(PulseProcessorS::new()),
        _ => return Err(format!("Unknown processor type: {}", processor_type)),
    };

    map.insert(tab_name, processor);
    Ok(())
}

#[tauri::command]
pub fn UnregisterProcessor(tab_name: String) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;

    if map.remove(&tab_name).is_some() {
        Ok(())
    } else {
        Err(format!("Tab '{}' not found", tab_name))
    }
}

impl TabProcessor {
    pub fn SetDataPath(&mut self, path: String) -> Result<(), String> {
        match self {
            TabProcessor::IV(p) => {
                p.SetDataPath(Path::new(&path));
                Ok(())
            }
            TabProcessor::RT(p) => {
                p.SetDataPath(Path::new(&path));
                Ok(())
            }
            TabProcessor::Pulse(p) => {
                p.SetDataPath(Path::new(&path));
                Ok(())
            }
        }
    }

    pub fn AnalyzeFolder(&mut self)->Result<(), String>{
        match self {
            TabProcessor::IV(p) => {
                p.AnalyzeFolder()
            }
            TabProcessor::RT(p) => {
                p.AnalyzeFolder()
            }
            TabProcessor::Pulse(p) => {
                p.AnalyzeFolder()
            }
        }
    }
}

#[tauri::command]
pub fn SetDataPath(tab_name: String, path: String) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;
    let processor = map.get_mut(&tab_name).ok_or("Tab not found")?;
    processor.SetDataPath(path)
}

#[tauri::command]
pub fn AnalyzeFolder(tab_name:String)->Result<(), String>{
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;
    let processor = map.get_mut(&tab_name).ok_or("Tab not found")?;
    processor.AnalyzeFolder()
}

#[tauri::command]
pub fn SaveCalibratedCommand(tab_name: String) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Lock error")?;
    match map.get_mut(&tab_name) {
        Some(TabProcessor::IV(iv)) => iv.SaveCalibrated(),
        _ => Err("Tab is not an IV Processor".to_string()),
    }
}

#[tauri::command]
pub fn CalibrateSingleJumpCommand(tab_name: String,temp:u32, CalibStartI_bias:f64,CalibEndI_bias:f64) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;
    match map.get_mut(&tab_name) {
        Some(TabProcessor::IV(iv)) => iv.CalibrateSingleJump(temp, CalibStartI_bias,CalibEndI_bias),
        _ => Err("Tab is not an IV Processor".to_string()),
    }
}

#[tauri::command]
pub fn CalibrateMultipleJumpCommand(tab_name: String,temp:u32, CalibStartI_bias:f64,CalibEndI_bias:f64) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;
    match map.get_mut(&tab_name) {
        Some(TabProcessor::IV(iv)) => iv.CalibrateMultipleJump(temp, CalibStartI_bias,CalibEndI_bias),
        _ => Err("Tab is not an IV Processor".to_string()),
    }
}

#[tauri::command]
pub fn GetIVCommand(tab_name: String) -> Result<serde_json::Value, String> {
    let map = PROCESSORS.lock().unwrap();
    match map.get(&tab_name) {
        Some(TabProcessor::IV(p)) => {
            let mut result = serde_json::Map::new();

            for &temp in &p.Temps {
                let I_bias = p.I_bias_temps.get(&temp).ok_or(format!("No I_bias data for temp {}", temp))?.to_vec();
                let v_out_vec = p.V_out_history_temps.get(&temp).ok_or(format!("No V_out data for temp {}", temp))?;
                let v_out = v_out_vec.first().ok_or(format!("No V_out vector data for temp {}", temp))?.to_vec();

                result.insert(temp.to_string(), serde_json::json!({
                    "I_bias": I_bias,
                    "v_out": v_out,
                }));
            }

            Ok(serde_json::Value::Object(result))
        },
        _ => Err("Invalid tab or processor type".into()),
    }
}

#[tauri::command]
pub fn FitRTCommand(tab_name: String) -> Result<(), String> {
    let mut map = PROCESSORS.lock().map_err(|_| "Failed to lock processor map")?;
    match map.get_mut(&tab_name) {
        Some(TabProcessor::RT(rt)) => rt.FitRT(),
        _ => Err("Tab is not an RT Processor".to_string()),
    }
}

#[tauri::command]
pub fn GetRTCommand(tab_name: String) -> Result<serde_json::Value, String> {
    let map = PROCESSORS.lock().unwrap();
    match map.get(&tab_name) {
        Some(TabProcessor::RT(p)) => {
            let mut result = serde_json::Map::new();

            for &crt in &p.Currents {
                let Temp=p.Temp_Current.get(&crt).ok_or(format!("No Temp Data for Current {}", crt))?.to_vec();
                let I_bias =p.Temp_Current.get(&crt).ok_or(format!("No Temp Data for Current {}", crt))?.to_vec();
                result.insert(crt.to_string(), serde_json::json!({
                    "Temp": Temp,
                    "I_bias": I_bias,
                }));
            }
            Ok(serde_json::Value::Object(result))
        },
        _ => Err("Invalid tab or processor type".into()),
    }
}

#[tauri::command]
pub fn GetPulseInfoCommand(tab_name: String) -> Result<serde_json::Value, String> {
    let map = PROCESSORS.lock().unwrap();
    match map.get(&tab_name) {
        Some(TabProcessor::Pulse(p)) => {
            let mut outer = serde_json::Map::new();

            for &ch in &p.Channels {
                let infos = p.PulseInfosCH.get(&ch)
                    .ok_or(format!("No pulse info for channel {}", ch))?;

                let mut channel_map = serde_json::Map::new();
                for (&index, info) in infos {
                    let json_value = serde_json::to_value(info)
                        .map_err(|e| format!("Serialization error: {}", e))?;
                    channel_map.insert(index.to_string(), json_value);
                }

                outer.insert(ch.to_string(), serde_json::Value::Object(channel_map));
            }

            Ok(serde_json::Value::Object(outer))
        },
        _ => Err("Invalid tab or processor type".into()),
    }
}

#[tauri::command]
pub fn GetPulseAnalysisCommand(tab_name: String,key:u32,Channel:u32) -> Result<serde_json::Value, String> {
    let map = PROCESSORS.lock().unwrap();
    match map.get(&tab_name) {
        Some(TabProcessor::Pulse(p)) => {
            let mut result = serde_json::Map::new();

            let path = PathBuf::from(format!(
                "{}/CH{}_pulse/rawdata/CH{}_{}.dat",
                p.DP.DataPath.display(),
                Channel,
                Channel,
                key
            ));

            let Pulse=LoadBi(Path::new(&path))?;
            let FilteredPulse= crate::PulseProcessor::filtfilt(&Pulse.to_vec(), p.BesselCoeffs.clone());
            let (PI,PIH,PAH)=p.GetPulseInfo(Array1::from(FilteredPulse.clone()))?;

            // Pulse と FilteredPulse を JSON に変換して挿入
            result.insert("Pulse".to_string(), serde_json::to_value(Pulse.to_vec()).map_err(|e| e.to_string())?);
            result.insert("FilteredPulse".to_string(), serde_json::to_value(FilteredPulse).map_err(|e| e.to_string())?);

            // PI, PIH, PAH は Serialize を derive している前提
            result.insert("PI".to_string(), serde_json::to_value(PI).map_err(|e| e.to_string())?);
            result.insert("PIH".to_string(), serde_json::to_value(PIH).map_err(|e| e.to_string())?);
            result.insert("PAH".to_string(), serde_json::to_value(PAH).map_err(|e| e.to_string())?);

            Ok(serde_json::Value::Object(result))
        },
        _ => Err("Invalid tab or processor type".into()),
    }
}

pub fn SaveFigCommand(tab_name:String,path: String) -> Result<(), String> {
    let map = PROCESSORS.lock().unwrap();
    match map.get(&tab_name) {
        Some(TabProcessor::IV(p)) => {
            p.SaveFig(&path)?;
            Ok(())
        },
        _ => Err("Invalid tab or processor type".into()),
    }
}