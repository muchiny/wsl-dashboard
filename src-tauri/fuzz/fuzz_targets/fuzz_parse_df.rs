#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::monitoring::adapter::parse_df_output;

fuzz_target!(|data: &str| {
    let d = parse_df_output(data);
    assert!(d.usage_percent >= 0.0 && d.usage_percent <= 100.0);
});
