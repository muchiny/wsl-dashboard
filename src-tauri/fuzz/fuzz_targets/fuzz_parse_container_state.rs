#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::docker::adapter::DockerCliAdapter;

fuzz_target!(|data: &str| {
    let _ = DockerCliAdapter::parse_container_state(data);
});
