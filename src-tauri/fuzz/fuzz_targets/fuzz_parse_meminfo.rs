#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::monitoring::adapter::parse_meminfo;

fuzz_target!(|data: &str| {
    let m = parse_meminfo(data);
    assert!(m.used_bytes <= m.total_bytes || m.total_bytes == 0);
});
