#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::monitoring::adapter::parse_proc_net_dev;

fuzz_target!(|data: &str| {
    let _ = parse_proc_net_dev(data);
});
