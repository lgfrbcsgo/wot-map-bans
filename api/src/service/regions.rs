use anyhow::Context;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::error::Result;

macro_rules! regions {
    (
        $(
            ($code:ident, $op_url:expr, $api_url:expr);
        )+
    ) => {
        #[derive(Debug, Serialize, Deserialize)]
        pub enum OpenIDEndpoint {
            $(
                #[serde(rename = $op_url)]
                $code,
            )+
        }

        impl OpenIDEndpoint {
            pub fn url(&self) -> Url {
                match self {
                    $(Self::$code => Url::parse($op_url).unwrap(),)+
                }
            }

            pub fn api_realm(&self) -> ApiRealm {
                match &self {
                    $(Self::$code => ApiRealm::$code,)+
                }
            }
        }

        #[derive(Debug, Serialize, Deserialize)]
        pub enum ApiRealm {
            $($code,)+
        }

        impl ApiRealm {
            pub fn url(&self) -> Url {
                match self {
                    $(Self::$code => Url::parse($api_url).unwrap(),)+
                }
            }

            pub fn get_endpoint_url(&self, endpoint: &str) -> Result<Url> {
                let endpoint_url = self
                    .url()
                    .join(endpoint)
                    .with_context(|| format!("Failed to construct URL for endpoint {}", endpoint))?;

                Ok(endpoint_url)
            }
        }
    }
}

regions! {
    (EU, "https://eu.wargaming.net/id/openid/", "https://api.worldoftanks.eu");
    (NA, "https://na.wargaming.net/id/openid/", "https://api.worldoftanks.na");
    (Asia, "https://asia.wargaming.net/id/openid/", "https://api.worldoftanks.asia");
}
