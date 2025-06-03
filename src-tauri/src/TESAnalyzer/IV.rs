#![allow(non_snake_case)]
use crate::Config::TESAnalysisConfig;
use crate::DataProcessor::{DataProcessorS, DataProcessorT, LoadTxt, SaveTxt};
use crate::TESAnalyzer::LinerFit;
use glob::glob;
use ndarray::{s, Array1};
use plotters::prelude::*;
use regex::Regex;
use std::collections::HashMap;
use std::fs::{self};
use std::path::{Path, PathBuf};
use std::vec;

pub struct IVProcessorS {
    pub DP: DataProcessorS,
    pub I_bias_temps: HashMap<u32, Array1<f64>>,
    pub V_out_history_temps: HashMap<u32, Vec<Array1<f64>>>,
    pub R_tes_temps: HashMap<u32, Array1<f64>>,
    pub Temps: Vec<u32>,
    pub CurrentIndex_temps: HashMap<u32, u32>,
    TESAConfig: TESAnalysisConfig,
}

fn Offset<T>(data: &mut T)
where
    T: Offsettable,
{
    let slice = data.as_mut_slice();
    let offset = slice[0];
    slice.iter_mut().for_each(|x| *x = *x - offset);
    let sum: f64 = slice.iter().take(5).sum();

    if sum < 0.0 {
        slice.iter_mut().for_each(|x| *x = *x * -1.0);
    }
}

trait Offsettable {
    fn as_mut_slice(&mut self) -> &mut [f64];
}

impl Offsettable for Vec<f64> {
    fn as_mut_slice(&mut self) -> &mut [f64] {
        self.as_mut_slice()
    }
}

impl Offsettable for Array1<f64> {
    fn as_mut_slice(&mut self) -> &mut [f64] {
        self.as_slice_mut()
            .expect("Array1 should have a mutable slice")
    }
}
impl IVProcessorS {
    pub fn new() -> Self {
        Self {
            DP: DataProcessorS::new(),
            I_bias_temps: HashMap::new(),
            V_out_history_temps: HashMap::new(),
            R_tes_temps: HashMap::new(),
            Temps: vec![],
            CurrentIndex_temps: HashMap::new(),
            TESAConfig: TESAnalysisConfig {
                R_sh: 3.9e-3,
                LinerFitSample: 10,
            },
        }
    }
    pub fn SetDataPath(&mut self, path: &Path) {
        self.DP.SetDataPath(path);
    }

    pub fn GetEta(&self) -> Result<f64, String> {
        let LeastTemp = self.Temps.iter().min().ok_or("Failed to Find iter min.")?;
        let Index = self
            .CurrentIndex_temps
            .get(LeastTemp)
            .ok_or(format!("Index at temperature:{}mk is not found.", LeastTemp).to_string())?;
        let I_bias = self
            .I_bias_temps
            .get(LeastTemp)
            .ok_or(format!("I_bias at Temperature:{}mk is not found.", LeastTemp).to_string())?;
        let V_out = self
            .V_out_history_temps
            .get(LeastTemp)
            .ok_or(format!("V_out at Temperature:{}mk is not found.", LeastTemp).to_string())?
            [*Index as usize]
            .clone();
        if self.TESAConfig.LinerFitSample > I_bias.len() as u32
            || self.TESAConfig.LinerFitSample > V_out.len() as u32
        {
            return Err("Too few data points for linear fit.".to_string());
        }
        let I_bias_sample = I_bias
            .slice(s![0..self.TESAConfig.LinerFitSample as usize])
            .to_owned();
        let V_out_sample = V_out
            .slice(s![0..self.TESAConfig.LinerFitSample as usize])
            .to_owned();
        let Eta = 1f64 / LinerFit(&I_bias_sample, &V_out_sample)?;
        return Ok(Eta);
    }

    pub fn SaveCalibrated(&self) -> Result<(), String> {
        let CalibPath = self.DP.DataPath.join("Calibration");
        if !CalibPath.exists() {
            fs::create_dir_all(&CalibPath)
                .map_err(|e| format!("Failed to Create {:?}\n{}", CalibPath, e))?;
            // 存在しない場合ディレクトリを作成
        }
        for temp in self.Temps.iter() {
            if let Some(V_out_history) = self.V_out_history_temps.get(temp) {
                if let Some(CurrentIndex) = self.CurrentIndex_temps.get(temp) {
                    let index = *CurrentIndex as usize;
                    let SavePath = CalibPath.join(format!("{}mk.dat", temp));
                    SaveTxt(SavePath.as_path(), &V_out_history[index].to_vec())?;
                }
            }
        }
        return Ok(());
    }

    pub fn CalibrateSingleJump(
        &mut self,
        temp: u32,
        CalibStartI_bias: f64,
        CalibEndI_bias: f64,
    ) -> Result<(), String> {
        let CurrentIndex = self
            .CurrentIndex_temps
            .get(&temp)
            .ok_or(format!("Index at temperature:{} is not found", temp).to_string())?
            .clone();
        let mut V_out = self
            .V_out_history_temps
            .get(&temp)
            .ok_or(format!("V_out at temperature:{} is not found", temp).to_string())?
            [CurrentIndex as usize]
            .clone();
        let I_bias = self
            .I_bias_temps
            .get(&temp)
            .ok_or(format!("I_bias at temperature:{} is not found", temp).to_string())?;

        let CalibStartIndex = I_bias
            .iter()
            .position(|&x| x >= CalibStartI_bias)
            .ok_or("")?;
        let CalibEndIndex = I_bias.iter().position(|&x| x >= CalibEndI_bias).ok_or("")?;

        let V_out_Target = V_out.slice(s![CalibStartIndex..CalibEndIndex]).to_owned();
        // 隣接する値の差分を計算
        let diff: Vec<f64> = V_out_Target
            .windows(2usize) // 2要素のウィンドウを取得
            .into_iter() // イテレータに変換
            .map(|w| (w[1] - w[0]).abs()) // 差分の絶対値を計算
            .collect();
        // 最も差が大きい位置（ジャンプ）のインデックスを特定
        let mut JumpIndex = diff
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(i, _)| i)
            .unwrap_or(0); // 空の場合は 0 にする

        JumpIndex += CalibStartIndex;

        let mut LinerFitStartIndex = 0;
        let mut LinerFitEndIndex = LinerFitStartIndex + self.TESAConfig.LinerFitSample as usize;

        if JumpIndex - self.TESAConfig.LinerFitSample as usize > 0 {
            LinerFitEndIndex = JumpIndex;
            LinerFitStartIndex = JumpIndex - self.TESAConfig.LinerFitSample as usize;
        }

        let I_bias_LinerFit = I_bias
            .slice(s![LinerFitStartIndex..LinerFitEndIndex])
            .to_owned();
        let V_out_LinerFit = V_out
            .slice(s![LinerFitStartIndex..LinerFitEndIndex])
            .to_owned();

        let a = LinerFit(&I_bias_LinerFit, &V_out_LinerFit)?;

        Offset(&mut V_out);

        let CalibAmount = a * (I_bias[JumpIndex + 1] - I_bias[JumpIndex]) + V_out[JumpIndex]
            - V_out[JumpIndex + 1];

        V_out
            .slice_mut(s![JumpIndex + 1usize..])
            .iter_mut()
            .for_each(|x| *x += CalibAmount);

        if let Some(V_out_history) = self.V_out_history_temps.get_mut(&temp) {
            V_out_history.push(V_out);
        }

        if let Some(CurrentIndex) = self.CurrentIndex_temps.get_mut(&temp) {
            *CurrentIndex += 1;
        }

        self.SaveCalibrated()?;

        return Ok(());
    }

    pub fn CalibrateMultipleJump(
        &mut self,
        temp: u32,
        CalibStartI_bias: f64,
        CalibEndI_bias: f64,
    ) -> Result<(), String> {
        let CurrentIndex = self
            .CurrentIndex_temps
            .get(&temp)
            .ok_or(format!("Index at Temperature:{}mk is not found.", temp).to_string())?
            .clone();
        let mut V_out = self
            .V_out_history_temps
            .get(&temp)
            .ok_or(format!("V_out at Temperature:{}mk is not found.", temp).to_string())?
            [CurrentIndex as usize]
            .clone();
        let I_bias = self
            .I_bias_temps
            .get(&temp)
            .ok_or(format!("I_bias at Temperature:{}mk is not found.", temp).to_string())?;

        let CalibStartIndex = I_bias
            .iter()
            .position(|&x| x >= CalibStartI_bias)
            .ok_or("")?;
        let CalibEndIndex = I_bias.iter().position(|&x| x >= CalibEndI_bias).ok_or("")?;

        let V_out_Target = V_out.slice(s![CalibStartIndex..CalibEndIndex]).to_owned();
        // 隣接する値の差分を計算
        let I_bias_Target = I_bias.slice(s![CalibStartIndex..CalibEndIndex]).to_owned();

        let mut CalibPoints = Vec::new();

        for i in 0..(V_out_Target.len() - 2) {
            // 3点取得
            let (y1, x1) = (V_out_Target[i], I_bias_Target[i]);
            let (y2, x2) = (V_out_Target[i + 1], I_bias_Target[i + 1]);
            let (y3, x3) = (V_out_Target[i + 2], I_bias_Target[i + 2]);

            let angle1 = (y2 - y1).atan2(x2 - x1).to_degrees();
            let angle2 = (y3 - y2).atan2(x3 - x2).to_degrees();

            if (angle2 - angle1).abs() >= 20.0 {
                CalibPoints.push(i + CalibStartIndex);
            }
        }

        let mut LinerFitStartIndex = 0usize;
        let mut LinerFitEndIndex = LinerFitStartIndex + self.TESAConfig.LinerFitSample as usize;
        if CalibPoints[0] as u32 <= self.TESAConfig.LinerFitSample {
            LinerFitStartIndex = CalibPoints[0] + 1usize;
            LinerFitEndIndex = CalibPoints[1];
        }

        let I_bias_LinerFit = I_bias
            .slice(s![LinerFitStartIndex..LinerFitEndIndex])
            .to_owned();
        let V_out_LinerFit = V_out
            .slice(s![LinerFitStartIndex..LinerFitEndIndex])
            .to_owned();

        let a = LinerFit(&I_bias_LinerFit, &V_out_LinerFit)?;

        for point in CalibPoints {
            let CalibAmount =
                a * (I_bias[point + 1usize] - I_bias[point]) + V_out[point] - V_out[point + 1usize];
            V_out
                .slice_mut(s![point + 1usize..])
                .iter_mut()
                .for_each(|x| *x += CalibAmount);
        }

        Offset(&mut V_out);

        if let Some(V_out_history) = self.V_out_history_temps.get_mut(&temp) {
            V_out_history.push(V_out);
        }

        if let Some(CurrentIndex) = self.CurrentIndex_temps.get_mut(&temp) {
            *CurrentIndex += 1;
        }

        self.SaveCalibrated()?;

        return Ok(());
    }

    pub fn CalculateR_TES(&mut self) -> Result<(), String> {
        let Eta = self.GetEta()?;
        for temp in self.Temps.iter() {
            let Index = self
                .CurrentIndex_temps
                .get(temp)
                .ok_or(format!("Index at Temperature:{}mk is not found.", temp).to_string())?;
            let I_bias = self
                .I_bias_temps
                .get(temp)
                .ok_or(format!("I_bias at Temperature:{}mk is not found.", temp).to_string())?;
            let V_out = self
                .V_out_history_temps
                .get(temp)
                .ok_or(format!("V_out at Temperature:{}mk is not found.", temp).to_string())?
                [*Index as usize]
                .clone();
            let I_TES = V_out * Eta;
            let I_sh = I_bias - &I_TES;
            let V_TES = I_sh * self.TESAConfig.R_sh;
            let R_TES = V_TES.slice(s![1..]).to_owned() / I_TES.slice(s![1..]).to_owned();
            self.R_tes_temps.insert(*temp, R_TES);
        }
        return Ok(());
    }

    #[cfg(debug_assertions)]
    pub fn SaveFig(&self, FileName: &String) -> Result<String, String> {
        let FilePath = self.DP.DataPath.join(FileName);
        let root = BitMapBackend::new(&FilePath, (800, 600)).into_drawing_area();
        root.fill(&WHITE).map_err(|e| e.to_string())?;

        // 全温度のデータを集めて範囲を自動設定
        let mut all_i_vals = Vec::new();
        let mut all_v_vals = Vec::new();

        for temp in &self.Temps {
            if let (Some(i), Some(v_vec), Some(idx)) = (
                self.I_bias_temps.get(temp),
                self.V_out_history_temps.get(temp),
                self.CurrentIndex_temps.get(temp),
            ) {
                if let Some(v) = v_vec.get(*idx as usize) {
                    all_i_vals.extend_from_slice(i.as_slice().unwrap());
                    all_v_vals.extend_from_slice(v.as_slice().unwrap());
                }
            }
        }

        if all_i_vals.is_empty() || all_v_vals.is_empty() {
            return Err("プロット可能なデータが見つかりませんでした。".into());
        }

        let get_range = |data: &Vec<f64>| {
            let min = data.iter().cloned().fold(f64::INFINITY, f64::min);
            let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
            if (max - min).abs() < 1e-12 {
                (min - 1.0, max + 1.0)
            } else {
                (min, max)
            }
        };

        let (i_min, i_max) = get_range(&all_i_vals);
        let (v_min, v_max) = get_range(&all_v_vals);

        let mut chart = ChartBuilder::on(&root)
            .caption("IV Curve", ("sans-serif", 30))
            .margin(20)
            .set_all_label_area_size(40)
            .build_cartesian_2d(i_min..i_max, v_min..v_max)
            .map_err(|e| e.to_string())?;

        chart
            .configure_mesh()
            .x_desc("Bias Current [A]")
            .y_desc("Output Voltage [V]")
            .draw()
            .map_err(|e| e.to_string())?;

        for temp in &self.Temps {
            if let (Some(i), Some(v_vec), Some(idx)) = (
                self.I_bias_temps.get(temp),
                self.V_out_history_temps.get(temp),
                self.CurrentIndex_temps.get(temp),
            ) {
                if let Some(v) = v_vec.get(*idx as usize) {
                    let points = i.iter().zip(v.iter()).map(|(&x, &y)| (x, y));
                    chart
                        .draw_series(LineSeries::new(points, &Palette99::pick(*temp as usize)))
                        .map_err(|e| e.to_string())?
                        .label(format!("{} mK", temp))
                        .legend(move |(x, y)| {
                            PathElement::new(
                                vec![(x, y), (x + 20, y)],
                                &Palette99::pick(*temp as usize),
                            )
                        });
                }
            }
        }

        chart
            .configure_series_labels()
            .background_style(&WHITE.mix(0.8))
            .border_style(&BLACK)
            .draw()
            .map_err(|e| e.to_string())?;

        Ok("IV.png に保存されました".to_string())
    }
}

impl DataProcessorT for IVProcessorS {
    fn AnalyzeFolder(&mut self) -> Result<(), String> {
        self.Temps = glob(&format!("{}/*mK", self.DP.DataPath.display()))
            .map_err(|e| {
                format!(
                    "Failed to glob Temperature folders at {:?}\n{}",
                    self.DP.DataPath, e
                )
            })?
            .filter_map(Result::ok) // 結果を取り出す
            .filter(|path| path.is_dir()) // ディレクトリのみをフィルタ
            .filter_map(|path| {
                path.file_name()
                    .and_then(|name| name.to_str()) // OsStr を &str に変換
                    .and_then(|name| {
                        // "mK" を削除して数値部分をパース
                        name.trim_end_matches("mK").parse::<u32>().ok() // 数値としてパースできる場合のみ抽出
                    })
            })
            .collect();
        self.Temps.sort();

        if self.Temps.len() == 0 {
            return Err(format!(
                "No temperature folders found in [{}].",
                self.DP.DataPath.display()
            )
            .to_string());
        }

        if cfg!(debug_assertions) {
            println!("Temps: {:?}", self.Temps);
        }

        let IVPattern = Regex::new(r"(\d+)uA\.dat$").map_err(|e| format!("Regex Error\n{}", e))?;

        for temp in self.Temps.iter() {
            let IVFiles = glob(&format!(
                "{}/*.dat",
                self.DP.DataPath.join(format!("{}mk", temp)).display()
            ))
            .map_err(|e| format!("Failed to glob IV files at {:?}\n{}", self.DP.DataPath, e))?
            .filter_map(Result::ok)
            .collect::<Vec<PathBuf>>();
            let mut V_out: Vec<f64> = Vec::new();
            let mut I_bias: Vec<f64> = Vec::new();
            for IVFile in IVFiles {
                let V_out_data = LoadTxt(IVFile.as_path())?;
                V_out.push(
                    V_out_data
                        .mean()
                        .ok_or("Failed to calculate mean of ndarray".to_string())?,
                );
                let IVFile_str = IVFile.to_string_lossy();
                // `\d+` で数字部分をキャプチャ
                let I = IVPattern
                    .captures(&IVFile_str)
                    .and_then(|caps| caps.get(1)) // 1つ目のキャプチャグループを取得
                    .and_then(|m| m.as_str().parse::<u32>().ok())
                    .ok_or("Failed to parse I_bias".to_string())?; // `u32` に変換
                I_bias.push(I as f64);
            }
            // I_bias と V_out をペアにする
            let mut paired: Vec<(f64, f64)> =
                I_bias.iter().cloned().zip(V_out.iter().cloned()).collect();

            // I_bias に基づいてソート
            paired.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap()); // I_bias（a.0）でソート

            // ソート後に I_bias と V_out を再度分ける
            I_bias = paired.iter().map(|(i, _)| *i).collect();
            V_out = paired.iter().map(|(_, v)| *v).collect();
            if cfg!(debug_assertions) {
                //println!("V_out: {:?}", V_out);
                //println!("I_bias: {:?}", I_bias);
                //println!();
            }
            Offset(&mut V_out);
            self.V_out_history_temps
                .insert(*temp, vec![Array1::from(V_out)]);
            self.I_bias_temps.insert(*temp, Array1::from(I_bias));
            self.CurrentIndex_temps.insert(*temp, 0);
        }

        let CalibPath = self.DP.DataPath.join("Calibration");
        if !CalibPath.exists() {
            fs::create_dir_all(&CalibPath)
                .map_err(|_| format!("Failed to crate {}.", CalibPath.display()))?;
        // 存在しない場合ディレクトリを作成
        } else {
            for temp in self.Temps.iter() {
                if CalibPath.join(format!("{}mk.dat", temp)).exists() {
                    let V_out = LoadTxt(CalibPath.join(format!("{}mk.dat", temp)).as_path())?;
                    if let Some(V_out_history) = self.V_out_history_temps.get_mut(temp) {
                        if V_out.len()
                            == self
                                .I_bias_temps
                                .get(temp)
                                .ok_or(format!("{}", temp).to_string())?
                                .len()
                        {
                            V_out_history.push(V_out);
                            if let Some(index) = self.CurrentIndex_temps.get_mut(temp) {
                                *index = 1;
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }
}
