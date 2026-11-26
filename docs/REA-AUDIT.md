# REA Shipped-Artifact Inspection & Release Audit (`nova` v1.1.0)

Recorded using REA MCP tools against the compiled `nova` release binary (`target/release/nova`) and built React Router 8 PWA bundle (`web/build/client`).

## 1. Release Binary Hardening (`target/release/nova`)

- **Evidence ID**: `ev_b3ec80f9a9da0547f6e363b1903cdd99a7157161f8e35930139bd75133b636ba`
- **Format / Arch**: Mach-O `arm64` (64-bit, `12,107,072` bytes / `11.55 MiB`)
- **SHA-256**: `a46c87604f74c7fb4085f4a8701d314f5912b15de1e030e043d54333d681c374`

| Property | State | Basis |
| --- | --- | --- |
| `pie` (ASLR) | `enabled` | `MH_PIE` is set |
| `allow_stack_execution` | `disabled` | `MH_ALLOW_STACK_EXECUTION` is clear |
| `no_heap_execution` | `disabled` | `MH_NO_HEAP_EXECUTION` is clear |
| `restrict_segment` | `disabled` | No `__RESTRICT` segment |
| `stack_protector` | `enabled` | Undefined symbol `___stack_chk_fail` is present |
| `code_signature_present` | `enabled` | `LC_CODE_SIGNATURE` load command is present |
| `encrypted` | `disabled` | No `LC_ENCRYPTION_INFO` command present |
| `hardened_runtime` | `unknown` | `CodeDirectory` flags belong to `inspect_signature` |

## 2. Release Exposure Audits

### Rust Binary (`target/release/nova`)
- **Evidence ID**: `ev_fb82425e18d9df07f720f9c785f075350fbee7ec0501a675948d806ec10e826a`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`not_observed: 4`, `not_applicable: 6`, `unknown: 2`, `not_assessed: 3`) — zero `.dSYM`, `.pdb`, debug companions, or embedded JS source maps.

### React Router 8 PWA Bundle (`web/build/client`)
- **Evidence ID**: `ev_67a977369938f073861813c8d32a1e936ff868db1ba7f9b6bf86ef06338af8ba`
- **SHA-256**: `78174774ec54e02d6776a6451ddd2b20644e7d73030cbbfac4dc96d9bdbb1f97`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`22` scanned text members, `0` credential markers exposed).

### Embedded Crate Metadata Probe (`inspect_rust_binary`)
- **Evidence ID**: `ev_d6f3602ce22acbba44b8ed69f7511316af9d7d85ef2aa7dda2dae8ca09803223` (summary view `ev_d23a30ba86050b5b4512314f1a4a2e0ad15f7befa7d6b62cf20b656005c55b88`)
- **Observation**: Stripped release binary (`12,107,072` bytes), zero `.dep-v0` (`cargo-auditable`) dependency list shipped inside the binary; inferred `rustc` commit hash count `1`.
