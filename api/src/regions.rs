use anyhow::Context;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::error::Result;

macro_rules! regions {
    (
        $(($code:ident, $op_url:expr, $api_url:expr);)+
    ) => {
        #[derive(Debug, Serialize, Deserialize)]
        pub enum OpenIDProvider {
            $(
                #[serde(rename = $op_url)]
                $code,
            )+
        }

        impl OpenIDProvider {
            pub fn url(&self) -> Url {
                match self {
                    $(Self::$code => Url::parse($op_url).unwrap(),)+
                }
            }

            pub fn api_region(&self) -> ApiRegion {
                match &self {
                    $(Self::$code => ApiRegion::$code,)+
                }
            }
        }

        #[derive(Debug, Serialize, Deserialize)]
        pub enum ApiRegion {
            $($code,)+
        }

        impl ApiRegion {
            pub fn url(&self) -> Url {
                match self {
                    $(Self::$code => Url::parse($api_url).unwrap(),)+
                }
            }
        }
    }
}

regions! {
    (EU, "https://eu.wargaming.net/id/openid/", "https://api.worldoftanks.eu");
    (NA, "https://na.wargaming.net/id/openid/", "https://api.worldoftanks.na");
    (ASIA, "https://asia.wargaming.net/id/openid/", "https://api.worldoftanks.asia");
}

impl ApiRegion {
    pub fn get_endpoint_url(&self, endpoint: &str) -> Result<Url> {
        let endpoint_url = self
            .url()
            .join(endpoint)
            .with_context(|| format!("Failed to construct URL for endpoint {}", endpoint))?;

        Ok(endpoint_url)
    }
}
