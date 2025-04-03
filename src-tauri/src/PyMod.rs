use std::path::{PathBuf};
use std::process::{Command, Output};

pub(crate) struct PyManager {
    PyPath: PathBuf
}

#[allow(non_snake_case)]
impl PyManager {
    pub(crate) fn new(path:PathBuf) -> PyManager {
        PyManager {
            PyPath: path
        }
    }

    pub(crate) fn SetPath(&mut self, path: PathBuf) {
        self.PyPath = path;
    }

    pub(crate) fn ExePath(&self) -> String {
        format!("{}/python.exe",&self.PyPath.to_str().expect("Failed to execute command"))
    }

    pub(crate) fn RunScript(&self, script: String) -> Result<String, String> {
        // 実行するコマンドを表示
        let command = format!("{} -c {}", self.ExePath(), script);
        //println!("Executing command: {}", command);

        // コマンドを実行
        let output: Output = Command::new(self.ExePath())
            .args(["-c", &script])
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?;

        // エラーチェック
        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Python script failed with error: {}", error_msg));
        }

        // 標準出力を返す
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(result)
    }

    pub(crate) fn RunMainFromFile(&self, FileName:PathBuf,Args:Vec<String>,ScriptPath:String) -> Result<String, String> {
        let ScriptPathBuf = PathBuf::from(ScriptPath.as_str());
        if FileName.extension().map(|e| e == "py").unwrap_or(true) && ScriptPathBuf.join(&FileName).exists() {
            let Args_str = Args.iter().map(|arg| arg.to_string()).collect::<Vec<String>>().join(", ");

            let Command=format!(
                "from {}.Convert import Conv;from {}.{} import main;import json;print(json.dumps(Conv(main({}))))",ScriptPathBuf.to_str().unwrap(),ScriptPathBuf.to_str().unwrap(),FileName.file_stem().unwrap().to_str().unwrap(),Args_str
            );

            self.RunScript(Command)
        } else {
            Err("File is not a Python file".to_string())
        }
    }

    pub(crate) fn Install(&self,package:String){
        let output = Command::new(self.ExePath())
            .args(["-m", "pip", "install", &format!("--target={}/Lib/site-packages",&self.PyPath.to_str().expect("")), &package])
            .output()
            .expect("Failed to execute command");
    }

}

