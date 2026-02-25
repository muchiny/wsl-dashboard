#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::wsl_cli::encoding::decode_wsl_output;

fuzz_target!(|data: &[u8]| {
    let _ = decode_wsl_output(data);
});
