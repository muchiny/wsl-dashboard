#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::monitoring::adapter::parse_ps_aux;

fuzz_target!(|data: &str| {
    let _ = parse_ps_aux(data);
});
