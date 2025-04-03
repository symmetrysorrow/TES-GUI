use crate::Config::{PulseAnalysisConfig, PulseProcessorConfig, PulseReadoutConfig};
use crate::DataProcessor::{DataProcessorS, DataProcessorT, LoadBi};
use crate::PyMod::PyManager;
use biquad::{Biquad, Coefficients, DirectForm2Transposed, Hertz, Type, Q_BUTTERWORTH_F32};
use glob::glob;
use ndarray::{s, Array1};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fmt::format;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{command, State};
use crate::PulseState;

fn BesselCoefficients(rate:f64, fs:f64) ->Result<Vec<Vec<f64>>,String>{
    let py = PyManager::new(PathBuf::from(format!("{}/python-emb", std::env::current_dir()
        .map_err(|e|e.to_string())?.
        to_str().
        ok_or("To str Error.".to_string())?)));
    let be=PathBuf::from("Bessel.py");
    let args_b=vec![rate.to_string(),fs.to_string()];
    return match py.RunMainFromFile(be, args_b, "PyScript".to_string()) {
        Ok(output) => serde_json::from_str::<Vec<Vec<f64>>>(output.as_str()).map_err(|e|e.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn ApplyFilter(coefficients: Coefficients<f64>, signal: &Vec<f64>) -> Vec<f64> {
    let mut filter = DirectForm2Transposed::<f64>::new(coefficients);
    signal.iter().map(|&x| filter.run(x)).collect()
}

fn filtfilt(signal: &Vec<f64>,Coefficients:Vec<Vec<f64>>) -> Vec<f64> {

    let coeffs = Coefficients::<f64> {
        b0: Coefficients[0][0],
        b1: Coefficients[0][1],
        b2: Coefficients[0][2],
        a1: Coefficients[1][1],
        a2: Coefficients[1][2],
    };
    
    let mut filtered = ApplyFilter(coeffs, signal);
    filtered.reverse();
    filtered = ApplyFilter(coeffs, &filtered);
    filtered.reverse();
    return filtered;
}

struct PulseInfoS{
    Base:f64,
    PeakAverage:f64,
    PeakIndex:u32,
    RiseTime:f64,
    DecayTime:f64,
}

impl PulseInfoS{
    pub(crate) fn new() -> Self {
        Self {
            Base: 0.0,
            PeakAverage: 0.0,
            PeakIndex: 0,
            RiseTime: 0.0,
            DecayTime: 0.0,
        }
    }
}

struct PulseInfoHelperS{
    Peak:f64,
    RiseHighIndex:usize,
    RiseLowIndex:usize,
    DecayHighIndex:usize,
    DecayLowIndex:usize
}

impl PulseInfoHelperS{
    pub(crate) fn new() -> Self {
        Self {
            Peak: 0.0,
            RiseHighIndex: 0,
            RiseLowIndex: 0,
            DecayHighIndex: 0,
            DecayLowIndex: 0,
        }
    }
}

struct PulseAnalysisHelperS{
    BaseStart:u32,
    BaseEnd:u32,
    PeakSearch:u32,
    PeakAverageStart:u32,
    PeakAverageEnd:u32,
}

impl PulseAnalysisHelperS {
    pub(crate) fn new(PRConfig: &PulseReadoutConfig, PAConfig: &PulseAnalysisConfig) -> Self {
        Self {
            BaseStart: PRConfig.PreSample/2-PAConfig.BaseLinePreSample,
            BaseEnd: PRConfig.PreSample/2+PAConfig.BaseLinePreSample,
            PeakSearch: PRConfig.PreSample+PAConfig.PeakSearchSample,
            PeakAverageStart: 0,
            PeakAverageEnd: 0,
        }
    }
}

pub(crate) struct PulseProcessorS{
    DP: DataProcessorS,
    PRConfig: PulseReadoutConfig,
    PAConfig: PulseAnalysisConfig,
    pub(crate) Channels: HashSet<u32>,
    PulseInfosCH:HashMap<u32,HashMap<u32,PulseInfoS>>,
}

enum PulseInfo{
    Base,
    PeakAverage,
    PeakIndex,
    RiseTime,
    DecayTime,
}

impl PulseProcessorS{
    pub(crate) fn new() -> Self {
        Self {
            DP: DataProcessorS::new(),
            PRConfig: PulseReadoutConfig::new(),
            PAConfig: PulseAnalysisConfig::new(),
            Channels: HashSet::new(),
            PulseInfosCH: HashMap::new(),
        }
    }

    pub(crate) fn SetDataPath(&mut self, path: String) ->Result<(), String> {
        self.DP.SetDataPath(path)
    }
    
    pub(crate) fn SavePulseInfos(&self,Channel:&u32)->Result<(),String>{
        let InfoPath = self.DP.DataPath.join(format!("CH{}_pulse", Channel)).join("Info.csv");
        let mut InfoFile = File::create(&InfoPath).map_err(|e|e.to_string())?;
        InfoFile.write_all("key,Base,PeakAverage,PeakIndex,RiseTime,DecayTime\n".as_bytes()).expect("Failed to write file");
        for (key,value) in self.PulseInfosCH.get(Channel).unwrap(){
            InfoFile.write_all(format!("{},{},{},{},{},{}\n",key,value.Base,value.PeakAverage,value.PeakIndex,value.RiseTime,value.DecayTime).as_bytes()).expect("Failed to write file");
        }
        return Ok(())
    }
    
    pub(crate) fn LoadPulseInfos(&mut self,Channel:&u32)->Result<(),String>{
        let InfoPath = self.DP.DataPath.join(format!("CH{}_pulse", Channel)).join("Info.csv");
        let InfoFile = File::open(&InfoPath).map_err(|e|e.to_string())?;
        let mut InfoReader=csv::Reader::from_reader(InfoFile);
        let mut InfoMap=HashMap::new();
        for record in InfoReader.records(){
            let record=record.map_err(|e|e.to_string())?;
            let key:u32=record[0].parse().map_err(|_|"CSV parse error".to_string())?;
            let Base:f64=record[1].parse().map_err(|_|"CSV parse error".to_string())?;
            let PeakAverage:f64=record[2].parse().map_err(|_|"CSV parse error".to_string())?;
            let PeakIndex:u32=record[3].parse().map_err(|_|"CSV parse error".to_string())?;
            let RiseTime:f64=record[4].parse().map_err(|_|"CSV parse error".to_string())?;
            let DecayTime:f64=record[5].parse().map_err(|_|"CSV parse error".to_string())?;
            InfoMap.insert(key,PulseInfoS{Base,PeakAverage,PeakIndex,RiseTime,DecayTime});
        }
        self.PulseInfosCH.insert(*Channel,InfoMap);
        Ok(())
    }

    pub(crate) fn GetPulseInfo(&self,mut Pulse:Array1<f64>)->Result<(PulseInfoS,PulseInfoHelperS,PulseAnalysisHelperS),String>{
        let mut PI=PulseInfoS::new();
        let mut PIH=PulseInfoHelperS::new();

        let mut PAH=PulseAnalysisHelperS::new(&self.PRConfig,&self.PAConfig);

        PI.Base=Pulse.slice(s![PAH.BaseStart as usize..PAH.BaseEnd as usize]).mean().ok_or("Ndarray mean error".to_string())?;
        Pulse-=PI.Base;

        PIH.Peak=Pulse.slice(s![self.PRConfig.PreSample as usize..(self.PRConfig.PreSample+self.PAConfig.PeakSearchSample) as usize]).iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        PI.PeakIndex = Pulse.slice(s![self.PRConfig.PreSample as usize..PAH.PeakSearch as usize])
            .iter()
            .enumerate()
            .max_by(|(_, x), (_, y)| x.partial_cmp(y).unwrap())
            .map(|(i, _)| i + self.PRConfig.PreSample as usize).unwrap() as u32; // スライス内のインデックスを元のインデックスに補正
        PAH.PeakAverageStart=PI.PeakIndex-self.PAConfig.PeakAveragePreSample;
        PAH.PeakAverageEnd=PI.PeakIndex+self.PAConfig.PeakAveragePostSample;
        PI.PeakAverage=Pulse.slice(s![PAH.PeakAverageStart as usize..PAH.PeakAverageEnd as usize]).mean().ok_or("Ndarray mean error.".to_string())?;

        for i in (0usize..PI.PeakIndex as usize).rev(){
            if Pulse[i]<PI.PeakAverage*self.PAConfig.RiseHighRatio{
                PIH.RiseHighIndex=i;
                break;
            }
        }
        for i in 0..PIH.RiseHighIndex{
            if Pulse[i]>PI.PeakAverage*self.PAConfig.RiseLowRatio{
                PIH.RiseLowIndex=i;
                break;
            }
        }
        PI.RiseTime=(PIH.RiseHighIndex-PIH.RiseLowIndex) as f64/self.PRConfig.Rate;

        for i in PI.PeakIndex as usize..Pulse.len(){
            if Pulse[i]<PI.PeakAverage*self.PAConfig.DecayHighRatio{
                PIH.DecayHighIndex=i;
                break;
            }
        }

        for i in PIH.DecayHighIndex..Pulse.len(){
            if Pulse[i]<PI.PeakAverage*self.PAConfig.DecayLowRatio{
                PIH.DecayLowIndex=i;
                break;
            }
        }

        PI.DecayTime=(PIH.DecayLowIndex as f64-PIH.DecayHighIndex as f64)/self.PRConfig.Rate;

        return Ok((PI,PIH,PAH));
    }
    
    pub(crate) fn AnalyzePulse(&mut self,Channel:&u32)->Result<(),String>{
        let PulsePattern = Regex::new(r"CH\d+_(\d+)\.dat$").map_err(|e|e.to_string())?;
            
        let PulsePaths = glob(&format!("{}/CH{}_pulse/rawdata/CH{}_*.dat", self.DP.DataPath.display(), Channel,Channel))
            .map_err(|e|e.to_string())?
            .filter_map(Result::ok) // 結果を取り出す を `PathBuf` に変換
            .collect::<Vec<_>>();
            
        let Numbers: Vec<i32> = PulsePaths.iter()
            .filter_map(|path| {
                PulsePattern.captures(path.to_string_lossy().as_ref())?
                    .get(1)?
                    .as_str()
                    .parse::<i32>()
                    .ok()
            })
            .collect();
            
        let mut PulseInfos:HashMap<u32,PulseInfoS>=HashMap::new();

        let BesselCoeffs=BesselCoefficients(self.PRConfig.Rate,self.PAConfig.CutoffFrequency)?;
            
        for (Num,Path) in Numbers.iter().zip(PulsePaths.iter()){
            let Pulse=LoadBi(&Path)?;
            let FilteredPulse=filtfilt(&Pulse.to_vec(),BesselCoeffs.clone());
            let (PI,_PIH,_PAH)=self.GetPulseInfo(Array1::from(FilteredPulse))?;
            PulseInfos.insert(*Num as u32,PI);
        }
        self.PulseInfosCH.insert(*Channel,PulseInfos);
        Ok(())
    }
}

impl DataProcessorT for PulseProcessorS {
    fn AnalyzeFolder(&mut self) -> Result<(), String> {
        let JsonPath = self.DP.DataPath.join("PulseConfig.json");

        if !JsonPath.exists() {
            let JsonPathDefault = PathBuf::from("./Config/PulseConfig.json");
            if JsonPathDefault.exists() {
                std::fs::copy(&JsonPathDefault,&JsonPath).map_err(|e|e.to_string())?;
            } else {
                return Err("File not found".to_string());
            }
        }

        let JsonFile=File::open(&JsonPath).map_err(|e|e.to_string())?;

        let PPC: PulseProcessorConfig = serde_json::from_reader(JsonFile).map_err(|e|e.to_string())?;
        self.PRConfig = PPC.Readout;
        self.PAConfig = PPC.Analysis;

        let mut ConfigChanged=false;

        let JsonPathPre = self.DP.DataPath.join(".PulseConfig.json");

        if JsonPathPre.exists(){
            let JsonFilePre=File::open(&JsonPathPre).map_err(|e|e.to_string())?;
            let PPCPre: PulseProcessorConfig = serde_json::from_reader(JsonFilePre).map_err(|e|e.to_string())?;
            if self.PRConfig!=PPCPre.Readout || self.PAConfig!=PPCPre.Analysis{
                ConfigChanged=true;
            }
        }

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
            return Err("Channel is empty".to_string());
        }

        if cfg!(debug_assertions) {
            println!("Channels: {:?}", self.Channels);
        }
        
        let Channels=self.Channels.clone();
        let mut InfoCSVExist:HashMap<u32,bool>=HashMap::new();

        for ch in Channels.iter() {
            let info_path = self.DP.DataPath.join(format!("CH{}_pulse", ch)).join("Info.csv");
            if info_path.exists() {
                self.LoadPulseInfos(&ch)?;
                InfoCSVExist.insert(*ch,true);
            }else{
                InfoCSVExist.insert(*ch,false);
            }
        }

        for (ch,exist) in InfoCSVExist.iter() {
            if *exist && !ConfigChanged{
                println!("continue: {}", ch);
                continue;
            }
            self.AnalyzePulse(ch)?;
            self.SavePulseInfos(ch)?;
            print!("Analyzed CH{}.\n",ch);
        }

        let JsonFilePre=File::create(&JsonPathPre).map_err(|e|e.to_string())?;
        serde_json::to_writer_pretty(JsonFilePre,&PulseProcessorConfig{Readout:self.PRConfig.clone(),Analysis:self.PAConfig.clone()}).map_err(|e|e.to_string())?;

        Ok(())
    }
}

#[command]
pub fn CreatePulseProcessor(state: State<PulseState>) -> Result<(), String> {
    let mut pulse_processor = state.PulseProcessor.lock().map_err(|e| e.to_string())?;
    if pulse_processor.is_some() {
        return Err("PulseProcessorS is already created".to_string());
    }
    *pulse_processor = Some(PulseProcessorS::new());
    Ok(())
}

#[command]
pub fn DeletePulseProcessor(state: State<PulseState>) -> Result<(), String> {
    let mut pulse_processor = state.PulseProcessor.lock().map_err(|e| e.to_string())?;
    if pulse_processor.is_none() {
        return Err("PulseProcessorS is not created".to_string());
    }
    *pulse_processor = None;
    Ok(())
}

#[command]
pub fn PPAnalyzeFolderCommand(state: State<PulseState>) -> Result<(), String> {
    let mut pulse_processor = state.PulseProcessor.lock().map_err(|e| e.to_string())?;
    if let Some(processor) = pulse_processor.as_mut() {
        processor.AnalyzeFolder()
    } else {
        Err("PulseProcessorS is not created".to_string())
    }
}

#[command]
pub fn PPSetDataPathCommand(state: State<PulseState>, path: String) -> Result<(), String> {
    let mut pulse_processor = state.PulseProcessor.lock().map_err(|e| e.to_string())?;
    if let Some(processor) = pulse_processor.as_mut() {
        processor.SetDataPath(path)
    } else {
        Err("PulseProcessorS is not created".to_string())
    }
}
