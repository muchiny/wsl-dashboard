use crate::domain::errors::DomainError;

/// Decode wsl.exe output. On Windows, wsl.exe outputs UTF-16LE.
/// When called from within WSL, the raw bytes need decoding.
/// Falls back to UTF-8 if UTF-16LE decoding fails.
pub fn decode_wsl_output(bytes: &[u8]) -> Result<String, DomainError> {
    // Try UTF-16LE if even length and looks like UTF-16 (null bytes at odd positions)
    if bytes.len() >= 2 && bytes.len().is_multiple_of(2) {
        let has_bom = bytes[0] == 0xFF && bytes[1] == 0xFE;
        // Count null bytes at odd positions (signature of UTF-16LE for ASCII/Latin text)
        let null_at_odd = bytes.iter().skip(1).step_by(2).filter(|&&b| b == 0).count();
        let total_pairs = bytes.len() / 2;

        if has_bom || (total_pairs > 0 && null_at_odd * 2 > total_pairs) {
            let u16s: Vec<u16> = bytes
                .chunks_exact(2)
                .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
                .collect();
            if let Ok(s) = String::from_utf16(&u16s) {
                let s = s.strip_prefix('\u{FEFF}').unwrap_or(&s);
                return Ok(s.to_string());
            }
        }
    }

    // Fallback to UTF-8
    String::from_utf8(bytes.to_vec())
        .map_err(|e| DomainError::WslCliError(format!("Failed to decode output: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_utf8_fallback() {
        let input = b"Hello, World!";
        let result = decode_wsl_output(input).unwrap();
        assert_eq!(result, "Hello, World!");
    }

    #[test]
    fn test_decode_utf16le() {
        // "Hi" in UTF-16LE
        let input: Vec<u8> = vec![0x48, 0x00, 0x69, 0x00];
        let result = decode_wsl_output(&input).unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn test_decode_utf16le_with_bom() {
        // BOM + "Hi" in UTF-16LE
        let input: Vec<u8> = vec![0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00];
        let result = decode_wsl_output(&input).unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn test_pure_ascii_not_misinterpreted_as_utf16() {
        // "Hi" as pure ASCII (2 bytes, even length) must NOT be decoded as UTF-16LE
        let input = b"Hi";
        let result = decode_wsl_output(input).unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn test_utf16le_without_bom_detected_by_null_bytes() {
        // "Hello" in UTF-16LE without BOM: H\0e\0l\0l\0o\0
        let input: Vec<u8> = vec![0x48, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00];
        let result = decode_wsl_output(&input).unwrap();
        assert_eq!(result, "Hello");
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn decode_wsl_output_never_panics(bytes in proptest::collection::vec(any::<u8>(), 0..1024)) {
                let _ = decode_wsl_output(&bytes);
            }

            #[test]
            fn decode_roundtrip_utf8(s in "[a-zA-Z0-9 ]{0,100}") {
                let result = decode_wsl_output(s.as_bytes());
                // Pure ASCII must always succeed and return the original string
                prop_assert!(result.is_ok());
                prop_assert_eq!(result.unwrap(), s);
            }
        }
    }
}
