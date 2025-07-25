#![allow(non_snake_case)]

use std::cmp::max;
use crate::Config::{PulseAnalysisConfig, PulseProcessorConfig, PulseReadoutConfig};
use crate::DataProcessor::{DataProcessorS, LoadBi};
use crate::PyMod::BesselCoefficients;
use glob::glob;
use ndarray::{s, Array1};
use regex::Regex;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use rayon::prelude::*;
use std::sync::{Mutex, atomic::{AtomicUsize, Ordering}, Arc};
use biquad::{Biquad, Coefficients, DirectForm1};

pub fn filtfilt(b:&Vec<f64>,a:&Vec<f64>,pulse:&Array1<f64>)->Result<Vec<f64>,String>{
    let coeffs = Coefficients::<f64> { b0:b[0], b1:b[1], b2:b[2], a1:a[1], a2:a[2] };
    // 正方向フィルタ
    let mut filter_fwd = DirectForm1::<f64>::new(coeffs);
    let filtered_fwd: Vec<f64> = pulse.iter().map(|&x| filter_fwd.run(x)).collect();
    // 逆方向フィルタ
    let mut filter_bwd = DirectForm1::<f64>::new(coeffs);
    let mut reversed = filtered_fwd.clone();
    reversed.reverse();
    let mut filtered_bwd: Vec<f64> = reversed.iter().map(|&x| filter_bwd.run(x)).collect();
    filtered_bwd.reverse(); // 元の向きに戻す

    return Ok(filtered_bwd);
}

pub fn GetPulseInfo(
    PRConfig: &PulseReadoutConfig,
    PAConfig: &PulseAnalysisConfig,
    mut Pulse: Array1<f64>,
) -> Result<(PulseInfoS, PulseInfoHelperS, PulseAnalysisHelperS), String> {
    let mut PI = PulseInfoS::new();
    let mut PIH = PulseInfoHelperS::new();
    let mut PAH = PulseAnalysisHelperS::new(PRConfig, PAConfig);

    if Pulse.len()as u32<=max(PAH.BaseEnd, max(PAH.PeakSearch, PAH.PeakAverageEnd)){
        return Err("Data length is too short".to_string());
    }

    PI.Base = Pulse
        .slice(s![PAH.BaseStart as usize..PAH.BaseEnd as usize])
        .mean()
        .ok_or("Failed to calculate mean of ndarray when calculate base")?;
    Pulse -= PI.Base;

    PIH.Peak = Pulse
        .slice(s![PRConfig.PreSample as usize..PAH.PeakSearch as usize])
        .iter()
        .cloned()
        .fold(f64::NEG_INFINITY, f64::max);
    // slice をとる
    let PeakSearchSlice = Pulse.slice(s![PRConfig.PreSample as usize..PAH.PeakSearch as usize]);

    // NaN が含まれていないかチェック
    if PeakSearchSlice.iter().any(|v| v.is_nan()) {
        println!("Pulse:{}",Pulse);
        println!("Slice:{}",PeakSearchSlice);

        return Err(format!(
            "PeakIndex 計算中に NaN が検出されました (PreSample={}..PeakSearch={})",
            PRConfig.PreSample, PAH.PeakSearch
        ));
    }

    // 最大値のインデックスを取得（スライス内）
    let PeakIndexInSlice = PeakSearchSlice
        .iter()
        .enumerate()
        .max_by(|(_, x), (_, y)| x.partial_cmp(y).unwrap())
        .ok_or_else(|| "PeakIndex を取得できませんでした: スライスが空か全要素が比較不能".to_string())?;

    // スライスの開始位置を補正して元のインデックスに戻す
    PI.PeakIndex = (PeakIndexInSlice.0 + PRConfig.PreSample as usize) as u32;
    PAH.PeakAverageStart = PI.PeakIndex - PAConfig.PeakAveragePreSample;
    PAH.PeakAverageEnd = PI.PeakIndex + PAConfig.PeakAveragePostSample;
    PI.PeakAverage = Pulse
        .slice(s![
                PAH.PeakAverageStart as usize..PAH.PeakAverageEnd as usize
            ])
        .mean()
        .ok_or("Failed to calculate mean of ndarray when calculate average")?;

    for i in (0usize..PI.PeakIndex as usize).rev() {
        if Pulse[i] < PI.PeakAverage * PAConfig.RiseHighRatio {
            PIH.RiseHighIndex = i;
            break;
        }
    }
    for i in 0..PIH.RiseHighIndex {
        if Pulse[i] > PI.PeakAverage * PAConfig.RiseLowRatio {
            PIH.RiseLowIndex = i;
            break;
        }
    }
    PI.RiseTime = (PIH.RiseHighIndex - PIH.RiseLowIndex) as f64 / PRConfig.Rate;

    for i in PI.PeakIndex as usize..Pulse.len() {
        if Pulse[i] < PI.PeakAverage * PAConfig.DecayHighRatio {
            PIH.DecayHighIndex = i;
            break;
        }
    }

    for i in PIH.DecayHighIndex..Pulse.len() {
        if Pulse[i] < PI.PeakAverage * PAConfig.DecayLowRatio {
            PIH.DecayLowIndex = i;
            break;
        }
    }

    PI.DecayTime = (PIH.DecayLowIndex as f64 - PIH.DecayHighIndex as f64) / PRConfig.Rate;

    return Ok((PI, PIH, PAH));
}


#[derive(Serialize)]
#[derive(Debug)]
pub struct PulseInfoS {
    pub(crate) Base: f64,
    PeakAverage: f64,
    PeakIndex: u32,
    RiseTime: f64,
    DecayTime: f64,
}

impl PulseInfoS {
    pub fn new() -> Self {
        Self {
            Base: 0.0,
            PeakAverage: 0.0,
            PeakIndex: 0,
            RiseTime: 0.0,
            DecayTime: 0.0,
        }
    }
}

#[derive(Serialize)]
pub struct PulseInfoHelperS {
    Peak: f64,
    RiseHighIndex: usize,
    RiseLowIndex: usize,
    DecayHighIndex: usize,
    DecayLowIndex: usize,
}

impl PulseInfoHelperS {
    pub fn new() -> Self {
        Self {
            Peak: 0.0,
            RiseHighIndex: 0,
            RiseLowIndex: 0,
            DecayHighIndex: 0,
            DecayLowIndex: 0,
        }
    }
}

#[derive(Serialize)]
pub struct PulseAnalysisHelperS {
    BaseStart: u32,
    BaseEnd: u32,
    PeakSearch: u32,
    PeakAverageStart: u32,
    PeakAverageEnd: u32,
}

impl PulseAnalysisHelperS {
    pub fn new(PRConfig: &PulseReadoutConfig, PAConfig: &PulseAnalysisConfig) -> Self {
        Self {
            BaseStart: PRConfig.PreSample / 2 - PAConfig.BaseLinePreSample,
            BaseEnd: PRConfig.PreSample / 2 + PAConfig.BaseLinePreSample,
            PeakSearch: PRConfig.PreSample + PAConfig.PeakSearchSample,
            PeakAverageStart: 0,
            PeakAverageEnd: 0,
        }
    }
}

pub struct PulseProcessorS {
    pub DP: DataProcessorS,
    pub(crate) PRConfig: PulseReadoutConfig,
    pub(crate) PAConfig: PulseAnalysisConfig,
    pub Channels: HashSet<u32>,
    pub PulseInfosCH: HashMap<u32, HashMap<u32, PulseInfoS>>,
    InfoCSVExist: HashMap<u32, bool>,
    pub BesselCoeffs: Vec<Vec<f64>>,
}

impl PulseProcessorS {
    pub fn new() -> Self {
        Self {
            DP: DataProcessorS::new(),
            PRConfig: PulseReadoutConfig::new(),
            PAConfig: PulseAnalysisConfig::new(),
            Channels: HashSet::new(),
            PulseInfosCH: HashMap::new(),
            InfoCSVExist: HashMap::new(),
            BesselCoeffs: Vec::new(),
        }
    }

    pub fn SetDataPath(&mut self, path: &Path) {
        self.DP.SetDataPath(path);
    }

    pub fn SavePulseInfos(&self, Channel: &u32) -> Result<(), String> {
        let InfoPath = self
            .DP
            .DataPath
            .join(format!("CH{}_pulse", Channel))
            .join("Info.csv");
        let mut InfoFile = File::create(&InfoPath)
            .map_err(|e| format!("Failed to create {:?}\n{}", InfoPath, e))?;
        InfoFile
            .write_all("key,Base,PeakAverage,PeakIndex,RiseTime,DecayTime\n".as_bytes())
            .expect("Failed to write file");
        for (key, value) in self.PulseInfosCH.get(Channel).unwrap() {
            InfoFile
                .write_all(
                    format!(
                        "{},{},{},{},{},{}\n",
                        key,
                        value.Base,
                        value.PeakAverage,
                        value.PeakIndex,
                        value.RiseTime,
                        value.DecayTime
                    )
                    .as_bytes(),
                )
                .expect("Failed to write file");
        }
        return Ok(());
    }

    pub fn SaveConfig(&mut self,new_config: serde_json::Value) -> Result<(), String> {
        let JsonPath = self.DP.DataPath.join("PulseConfig.json");

        // JSONをきれいに整形して文字列に変換
        let json_str = serde_json::to_string_pretty(&new_config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        // ファイルに書き込む
        std::fs::write(JsonPath, json_str)
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        let PPC: PulseProcessorConfig = serde_json::from_value(new_config)
            .map_err(|e| format!("Failed to parse \n{}",  e))?;
        self.PRConfig = PPC.Readout;
        self.PAConfig = PPC.Analysis;

        Ok(())
    }

    pub fn LoadPulseInfos(&mut self, Channel: &u32) -> Result<(), String> {
        let InfoPath = self
            .DP
            .DataPath
            .join(format!("CH{}_pulse", Channel))
            .join("Info.csv");
        let InfoFile =
            File::open(&InfoPath).map_err(|e| format!("Failed to open {:?}\n{}", InfoPath, e))?;
        let mut InfoReader = csv::Reader::from_reader(InfoFile);
        let mut InfoMap = HashMap::new();
        for record in InfoReader.records() {
            let record = record.map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let key: u32 = record[0]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let Base: f64 = record[1]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let PeakAverage: f64 = record[2]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let PeakIndex: u32 = record[3]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let RiseTime: f64 = record[4]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            let DecayTime: f64 = record[5]
                .parse()
                .map_err(|e| format!("Failed to parse {:?}\n{}", InfoPath, e))?;
            InfoMap.insert(
                key,
                PulseInfoS {
                    Base,
                    PeakAverage,
                    PeakIndex,
                    RiseTime,
                    DecayTime,
                },
            );
        }
        self.PulseInfosCH.insert(*Channel, InfoMap);
        Ok(())
    }


    pub fn AnalyzePulse<G: FnMut(u32)>(&mut self, Channel: &u32, mut progress_callback: G) -> Result<(), String> {
        let pulse_pattern = Regex::new(r"CH\d+_(\d+)\.dat$").map_err(|e| format!("Regex Error\n{}", e))?;

        let pulse_paths = glob(&format!(
            "{}/CH{}_pulse/rawdata/CH{}_*.dat",
            self.DP.DataPath.display(),
            Channel,
            Channel
        ))
            .map_err(|e| format!("Failed to glob Pulse files: {}", e))?
            .filter_map(Result::ok)
            .collect::<Vec<_>>();

        let total = pulse_paths.len() as u32;
        let done = Arc::new(AtomicUsize::new(0));

        let numbers: Vec<i32> = pulse_paths.iter()
            .filter_map(|path| {
                pulse_pattern.captures(path.to_string_lossy().as_ref())?
                    .get(1)?.as_str().parse::<i32>().ok()
            })
            .collect();

        let pulse_infos_mutex = Arc::new(Mutex::new(HashMap::new()));
        let done_clone = Arc::clone(&done);

        let PRConfig = self.PRConfig.clone();
        let PAConfig = self.PAConfig.clone();

        // Rayon 並列処理を別スレッドで起動
        let bessel_clone = self.BesselCoeffs.clone();
        let pulse_infos_clone = Arc::clone(&pulse_infos_mutex);
        let numbers_clone = numbers.clone();
        let paths_clone = pulse_paths.clone();
        let handle = std::thread::spawn(move || {
            numbers_clone.par_iter()
                .zip(paths_clone.par_iter())
                .for_each(|(num, path)| {
                    if let Ok(pulse) = LoadBi(path) {
                        let filtered_pulse = filtfilt(&bessel_clone[0],&bessel_clone[1],&pulse).map_err(|e| format!("Filter error: {}", e)).unwrap();
                        if let Ok((pi, _, _)) = GetPulseInfo(&PRConfig,&PAConfig,Array1::from(filtered_pulse)) {
                            let mut map = pulse_infos_clone.lock().unwrap();
                            map.insert(*num as u32, pi);
                        }
                    }
                    done_clone.fetch_add(1, Ordering::SeqCst);
                });
        });

        // メインスレッドで進捗を監視してprogress_callbackを呼ぶ
        while done.load(Ordering::SeqCst) < total as usize {
            let current = done.load(Ordering::SeqCst) as u32;
            let percent = (current * 100) / total;
            progress_callback(percent);
            std::thread::sleep(std::time::Duration::from_secs(1));
        }

        // 最後に必ず100%を通知
        progress_callback(100);

        // 並列処理スレッドの終了を待つ
        handle.join().map_err(|_| "Join thread failed".to_string())?;

        // PulseInfos を取り出し
        let pulse_infos = Arc::try_unwrap(pulse_infos_mutex)
            .map_err(|_| "Arc still has multiple owners".to_string())?
            .into_inner()
            .map_err(|e| format!("Mutex poisoned: {}", e))?;

        self.PulseInfosCH.insert(*Channel, pulse_infos);
        Ok(())
    }

    pub fn ResetPreResult(&mut self)-> Result<(), String> {
        for ch in self.Channels.iter() {
            self.InfoCSVExist.insert(*ch, false);
        }
        Ok(())
    }

    pub fn AnalyzePulseFolder<
        F: FnMut(u32, u32, u32),
        G: FnMut(u32, u32),
    >(
        &mut self,
        mut OnChannelDone: F,
        mut OnPulseProgress: G,
    ) -> Result<(), String> {

        let Total=self.Channels.len() as u32;
        println!("Total: {}", self.Channels.len());
        let mut Done:u32=0;

        if cfg!(debug_assertions) {
            println!("Channels: {:?}", self.Channels);
        }

        let mut keys: Vec<u32> = self.InfoCSVExist.keys().cloned().collect();
        keys.sort();

        OnChannelDone(Done, Total, keys[0]);

        for ch in keys {
            let exist = self.InfoCSVExist.get(&ch).unwrap(); // 値を取得
            let mut inner_progress = |progress_percent: u32| {
                OnPulseProgress(progress_percent, ch);
            };
            if *exist{
                println!("continue: {}", ch);
            }
            else{
                self.AnalyzePulse(&ch, &mut inner_progress)?;
                self.SavePulseInfos(&ch)?;
                print!("Analyzed CH{}.\n", ch);
            }
            Done += 1;
            OnChannelDone(Done, Total, ch);
        }

        Ok(())
    }

    pub fn AnalyzePulseFolderPre(&mut self)->Result<String,String>{
        let JsonPath = self.DP.DataPath.join("PulseConfig.json");

        if !JsonPath.exists() {
            let JsonPathDefault = PathBuf::from("./Config/PulseConfig.json");
            if JsonPathDefault.exists() {
                std::fs::copy(&JsonPathDefault, &JsonPath).map_err(|e| {
                    format!("Failed to copy.{}\n{}", JsonPathDefault.display(), e).to_string()
                })?;
            } else {
                return Err(format!("Failed to find {}.\n", JsonPathDefault.display()).to_string());
            }
        }

        let JsonFile =
            File::open(&JsonPath).map_err(|e| format!("Failed to open {:?}\n{}", JsonPath, e))?;

        let PPC: PulseProcessorConfig = serde_json::from_reader(JsonFile)
            .map_err(|e| format!("Failed to parse {:?}\n{}", JsonPath, e))?;
        self.PRConfig = PPC.Readout;
        self.PAConfig = PPC.Analysis;

        // Besselフィルタ係数の計算（同期）
        let rt = tokio::runtime::Runtime::new().unwrap();
        self.BesselCoeffs = rt.block_on(BesselCoefficients(
            self.PRConfig.Rate,
            self.PAConfig.CutoffFrequency,
        ))?;

        let ChannelPattern = format!("{}/CH*_pulse", self.DP.DataPath.display());

        self.Channels = glob(&ChannelPattern)
            .expect("Failed to read glob pattern")
            .filter_map(Result::ok) // PathBuf の結果を取り出す
            .filter(|path| path.is_dir()) // ディレクトリのみフィルタ
            .filter_map(|path| {
                path.file_name()
                    .and_then(|name| name.to_str()) // OsStr を &str に変換
                    .and_then(|name| name.strip_prefix("CH")) // "CH" を削除
                    .and_then(|name| name.strip_suffix("_pulse")) // "_pulse" を削除
                    .and_then(|name| name.parse::<u32>().ok()) // 数値としてパース
            })
            .collect();

        if self.Channels.is_empty() {
            return Err("Pulse has no channels.".to_string());
        }

        let Channels = self.Channels.clone();

        let mut AllExist=true;

        for ch in Channels.iter() {
            let info_path = self
                .DP
                .DataPath
                .join(format!("CH{}_pulse", ch))
                .join("Info.csv");
            if info_path.exists() {
                self.LoadPulseInfos(&ch)?;
                self.InfoCSVExist.insert(*ch, true);
            } else {
                self.InfoCSVExist.insert(*ch, false);
                AllExist=false;
            }
        }
        if !AllExist{
            return Ok("Lacking".to_string());
        }

        return Ok("Perfect".to_string());
    }
}
