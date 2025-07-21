use reqwest::Client;
use serde_json::json;

pub async fn BesselCoefficients(rate: f64, fs: f64) -> Result<Vec<Vec<f64>>, String> {
    let client = Client::new();
    let url = "https://tes-gui-pyhelper.onrender.com/Bessel";

    let res = client
        .post(url)
        .json(&json!({ "rate": rate, "fs": fs }))
        .send()
        .await
        .map_err(|e| format!("Failed to get response: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| format!("Failed to read body: {}", e))?;

    println!("Status: {}, body: {}", status, text);

    // エラーハンドリング
    if !status.is_success() {
        return Err(format!("Request failed with status {}: {}", status, text));
    }

    // JSONパース
    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let a = json["a"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_f64().unwrap())
        .collect::<Vec<f64>>();

    let b = json["b"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_f64().unwrap())
        .collect::<Vec<f64>>();

    return Ok(vec![a, b]);
}

pub async fn RTFit(R: &Vec<f64>, T: &Vec<f64>) -> Result<Vec<f64>, String> {
    let client = Client::new();
    let url = "https://tes-gui-pyhelper.onrender.com/RTFit";

    let res = client
        .post(url)
        .json(&json!({ "R": R, "T": T }))
        .send()
        .await
        .map_err(|e| format!("Failed to get response: {}", e))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to execute Python command: {}", e))?;
    let result = json
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_f64().unwrap())
        .collect::<Vec<f64>>();

    return Ok(result);
}
