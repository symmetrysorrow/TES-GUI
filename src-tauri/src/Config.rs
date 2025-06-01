use serde::{Deserialize, Deserializer, Serialize};
use serde::de::Error;

fn float_to_u32<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    // まず、デシリアライズされた値を f64 として取得
    let value: f64 = Deserialize::deserialize(deserializer)?;

    // f64 の値を u32 に変換 (切り捨て)
    // 浮動小数点数が u32 型の範囲を超えている場合はエラーを返すことができます
    if value.is_nan() || value < 0.0 || value > u32::MAX as f64 {
        Err(Error::custom("float out of range"))
    } else {
        // f64 を u32 に変換
        Ok(value.trunc() as u32)
    }
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct TESAnalysisConfig {
    pub R_sh: f64,
    pub LinerFitSample:u32,
}

impl TESAnalysisConfig{
    pub fn new() -> Self {
        Self {
            R_sh: 3.9,
            LinerFitSample: 10,
        }
    }
}
#[derive(Debug, Clone,Serialize, Deserialize,PartialEq)]
pub struct PulseAnalysisConfig {
    pub CutoffFrequency: f64,
    #[serde(deserialize_with = "float_to_u32")]
    pub BaseLinePreSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub BaseLinePostSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub PeakSearchSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub PeakAveragePreSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub PeakAveragePostSample: u32,
    pub RiseHighRatio: f64,
    pub RiseLowRatio: f64,
    pub DecayHighRatio: f64,
    pub DecayLowRatio: f64,
}

impl PulseAnalysisConfig {
    pub fn new() -> Self {
        Self {
            CutoffFrequency: 0.0,
            BaseLinePreSample: 0,
            BaseLinePostSample: 0,
            PeakSearchSample: 0,
            PeakAveragePreSample: 0,
            PeakAveragePostSample: 0,
            RiseHighRatio: 0.0,
            RiseLowRatio: 0.0,
            DecayHighRatio: 0.0,
            DecayLowRatio: 0.0,
        }
    }
}



#[derive(Debug, Clone,Serialize, Deserialize,PartialEq)]
pub struct PulseReadoutConfig {
    #[serde(deserialize_with = "float_to_u32")]
    pub Sample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub PreSample: u32,
    pub Rate: f64,
}

impl PulseReadoutConfig {
    pub fn new() -> Self {
        Self {
            Sample: 0,
            PreSample: 0,
            Rate: 0.0,
        }
    }
}

#[derive(Debug,Clone,Serialize,  Deserialize,PartialEq)]
pub struct PulseProcessorConfig {
    pub Readout: PulseReadoutConfig,
    pub Analysis: PulseAnalysisConfig,
}