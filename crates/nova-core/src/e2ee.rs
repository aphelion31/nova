use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, Payload},
};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use hkdf::Hkdf;
use sha2::Sha256;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum E2eeError {
    #[error("passphrase must not be empty")]
    EmptyPassphrase,
    #[error("encryption failed")]
    EncryptFailed,
    #[error("decryption failed")]
    DecryptFailed,
    #[error("invalid frame format")]
    InvalidFrame,
}

/// Derives a 256-bit media encryption key from a room passphrase and generation counter using HKDF-SHA256.
pub fn derive_media_key(passphrase: &str, room: &str, generation: u32) -> Result<[u8; 32], E2eeError> {
    if passphrase.trim().is_empty() {
        return Err(E2eeError::EmptyPassphrase);
    }
    let salt = format!("nova-e2ee:{room}:{generation}");
    let hk = Hkdf::<Sha256>::new(Some(salt.as_bytes()), passphrase.as_bytes());
    let mut key = [0u8; 32];
    hk.expand(b"nova-media-frame-aes-256-gcm", &mut key)
        .map_err(|_| E2eeError::EncryptFailed)?;
    Ok(key)
}

/// Derives a base64-encoded 32-byte key suitable for WebRTC Encoded Transform or native SFU frame hooks.
pub fn derive_media_key_b64(passphrase: &str, room: &str, generation: u32) -> Result<String, E2eeError> {
    let key = derive_media_key(passphrase, room, generation)?;
    Ok(STANDARD.encode(key))
}

/// Encrypts a media frame payload with a 12-byte nonce prefix (`nonce || ciphertext+tag`).
pub fn encrypt_frame(
    key: &[u8; 32],
    nonce_bytes: [u8; 12],
    plaintext: &[u8],
    aad: &[u8],
) -> Result<Vec<u8>, E2eeError> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| E2eeError::EncryptFailed)?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, Payload { msg: plaintext, aad })
        .map_err(|_| E2eeError::EncryptFailed)?;
    let mut out = Vec::with_capacity(12 + ciphertext.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// Decrypts a media frame formatted as `12-byte nonce || ciphertext+tag`.
pub fn decrypt_frame(key: &[u8; 32], frame: &[u8], aad: &[u8]) -> Result<Vec<u8>, E2eeError> {
    if frame.len() < 12 + 16 {
        return Err(E2eeError::InvalidFrame);
    }
    let (nonce_bytes, ciphertext) = frame.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| E2eeError::DecryptFailed)?;
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, Payload { msg: ciphertext, aad })
        .map_err(|_| E2eeError::DecryptFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_derivation_and_frame_roundtrip() {
        let key = derive_media_key("secret-pass", "standup", 1).expect("derive key");
        let nonce = [7u8; 12];
        let pt = b"opus-frame-bytes-1234";
        let aad = b"peer-1";
        let ct = encrypt_frame(&key, nonce, pt, aad).expect("encrypt");
        let dec = decrypt_frame(&key, &ct, aad).expect("decrypt");
        assert_eq!(dec, pt);

        let wrong = derive_media_key("wrong-pass", "standup", 1).expect("wrong key");
        assert!(decrypt_frame(&wrong, &ct, aad).is_err());
    }
}
