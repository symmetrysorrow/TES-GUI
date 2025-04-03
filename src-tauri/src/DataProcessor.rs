use crate::TES_Err::TESErr;
use ndarray::Array1;
use std::convert::TryInto;
use std::fmt::Display;
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::mem::size_of;
use std::path::{Path, PathBuf};
use tauri::command;

pub(crate) struct DataProcessorS {
    pub(crate) DataPath: PathBuf
}

pub(crate) trait DataProcessorT {
    fn AnalyzeFolder(&mut self) -> Result<(), String>;
}

pub(crate) fn SaveTxt<T: Display>(path: &Path, data: &[T]) -> Result<(), String> {
    // 必要なディレクトリを作成（中間ディレクトリも含む）
    if let Some(parent_dir) = path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e|e.to_string())?;
    }

    let content = data.iter()
        .map(|v| v.to_string())  // `ToString` を使うことで汎用化
        .collect::<Vec<String>>()
        .join("\n");

    // ファイルを書き込む
    fs::write(path, content)
        .map_err(|e|e.to_string())
}

/// バイナリファイルを読み込むメソッド
pub(crate) fn LoadBi(file_path: &Path) -> Result<Array1<f64>, String> {
    // ファイルをバイナリモードで開く
    let mut file = File::open(file_path).map_err(|e|e.to_string())?;

    // 最初の4バイトをスキップ
    file.seek(SeekFrom::Start(4)).map_err(|e|e.to_string())?;

    // ファイルの内容をバイナリデータとして読み込む
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e|e.to_string())?;

    // バッファサイズを確認
    if buffer.len() % size_of::<f64>() != 0 {
        return Err("buffer size is not adequate.".to_string());
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
    let file = File::open(file_path).map_err(|e|e.to_string())?;
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

#[derive(Debug, serde::Serialize)]
pub(crate) enum FolderType{
    IV,RT,Pulse
}

#[command]
pub(crate) fn FindFolderType(folder:&Path)->Result<FolderType,String>{
    if !folder.exists() {
        return Err("Folder not found.".to_string());
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

    return Err("Not TES-related folder.".to_string());
}

impl DataProcessorS {
    /// コンストラクタ: `DataProcessorS` を初期化
    pub(crate) fn new() -> Self {
        Self {
            DataPath: PathBuf::new()
        }
    }

    /// ファイルパスを設定
    pub(crate) fn SetDataPath(&mut self, path: String)->Result<(),String> {
        self.DataPath = Path::new(&path).to_path_buf();
        if !self.DataPath.exists() {
            return Err(format!("Path {} not found.", path).to_string());
        }
        Ok(())
    }
}
