#![allow(non_snake_case)]
use ndarray::Array1;
use std::convert::TryInto;
use std::fmt::Display;
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::mem::size_of;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub struct DataProcessorS {
    pub DataPath: PathBuf
}

pub trait DataProcessorT {
    fn AnalyzeFolder(&mut self) -> Result<(), String>;
}

pub(crate) fn SaveTxt<T: Display>(path: &Path, data: &[T]) -> Result<(), String> {
    // 必要なディレクトリを作成（中間ディレクトリも含む）
    if let Some(parent_dir) = path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e|format!("Failed to create {:?}.\n{}",parent_dir,e))?;
    }

    let content = data.iter()
        .map(|v| v.to_string())  // `ToString` を使うことで汎用化
        .collect::<Vec<String>>()
        .join("\n");

    // ファイルを書き込む
    fs::write(path, content)
        .map_err(|e|format!("Failed to write {:?}.\n{}",path.display(),e))
}

/// バイナリファイルを読み込むメソッド
pub(crate) fn LoadBi(file_path: &Path) -> Result<Array1<f64>, String> {
    // ファイルをバイナリモードで開く
    let mut file = File::open(file_path).map_err(|e|format!("Failed to open {:?}\n{}",file_path,e))?;

    // 最初の4バイトをスキップ
    file.seek(SeekFrom::Start(4)).map_err(|e|format!("Failed in seeking binary\n{}",e))?;

    // ファイルの内容をバイナリデータとして読み込む
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e|format!("Failed to read {}.\n{}",file_path.display(),e))?;

    // バッファサイズを確認
    if buffer.len() % size_of::<f64>() != 0 {
        return Err(format!("{} is not a multiple of 64 floating point number.",file_path.display()));
    }

    // バッファを f64 のベクターに変換
    let result: Vec<f64> = buffer
        .chunks(size_of::<f64>())
        .filter_map(|chunk| chunk.try_into().ok())
        .map(|chunk| f64::from_le_bytes(chunk))
        .collect();

    // Vec<f64> を ndarray::Array1<f64> に変換
    Ok(Array1::from(result))
}

/// テキストファイルを読み込むメソッド

pub(crate) fn LoadTxt(file_path: &Path) -> Result<Array1<f64>, String> {
    let file = File::open(file_path).map_err(|e|format!("Failed to open {:?}\n{}",file_path,e))?;
    let reader = BufReader::new(file);
    let mut result = Vec::new();

    // コメント行を除外し、f64 に変換して収集
    for line in reader.lines().filter_map(Result::ok).filter(|line| !line.starts_with('#')) {
        if let Ok(value) = line.trim().parse::<f64>() {
            result.push(value);
        }
    }

    return Ok(Array1::from(result));
}

pub enum FolderType{
    IV,RT,Pulse
}

pub fn FindFolderType(folder:&Path)->Result<FolderType,String>{
    if !folder.exists() {
        return Err(folder.to_string_lossy().to_string());
    }
    if !folder.is_dir() {
        return Err("Not a folder.".to_string());
    }

    let IsIV=fs::read_dir(folder)
        .ok()
        .into_iter()
        .flat_map(|entries| entries.filter_map(Result::ok))
        .filter(|entry| entry.path().is_dir())
        .any(|entry| entry.file_name().to_string_lossy().ends_with("mK") &&
            entry.file_name().to_string_lossy()[..entry.file_name().len()-2].chars().all(char::is_numeric));

    if IsIV{
        return Ok(FolderType::IV);
    }

    let IsRT=folder.join("rawdata").exists();

    if IsRT{
        return Ok(FolderType::RT);
    }

    let IsPulse=fs::read_dir(folder)
        .ok()
        .into_iter()
        .flat_map(|entries| entries.filter_map(Result::ok))
        .filter(|entry| entry.path().is_dir())  // ディレクトリのみ対象
        .any(|entry| {
            let name = entry.file_name().to_string_lossy().into_owned(); // `String` として所有権を取得
            name.starts_with("CH") && name.ends_with("_pulse") &&
                name[2..name.len() - 6].chars().all(char::is_numeric) // "CH"の後と"_pulse"の前が数字
        });

    if IsPulse{
        return Ok(FolderType::Pulse);
    }


    return Err(folder.to_string_lossy().to_string());
}

impl DataProcessorS {
    /// コンストラクタ: `DataProcessorS` を初期化
    pub(crate) fn new() -> Self {
        Self {
            DataPath: PathBuf::new()
        }
    }

    /// ファイルパスを設定
    pub(crate) fn SetDataPath(&mut self, path: &Path) {
        self.DataPath = path.to_path_buf();
        if !self.DataPath.exists() {
            panic!("File not found: {}", self.DataPath.display());
        }
    }
}
