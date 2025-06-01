#![allow(non_snake_case)]
use ndarray::Array1;

pub mod IV;
pub mod RT;

pub(crate) fn LinerFit(x: &Array1<f64>, y: &Array1<f64>) -> Result<f64, String> {
    let n = x.len() as f64;

    let sum_x = x.sum();
    let sum_y = y.sum();
    let sum_xx = x.mapv(|xi| xi * xi).sum();
    let sum_xy = x.iter().zip(y.iter()).map(|(&xi, &yi)| xi * yi).sum::<f64>();

    let denominator = n * sum_xx - sum_x * sum_x;
    if denominator.abs() < 1e-10 {
        return Err("Failed to compute LinerFit".into());
    }

    let a = (n * sum_xy - sum_x * sum_y) / denominator;
    // b = (sum_y - a * sum_x) / n;

    return Ok(a);
}