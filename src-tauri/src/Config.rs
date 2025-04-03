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

#[derive(Serialize, Deserialize,PartialEq)]
pub(crate) struct TESAnalysisConfig {
    pub(crate) R_sh: f64,
    pub(crate) LinerFitSample:u32,
}

impl TESAnalysisConfig{
    pub(crate) fn new() -> Self {
        Self {
            R_sh: 3.9,
            LinerFitSample: 10,
        }
    }
}
#[derive(Debug, Clone,Serialize, Deserialize,PartialEq)]
pub(crate) struct PulseAnalysisConfig {
    pub(crate) CutoffFrequency: f64,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) BaseLinePreSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) BaseLinePostSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) PeakSearchSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) PeakAveragePreSample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) PeakAveragePostSample: u32,
    pub(crate) RiseHighRatio: f64,
    pub(crate) RiseLowRatio: f64,
    pub(crate) DecayHighRatio: f64,
    pub(crate) DecayLowRatio: f64,
}

impl PulseAnalysisConfig {
    pub(crate) fn new() -> Self {
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
pub(crate) struct PulseReadoutConfig {
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) Sample: u32,
    #[serde(deserialize_with = "float_to_u32")]
    pub(crate) PreSample: u32,
    pub(crate) Rate: f64,
}

impl PulseReadoutConfig {
    pub(crate) fn new() -> Self {
        Self {
            Sample: 0,
            PreSample: 0,
            Rate: 0.0,
        }
    }
}

#[derive(Debug,Clone,Serialize,  Deserialize,PartialEq)]
pub(crate) struct PulseProcessorConfig {
    pub(crate) Readout: PulseReadoutConfig,
    pub(crate) Analysis: PulseAnalysisConfig,
}

impl PulseProcessorConfig {
    pub(crate) fn new() -> Self {
        Self {
            Readout: PulseReadoutConfig::new(),
            Analysis: PulseAnalysisConfig::new(),
        }
    }
}