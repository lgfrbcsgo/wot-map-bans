use std::fmt::Display;
use std::future::Future;
use std::time::Duration;
use tracing::warn;

pub mod request_id;
pub mod validation;

pub async fn retry<T, E: Display, Fut: Future<Output = Result<T, E>>, F: Fn() -> Fut>(
    mut retries: u8,
    interval: Duration,
    func: F,
) -> Result<T, E> {
    loop {
        let result = func().await;
        match result {
            Ok(v) => return Ok(v),
            Err(e) => {
                if retries == 0 {
                    return Err(e);
                } else {
                    warn!("Retrying {} more times. Error: {}", retries, e);
                    retries -= 1;
                    tokio::time::sleep(interval).await;
                }
            }
        }
    }
}
