#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::iac::adapter::parse_k8s_nodes;

fuzz_target!(|data: &str| {
    let _ = parse_k8s_nodes(data);
});
