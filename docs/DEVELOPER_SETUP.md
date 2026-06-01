# Developer Setup

## Rust Toolchain Requirements

This project requires [rustup](https://rustup.rs/) and a default Rust toolchain.

- The setup script (`scripts/dev_setup.sh`) automatically checks for rustup and sets the stable toolchain as default if missing.
- To install manually:

  ```sh
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup default stable
  ```

- Verify your toolchain:

  ```sh
  rustup show active-toolchain
  ```
