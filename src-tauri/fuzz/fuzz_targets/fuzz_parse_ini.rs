#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::wsl_cli::adapter::WslCliAdapter;

fuzz_target!(|data: &str| {
    let _ = WslCliAdapter::parse_ini(data);
});
