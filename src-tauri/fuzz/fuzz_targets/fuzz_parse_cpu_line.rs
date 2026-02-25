#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::monitoring::adapter::ProcFsMonitoringAdapter;

fuzz_target!(|data: &str| {
    let _ = ProcFsMonitoringAdapter::parse_cpu_line(data);
});
