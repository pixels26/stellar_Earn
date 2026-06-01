//! Gas budget targets per entrypoint.
//!
//! Defines explicit instruction-count ceilings for each public entrypoint
//! so that regressions are caught before they reach production.

#![no_std]

use soroban_sdk::{contracttype, symbol_short, Symbol};

/// Maximum allowed instructions per named entrypoint.
#[contracttype]
#[derive(Clone, Debug)]
pub struct GasBudgetTarget {
    pub entrypoint: Symbol,
    pub max_instructions: u64,
}

/// Returns the static gas budget targets for all EarnQuest entrypoints.
pub fn default_targets() -> [GasBudgetTarget; 5] {
    [
        GasBudgetTarget { entrypoint: symbol_short!("init"), max_instructions: 500_000 },
        GasBudgetTarget { entrypoint: symbol_short!("reg_qst"), max_instructions: 1_000_000 },
        GasBudgetTarget { entrypoint: symbol_short!("sub_prf"), max_instructions: 800_000 },
        GasBudgetTarget { entrypoint: symbol_short!("appr_sub"), max_instructions: 1_200_000 },
        GasBudgetTarget { entrypoint: symbol_short!("clm_rwd"), max_instructions: 1_500_000 },
    ]
}

/// Returns true if the measured instruction count is within the budget for the given entrypoint.
pub fn within_budget(entrypoint: &Symbol, measured: u64) -> bool {
    default_targets()
        .iter()
        .find(|t| &t.entrypoint == entrypoint)
        .map(|t| measured <= t.max_instructions)
        .unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn targets_are_non_zero() {
        let env = Env::default();
        let _ = env; // satisfy unused warning
        for t in default_targets().iter() {
            assert!(t.max_instructions > 0);
        }
    }

    #[test]
    fn within_budget_passes_for_low_count() {
        let env = Env::default();
        let ep = symbol_short!("init");
        let _ = env;
        assert!(within_budget(&ep, 100_000));
    }

    #[test]
    fn within_budget_fails_for_high_count() {
        let env = Env::default();
        let ep = symbol_short!("init");
        let _ = env;
        assert!(!within_budget(&ep, 999_999_999));
    }
}