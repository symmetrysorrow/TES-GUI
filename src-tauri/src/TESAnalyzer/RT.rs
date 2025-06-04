#![allow(non_upper_case_globals)]

use crate::Config::TESAnalysisConfig;
use crate::DataProcessor::{DataProcessorS, DataProcessorT};
use crate::DataProcessor::{LoadTxt, SaveTxt};
use crate::PyMod::RTFit;
use crate::TESAnalyzer::LinerFit;
use glob::glob;
use ndarray::Array1;
use regex::Regex;
use serde_json::to_string_pretty;
use std::collections::{HashMap, HashSet};
use std::f64::consts::PI;
use std::path::{Path, PathBuf};
const sup_R: f64 = 90.0;
const inf_R: f64 = 10.0;

pub struct RTProcessorS {
    DP: DataProcessorS,
    TESAConfig: TESAnalysisConfig,
    pub Currents: HashSet<u32>,
    pub R_tes_Current: HashMap<u32, Vec<f64>>,
    pub Temp_Current: HashMap<u32, Vec<f64>>,
    eta: f64,
}

impl RTProcessorS {
    pub fn new() -> Self {
        Self {
            DP: DataProcessorS::new(),
            TESAConfig: TESAnalysisConfig::new(),
            Currents: HashSet::new(),
            R_tes_Current: HashMap::new(),
            Temp_Current: HashMap::new(),
            eta: 104.0,
        }
    }

    pub fn SetDataPath(&mut self, path: &Path) {
        self.DP.SetDataPath(path);
    }

    pub fn SaveRT(&self) -> Result<(), String> {
        for ch in self.Currents.iter() {
            let R = self
                .R_tes_Current
                .get(ch)
                .ok_or(format!("Failed to get R at {}microA", ch))?;
            let T = self
                .Temp_Current
                .get(ch)
                .ok_or(format!("Failed to get T at {}microA", ch))?;
            let mut RTData = Vec::new();
            RTData.push("T,R".to_string());
            for i in 0..R.len() {
                RTData.push(format!("{},{}", T[i], R[i]));
            }
            let RTFileName = format!("{}/output/RT_{}uA.csv", self.DP.DataPath.display(), ch);
            SaveTxt(Path::new(&RTFileName), &RTData)?;
        }
        return Ok(());
    }

    pub fn FitRT(&mut self) -> Result<(), String> {
        let rt = tokio::runtime::Runtime::new().unwrap();
        for crt in self.Currents.iter() {
            if *crt == 0 {
                continue;
            }
            let R = self
                .R_tes_Current
                .get(crt)
                .ok_or(format!("Failed to get R at {}microA", crt))?;
            let T = self
                .Temp_Current
                .get(crt)
                .ok_or(format!("Failed to get R at {}microA", crt))?;

            let FitParams = rt.block_on(RTFit(R, T))?;

            let R_n_s = R[0];
            let R_n_f = R[R.len() - 1];
            let T_c_s = T[0];
            let T_c_f = T[R.len() - 1];

            let RN = ((R_n_f - R_n_s) / PI) * FitParams[0].atan() + (R_n_s + R_n_f) / 2.0;
            let T_c = ((T_c_f - T_c_s) / PI) * FitParams[1].atan() + (T_c_s + T_c_f) / 2.0;
            let T_1 = (T_c_f / PI) * FitParams[2].atan() + T_c_f / 2.0;
            let T_2 = (T_c_f / PI) * FitParams[3].atan() + T_c_f / 2.0;

            let T_fit: Array1<f64> = Array1::linspace(T[0] - 2.0, T[T.len() - 1] + 2.0, 1000);
            let R_fit = RN
                / ((1.0 + ((-&T_fit + T_c) / T_1).exp()) * (1.0 + ((-&T_fit + T_c) / T_2).exp()));

            let RN_sup = RN * sup_R * 0.01;
            let RN_inf = RN * inf_R * 0.01;

            let mut T_inf: f64 = 0.0;
            let mut T_sup: f64 = 0.0;

            for i in 0..T_fit.len() {
                if R_fit[i] > RN_sup {
                    T_sup = T_fit[i];
                    break;
                }
            }

            for i in 0..T_fit.len() {
                if R_fit[i] > RN_inf {
                    T_inf = T_fit[i];
                    break;
                }
            }

            let T_Alpha = Array1::linspace(T_inf, T_sup, 1000);

            let mut Alpha: Vec<f64> = Vec::new();
            let mut RAlpha: Vec<f64> = Vec::new();
            let mut TAlpha: Vec<f64> = Vec::new();
            let mut diff_R: Vec<f64> = Vec::new();
            let mut BiasPoint: Vec<f64> = Vec::new();

            for i in 0..T_Alpha.len() - 1 {
                TAlpha.push(T_Alpha[i]);
                RAlpha.push(
                    RN / ((1.0 + ((-T_Alpha[i] + T_c) / T_1).exp())
                        * (1.0 + ((-T_Alpha[i] + T_c) / T_2).exp())),
                );
                diff_R.push(
                    (RN / ((1.0 + ((-T_Alpha[i + 1] + T_c) / T_1).exp())
                        * (1.0 + ((-T_Alpha[i + 1] + T_c) / T_2).exp()))
                        - RAlpha[i])
                        / (T_Alpha[i + 1] - T_Alpha[i]),
                );
                Alpha.push((TAlpha[i] * diff_R[i]) / RAlpha[i]);
                BiasPoint.push(100. * RAlpha[i] / RN);
            }
        }
        return Ok(());
    }
}

impl DataProcessorT for RTProcessorS {
    fn AnalyzeFolder(&mut self) -> Result<(), String> {
        let RTFiles = glob(&format!("{}/rawdata/CH*.dat", self.DP.DataPath.display()))
            .map_err(|e| format!("Failed to glob RT files at {:?}\n{}", self.DP.DataPath, e))?
            .filter_map(Result::ok)
            .collect::<Vec<PathBuf>>();

        if RTFiles.is_empty() {
            return Err("RTFiles is empty".to_string());
        }

        let RTPattern =
            Regex::new(r"_(\d+)mK_(\d+)uA\.dat").map_err(|e| format!("Regex Error\n{}", e))?;

        let mut V_out_current: HashMap<u32, Vec<f64>> = HashMap::new();
        for file in RTFiles {
            let V_out = LoadTxt(file.as_path())?
                .mean()
                .ok_or("Failed to calculate mean of ndarray.")?;
            let file_str = file.to_string_lossy();
            if let Some(captures) = RTPattern.captures(&file_str) {
                let temp = captures[1]
                    .parse::<f64>()
                    .map_err(|e| format!("Regex Error\n{}", e))?;
                let current = captures[2]
                    .parse::<u32>()
                    .map_err(|e| format!("Regex Error\n{}", e))?;

                self.Currents.insert(current);
                self.Temp_Current
                    .entry(current)
                    .or_insert_with(Vec::new)
                    .push(temp);
                V_out_current
                    .entry(current)
                    .or_insert_with(Vec::new)
                    .push(V_out);

            }
        }
        let mut I_bias_sample: Vec<f64> = self.Currents.iter().map(|x| *x as f64).collect();
        let mut V_out_sample: Vec<f64> = V_out_current
            .values()
            .filter_map(|v| v.first().cloned()) // 最初の要素がある場合のみ取得
            .collect();
        I_bias_sample.sort_by(|a, b| a.partial_cmp(b).unwrap());
        V_out_sample.sort_by(|a, b| a.partial_cmp(b).unwrap());

        self.eta = 1.0 / LinerFit(&Array1::from(I_bias_sample), &Array1::from(V_out_sample))?;
        println!("eta: {}", self.eta);

        for cur in self.Currents.iter() {
            for i in 0..V_out_current.get(cur).unwrap().len() {
                let V_out = V_out_current.get(cur).unwrap()[i] - V_out_current.get(&0).unwrap()[i];
                let R_tes = self.TESAConfig.R_sh * (*cur as f64 / (self.eta * V_out) - 1.0);
                self.R_tes_Current
                    .entry(*cur)
                    .or_insert_with(Vec::new)
                    .push(R_tes);
            }
        }

        self.Currents.remove(&0);
        self.Temp_Current.remove(&0);
        self.R_tes_Current.remove(&0);

        if cfg!(debug_assertions) {
            println!("Currents: {:?}", self.Currents);
            let R_TES = to_string_pretty(&self.R_tes_Current).unwrap();
            //let temp = to_string_pretty(&self.Temp_Current).unwrap();
            println!("R_tes_Current: {}", R_TES);
            //println!("Temp_Current: {}", temp);
            println!("eta: {}", self.eta);
        }

        self.SaveRT()?;

        return Ok(());
    }
}
