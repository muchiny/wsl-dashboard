#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::wsl_cli::parser::parse_distro_list;

fuzz_target!(|data: &str| {
    let _ = parse_distro_list(data);
});
