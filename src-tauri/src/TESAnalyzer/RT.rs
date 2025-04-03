#![allow(non_upper_case_globals)]

use crate::Config::TESAnalysisConfig;
use crate::DataProcessor::{DataProcessorS, DataProcessorT};
use crate::DataProcessor::{LoadTxt, SaveTxt};
use crate::PyMod::PyManager;
use crate::TESAnalyzer::LinerFit;
use glob::glob;
use ndarray::Array1;
use regex::Regex;
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::f64::consts::PI;
use std::net::ToSocketAddrs;
use std::path::{Path, PathBuf};
use tauri::{command, State};
use crate::RTState;

const sup_R:f64=90.0;
const inf_R:f64=10.0;

pub(crate) struct RTProcessorS{
    DP:DataProcessorS,
    TESAConfig:TESAnalysisConfig,
    Currents:HashSet<u32>,
    R_tes_Current:HashMap<u32, Vec<f64>>,
    Temp_Current:HashMap<u32, Vec<f64>>,
    eta:f64
}

impl RTProcessorS {
    pub(crate) fn new() -> Self {
        Self {
            DP: DataProcessorS::new(),
            TESAConfig: TESAnalysisConfig::new(),
            Currents: HashSet::new(),
            R_tes_Current: HashMap::new(),
            Temp_Current: HashMap::new(),
            eta: 104.0,
        }
    }

    pub(crate) fn SetDataPath(&mut self, path: String) ->Result<(), String> {
        self.DP.SetDataPath(path)
    }

    pub(crate) fn SaveRT(&self) -> Result<(), String> {
        for ch in self.Currents.iter(){
            let R=self.R_tes_Current.get(ch).ok_or("Map get err.".to_string())?;
            let T=self.Temp_Current.get(ch).ok_or("Map get err".to_string())?;
            let mut RTData=Vec::new();
            RTData.push("T,R".to_string());
            for i in 0..R.len(){
                RTData.push(format!("{},{}", T[i], R[i]));
            }
            let RTFileName=format!("{}/output/RT_{}uA.csv", self.DP.DataPath.display(), ch);
            SaveTxt(Path::new(&RTFileName), &RTData)?;
        }
        return Ok(());
    }

    pub(crate) fn FitRT(&mut self) -> Result<(), String> {

        let py= PyManager::new(PathBuf::from(format!("{}/python-emb", std::env::current_dir()
            .map_err(|e|e.to_string())?.
            to_str().
            ok_or("To Str Error.")?)));

        for crt in self.Currents.iter(){
            if *crt==0{
                continue;
            }
            let R=self.R_tes_Current.get(crt).ok_or("Map get error.".to_string())?;
            let T=self.Temp_Current.get(crt).ok_or("Map get error.".to_string())?;

            let InputData = json!({
                "R": R,
                "T": T,
            });

            let args_b=vec![serde_json::to_string(&InputData).map_err(|e|e.to_string())?];

            let FitParams = py
                .RunMainFromFile(PathBuf::from("RTFit.py"), args_b, "PyScript".to_string())
                .map_err(|e|e.to_string())
                .and_then(|output| {
                    serde_json::from_str::<Vec<f64>>(&output)
                        .map_err(|e| e.to_string())
                })?; // `?` を使い、エラーが発生したら即リターン

            let R_n_s=R[0];
            let R_n_f=R[R.len() - 1];
            let T_c_s=T[0];
            let T_c_f=T[R.len() - 1];

            let RN =((R_n_f-R_n_s)/PI)*FitParams[0].atan()+(R_n_s+R_n_f)/2.0;
            let T_c =((T_c_f-T_c_s)/PI)*FitParams[1].atan()+(T_c_s+T_c_f)/2.0;
            let T_1 =(T_c_f/PI)*FitParams[2].atan()+T_c_f/2.0;
            let T_2 =(T_c_f/PI)*FitParams[3].atan()+T_c_f/2.0;

            let T_fit: Array1<f64> = Array1::linspace(T[0] - 2.0, T[T.len()-1] + 2.0, 1000);
            let R_fit = RN /((1.0+((-&T_fit + T_c)/ T_1).exp())*(1.0+((-&T_fit + T_c)/ T_2).exp()));
            
            let RN_sup= RN *sup_R*0.01;
            let RN_inf= RN *inf_R*0.01;

            let mut T_inf:f64=0.0;
            let mut T_sup:f64=0.0;

            for i in 0..T_fit.len(){
                if R_fit[i]>RN_sup{
                    T_sup= T_fit[i];
                    break;
                }
            }

            for i in 0..T_fit.len(){
                if R_fit[i]>RN_inf{
                    T_inf= T_fit[i];
                    break;
                }
            }

            let T_Alpha =Array1::linspace(T_inf, T_sup, 1000);

            let mut Alpha:Vec<f64>=Vec::new();
            let mut RAlpha:Vec<f64>=Vec::new();
            let mut TAlpha:Vec<f64>=Vec::new();
            let mut diff_R:Vec<f64>=Vec::new();
            let mut BiasPoint:Vec<f64>=Vec::new();

            for i in 0..T_Alpha.len()-1{
                TAlpha.push(T_Alpha[i]);
                RAlpha.push(RN /((1.0+((-T_Alpha[i]+ T_c)/ T_1).exp())*(1.0+((-T_Alpha[i]+ T_c)/ T_2).exp())));
                diff_R.push((RN /((1.0+((-T_Alpha[i+1]+ T_c)/ T_1).exp())*(1.0+((-T_Alpha[i+1]+ T_c)/ T_2).exp()))-RAlpha[i])/(T_Alpha[i+1]- T_Alpha[i]));
                Alpha.push((TAlpha[i]*diff_R[i])/RAlpha[i]);
                BiasPoint.push(100.*RAlpha[i]/ RN);
            }
        }
        return Ok(());
    }
}

impl DataProcessorT for RTProcessorS{
    fn AnalyzeFolder(&mut self) -> Result<(), String> {

        let RTFiles=glob(&format!("{}/rawdata/CH*.dat", self.DP.DataPath.display()))
            .map_err(|e|e.to_string())?
            .filter_map(Result::ok)
            .collect::<Vec<PathBuf>>();

        if RTFiles.is_empty() {
            return Err("No files found in the specified directory.".to_string());
        }

        let RTPattern = Regex::new(r"_(\d+)mK_(\d+)uA\.dat").map_err(|e| e.to_string())?;

        let mut V_out_current:HashMap<u32,Vec<f64>>=HashMap::new();

        for file in RTFiles {
            let V_out=LoadTxt(file.as_path())?.mean().ok_or("Ndarray mean error".to_string())?;
            let file_str=file.to_string_lossy();
            if let Some(captures) = RTPattern.captures(&file_str) {
                let temp = captures[1].parse::<f64>().map_err(|e| e.to_string())?;
                let current = captures[2].parse::<u32>().map_err(|e| e.to_string())?;
                self.Currents.insert(current);
                self.Temp_Current.entry(current)
                    .or_insert_with(Vec::new)
                    .push(temp);
                V_out_current.entry(current).or_insert_with(Vec::new).push(V_out);
            }
        }
        let mut I_bias_sample:Vec<f64>=self.Currents.iter().map(|x|*x as f64).collect();
        let mut V_out_sample:Vec<f64>=V_out_current.values()
            .filter_map(|v| v.first().cloned())  // 最初の要素がある場合のみ取得
            .collect();
        I_bias_sample.sort_by(|a, b| a.partial_cmp(b).unwrap());
        V_out_sample.sort_by(|a, b| a.partial_cmp(b).unwrap());
                
        self.eta=1.0/LinerFit(&Array1::from(I_bias_sample), &Array1::from(V_out_sample))?;
        
        for cur in self.Currents.iter(){
            if *cur==0{
                continue;
            }
            for i in 0..V_out_current.get(cur).unwrap().len() {
                let V_out = V_out_current.get(cur).unwrap()[i] - V_out_current.get(&0).unwrap()[i];
                let R_tes = self.TESAConfig.R_sh * (*cur as f64 / (self.eta * V_out) - 1.0);
                self.R_tes_Current.entry(*cur)
                    .or_insert_with(Vec::new)
                    .push(R_tes);
            }
            println!();
        }
        
        if cfg!(debug_assertions) {
            println!("Currents: {:?}", self.Currents);
        }

        return Ok(());
    }
}

#[tauri::command]
pub fn CreateRTProcessor(state:State<RTState>)->Result<(), String>{
    let mut rt_processor = state.RTProcessor.lock().map_err(|e| e.to_string())?;
    if rt_processor.is_some() {
        return Err("RTProcessorS is already created".to_string());
    }
    *rt_processor = Some(RTProcessorS::new());
    Ok(())
}

#[tauri::command]
pub fn DeleteRTProcessor(state:State<RTState>)->Result<(), String>{
    let mut rt_processor = state.RTProcessor.lock().map_err(|e| e.to_string())?;
    if rt_processor.is_none() {
        return Err("RTProcessorS is not initialized".to_string());
    }
    *rt_processor = None;
    Ok(())
}

#[command]
pub fn RTAnalyzeFolderCommand(state: State<RTState>) -> Result<(), String> {
    let mut rt_processor = state.RTProcessor.lock().map_err(|e| e.to_string())?;
    if let Some(rt_processor) = rt_processor.as_mut() {
        rt_processor.AnalyzeFolder()
    } else {
        Err("RTProcessorS is not initialized".to_string())
    }
}

#[command]
pub fn RTSetDataPathCommand(state:State<RTState>,path:String) -> Result<(), String> {
    let mut rt_processor = state.RTProcessor.lock().map_err(|e| e.to_string())?;
    if let Some(rt_processor) = rt_processor.as_mut() {
        rt_processor.SetDataPath(path)
    } else {
        Err("RTProcessorS is not initialized".to_string())
    }
}


