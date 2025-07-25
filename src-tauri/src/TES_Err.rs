use serde::{Deserialize, Serialize};

#[derive(Debug,Serialize)]
pub(crate) enum TESErr{
    FolderNotFound(String),
    FolderCreateErr(String),
    FolderNotAdequate(String),
    FileCreateErr(String),
    FileOpenErr(String),
    FileNotFound(String),
    FileWriteErr(String),
    NdarrayMeanErr,
    IterMapErr,
    IterMinErr,
    RegexErr,
    RegexCaptureErr,
    RegexGetErr,
    BinarySeekErr,
    BinaryReadErr(String),
    BinaryBufferSizeErr(String),
    CSVReadErr(String),
    CSVParseErr(String),
    PulseChannelEmpty,
    PulseGlobErr,
    LinerFitErr,
    MapGetErr(String),
    FindMaxJumpErr,
    IVGlobErr,
    IVParseErr,
    TooBigLinerFitSample,
    JsonParseErr(String),
    PyErr(String),
    CurrentEnvErr,
    ToStrErr,
    SortErr,
    PulseFileNameErr(String),
}