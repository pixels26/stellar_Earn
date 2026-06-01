# EarnQuest Contract Interface Specification

## Overview
This document describes the public interface of the EarnQuest smart contract, a Soroban-based contract for managing quests, submissions, escrow, and reputation on the Stellar blockchain.

## Table of Contents
- [Data Types](#data-types)
- [Contract Functions](#contract-functions)
  - [Quest Management](#quest-management)
  - [Submission Management](#submission-management)
  - [Reputation & Badges](#reputation--badges)
  - [Escrow Management](#escrow-management)
  - [Contract Initialization & Configuration](#contract-initialization--configuration)
  - [Upgrade & Migration](#upgrade--migration)
  - [Emergency Pause Mechanism](#emergency-pause-mechanism)

---

## Data Types

### QuestStatus
```rust
pub enum QuestStatus {
    Active,
    Paused,
    Completed,
    Expired,
    Cancelled,
}
```
- **Active**: Quest is active and accepting submissions
- **Paused**: Quest is temporarily paused
- **Completed**: Quest has reached participant limit or been manually completed
- **Expired**: Quest deadline has passed
- **Cancelled**: Quest has been cancelled by the creator

### SubmissionStatus
```rust
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}
```
- **Pending**: Submission is awaiting verification
- **Approved**: Submission has been approved
- **Rejected**: Submission has been rejected
- **Paid**: Reward has been paid out

### Quest
```rust
pub struct Quest {
    pub id: Symbol,
    pub creator: Address,
    pub reward_asset: Address,
    pub reward_amount: i128,
    pub verifier: Address,
    pub deadline: u64,
    pub status: QuestStatus,
    pub max_participants: u32,
    pub total_claims: u32,
}
```
- **id**: Unique quest identifier
- **creator**: Address of the quest creator
- **reward_asset**: Asset address for rewards
- **reward_amount**: Reward amount per participant
- **verifier**: Address authorized to verify submissions
- **deadline**: Quest deadline (Unix timestamp)
- **status**: Current quest status
- **max_participants**: Maximum number of participants allowed
- **total_claims**: Total number of approved claims

### Submission
```rust
pub struct Submission {
    pub quest_id: Symbol,
    pub submitter: Address,
    pub proof_hash: BytesN<32>,
    pub status: SubmissionStatus,
    pub timestamp: u64,
}
```
- **quest_id**: Associated quest ID
- **submitter**: Address of the submitter
- **proof_hash**: Hash of the proof data
- **status**: Current submission status
- **timestamp**: Submission timestamp

### UserStats
```rust
pub struct UserStats {
    pub address: Address,
    pub total_xp: u32,
    pub level: u32,
    pub quests_completed: u32,
    pub badges: Vec<Symbol>,
}
```
- **address**: User address
- **total_xp**: Total experience points earned
- **level**: Current user level
- **quests_completed**: Number of quests completed
- **badges**: Earned badges

### ContractConfig
```rust
pub struct ContractConfig {
    pub admin: Address,
    pub version: u32,
    pub initialized: bool,
}
```
- **admin**: Admin address with upgrade and configuration permissions
- **version**: Current contract version
- **initialized**: Whether the contract has been initialized

### PauseState
```rust
pub struct PauseState {
    pub is_paused: bool,
    pub pause_timestamp: u64,
    pub timelock_delay: u64,
    pub pause_signers: Vec<Address>,
    pub required_signatures: u32,
    pub last_pause_time: u64,
    pub grace_period: u64,
    pub pause_reason: Option<Symbol>,
}
```
- **is_paused**: Whether the contract is currently paused
- **pause_timestamp**: Timestamp when pause was activated (for timelock)
- **timelock_delay**: Timelock delay in seconds before pause becomes effective
- **pause_signers**: Addresses that have signed to pause (for multi-sig)
- **required_signatures**: Number of signatures required to execute pause
- **last_pause_time**: Timestamp of last pause event for grace period
- **grace_period**: Grace period in seconds for emergency withdrawals
- **pause_reason**: Optional emergency pause reason

---

## Contract Functions

### Quest Management

#### register_quest
```rust
pub fn register_quest(
    env: Env,
    id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
    max_participants: u32,
) -> Result<(), Error>
```
**Description**: Register a new quest with participant limit

**Parameters**:
- `env`: Contract environment
- `id`: Unique quest identifier
- `creator`: Address of the quest creator (must be authenticated)
- `reward_asset`: Asset address for rewards
- `reward_amount`: Reward amount per participant
- `verifier`: Address authorized to verify submissions
- `deadline`: Quest deadline (Unix timestamp)
- `max_participants`: Maximum number of participants allowed

**Returns**: `Ok(())` on success

**Errors**:
- `ContractPaused`: Contract is currently paused
- (Quest module specific errors)

---

#### get_quest
```rust
pub fn get_quest(env: Env, id: Symbol) -> Result<Quest, Error>
```
**Description**: Get quest details

**Parameters**:
- `env`: Contract environment
- `id`: Quest identifier

**Returns**: `Quest` struct

**Errors**:
- `QuestNotFound`: Quest with given ID not found

---

#### update_quest_status
```rust
pub fn update_quest_status(
    env: Env,
    quest_id: Symbol,
    caller: Address,
    status: QuestStatus,
) -> Result<(), Error>
```
**Description**: Update quest status (creator only)

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `caller`: Caller address (must be quest creator and authenticated)
- `status`: New quest status

**Returns**: `Ok(())` on success

**Errors**:
- (Quest module specific errors)

---

#### is_quest_full
```rust
pub fn is_quest_full(env: Env, quest_id: Symbol) -> Result<bool, Error>
```
**Description**: Check if a quest has reached its participant limit

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier

**Returns**: `true` if quest is full, `false` otherwise

**Errors**:
- `QuestNotFound`: Quest with given ID not found

---

#### check_expired
```rust
pub fn check_expired(env: Env, quest_id: Symbol) -> Result<bool, Error>
```
**Description**: Check if a quest has expired based on its deadline

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier

**Returns**: `true` if quest has expired, `false` otherwise

**Errors**:
- `QuestNotFound`: Quest with given ID not found

---

#### expire_quest
```rust
pub fn expire_quest(env: Env, quest_id: Symbol, caller: Address) -> Result<(), Error>
```
**Description**: Manually expire a quest (creator only)

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `caller`: Caller address (must be quest creator and authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Quest module specific errors)

---

#### cancel_quest
```rust
pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<(), Error>
```
**Description**: Cancel a quest (creator only). Sets status to Cancelled, allowing escrow withdrawal.

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `creator`: Quest creator address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Quest module specific errors)

---

### Submission Management

#### submit_proof
```rust
pub fn submit_proof(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
) -> Result<(), Error>
```
**Description**: Submit proof for a quest

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `submitter`: Submitter address (must be authenticated)
- `proof_hash`: Hash of the proof data

**Returns**: `Ok(())` on success

**Errors**:
- `ContractPaused`: Contract is currently paused
- (Submission module specific errors)

---

#### get_submission
```rust
pub fn get_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
) -> Result<Submission, Error>
```
**Description**: Get submission details

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `submitter`: Submitter address

**Returns**: `Submission` struct

**Errors**:
- `SubmissionNotFound`: Submission not found

---

#### approve_submission
```rust
pub fn approve_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error>
```
**Description**: Approve submission and trigger payout from escrow (verifier only)

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `submitter`: Submitter address
- `verifier`: Verifier address (must be authenticated and authorized)

**Returns**: `Ok(())` on success

**Errors**:
- `ContractPaused`: Contract is currently paused
- (Submission, Escrow, Payout, Reputation module specific errors)

---

#### reject_submission
```rust
pub fn reject_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error>
```
**Description**: Reject submission (verifier only)

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `submitter`: Submitter address
- `verifier`: Verifier address (must be authenticated and authorized)

**Returns**: `Ok(())` on success

**Errors**:
- (Submission module specific errors)

---

### Reputation & Badges

#### get_user_stats
```rust
pub fn get_user_stats(env: Env, address: Address) -> Result<UserStats, Error>
```
**Description**: Get user statistics

**Parameters**:
- `env`: Contract environment
- `address`: User address

**Returns**: `UserStats` struct

**Errors**:
- `UserStatsNotFound`: User stats not found

---

#### grant_badge
```rust
pub fn grant_badge(
    env: Env,
    address: Address,
    badge: Symbol,
    admin: Address,
) -> Result<(), Error>
```
**Description**: Grant badge to user (admin only)

**Parameters**:
- `env`: Contract environment
- `address`: User address to grant badge to
- `badge`: Badge identifier
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Reputation module specific errors)

---

### Escrow Management

#### deposit_escrow
```rust
pub fn deposit_escrow(
    env: Env,
    quest_id: Symbol,
    creator: Address,
    amount: i128,
) -> Result<(), Error>
```
**Description**: Deposit funds into escrow for a quest (creator only). Tokens are transferred from the creator to the contract and held until payout or withdrawal.

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `creator`: Quest creator address (must be authenticated)
- `amount`: Amount to deposit

**Returns**: `Ok(())` on success

**Errors**:
- (Escrow module specific errors)

---

#### get_escrow_balance
```rust
pub fn get_escrow_balance(env: Env, quest_id: Symbol) -> i128
```
**Description**: Get the current escrow balance for a quest

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier

**Returns**: Escrow balance as `i128`

---

#### withdraw_unclaimed
```rust
pub fn withdraw_unclaimed(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error>
```
**Description**: Withdraw unclaimed escrow funds back to the quest creator. Only available after the quest is Completed, Expired, or Cancelled.

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `creator`: Quest creator address (must be authenticated)

**Returns**: Withdrawn amount as `i128`

**Errors**:
- (Escrow module specific errors)

---

### Contract Initialization & Configuration

#### initialize
```rust
pub fn initialize(env: Env, admin: Address) -> Result<(), Error>
```
**Description**: Initialize the contract with admin setup. This function must be called before any other contract functions. It can only be called once. Subsequent calls will fail.

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- `AlreadyInitialized`: Contract is already initialized
- (Init module specific errors)

---

#### get_config
```rust
pub fn get_config(env: Env) -> Result<ContractConfig, Error>
```
**Description**: Get current contract configuration

**Parameters**:
- `env`: Contract environment

**Returns**: `ContractConfig` struct

**Errors**:
- `NotInitialized`: Contract is not initialized

---

#### update_config
```rust
pub fn update_config(
    env: Env,
    admin: Address,
    new_admin: Option<Address>,
) -> Result<(), Error>
```
**Description**: Update contract configuration (admin only)

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)
- `new_admin`: New admin address (optional)

**Returns**: `Ok(())` on success

**Errors**:
- `NotInitialized`: Contract is not initialized
- `Unauthorized`: Caller is not admin

---

#### authorize_upgrade
```rust
pub fn authorize_upgrade(env: Env, admin: Address) -> Result<(), Error>
```
**Description**: Authorize contract upgrade (admin only). This function verifies that only the admin can authorize upgrades. It does not perform the upgrade itself but validates the authorization.

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- `NotInitialized`: Contract is not initialized
- `UnauthorizedUpgrade`: Caller is not admin

---

#### is_initialized
```rust
pub fn is_initialized(env: Env) -> bool
```
**Description**: Check if contract is initialized

**Parameters**:
- `env`: Contract environment

**Returns**: `true` if initialized, `false` otherwise

---

#### get_version
```rust
pub fn get_version(env: Env) -> Result<u32, Error>
```
**Description**: Get current contract version

**Parameters**:
- `env`: Contract environment

**Returns**: Contract version as `u32`

**Errors**:
- `NotInitialized`: Contract is not initialized

---

#### get_admin
```rust
pub fn get_admin(env: Env) -> Result<Address, Error>
```
**Description**: Get the current admin address

**Parameters**:
- `env`: Contract environment

**Returns**: Admin address

**Errors**:
- `NotInitialized`: Contract is not initialized

---

### Upgrade & Migration

#### upgrade_contract
```rust
pub fn upgrade_contract(
    env: Env,
    admin: Address,
    new_wasm_hash: BytesN<32>,
) -> Result<(), Error>
```
**Description**: Upgrade the contract's WASM code and run any outstanding migrations (Admin only).

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)
- `new_wasm_hash`: Hash of new contract WASM code

**Returns**: `Ok(())` on success

**Errors**:
- (Admin module specific errors)

---

#### trigger_migration
```rust
pub fn trigger_migration(env: Env, admin: Address) -> Result<(), Error>
```
**Description**: Manually trigger data migrations to the latest version (Admin only).

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Admin module specific errors)

---

#### trigger_rollback
```rust
pub fn trigger_rollback(env: Env, admin: Address, target_version: u32) -> Result<(), Error>
```
**Description**: Roll back data to a specific version (Admin only).

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)
- `target_version`: Target version to roll back to

**Returns**: `Ok(())` on success

**Errors**:
- (Admin module specific errors)

---

### Emergency Pause Mechanism

#### initialize_pause
```rust
pub fn initialize_pause(
    env: Env,
    admin: Address,
    timelock_delay: u64,
    required_signatures: u32,
    grace_period: u64,
) -> Result<(), Error>
```
**Description**: Initialize pause configuration (admin only). Sets up timelock delay, required signatures, and grace period.

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)
- `timelock_delay`: Timelock delay in seconds
- `required_signatures`: Number of signatures required to pause
- `grace_period`: Grace period in seconds for emergency withdrawals

**Returns**: `Ok(())` on success

**Errors**:
- `Unauthorized`: Caller is not admin
- (Pausable module specific errors)

---

#### request_pause
```rust
pub fn request_pause(
    env: Env,
    requester: Address,
    reason: Option<Symbol>,
) -> Result<(), Error>
```
**Description**: Request pause with multi-sig (any authorized signer can request). Pause activates once required signatures reached and timelock expires.

**Parameters**:
- `env`: Contract environment
- `requester`: Requester address (must be authenticated)
- `reason`: Optional pause reason

**Returns**: `Ok(())` on success

**Errors**:
- (Pausable module specific errors)

---

#### cancel_pause_request
```rust
pub fn cancel_pause_request(env: Env, admin: Address) -> Result<(), Error>
```
**Description**: Cancel a pending pause request (admin only). Only works if pause hasn't been activated yet.

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Pausable module specific errors)

---

#### unpause_contract
```rust
pub fn unpause_contract(env: Env, admin: Address) -> Result<(), Error>
```
**Description**: Unpause the contract (admin only). Immediately resumes normal operations.

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)

**Returns**: `Ok(())` on success

**Errors**:
- (Pausable module specific errors)

---

#### is_paused
```rust
pub fn is_paused(env: Env) -> Result<bool, Error>
```
**Description**: Check if contract is currently paused

**Parameters**:
- `env`: Contract environment

**Returns**: `true` if paused, `false` otherwise

**Errors**:
- (Pausable module specific errors)

---

#### get_pause_state
```rust
pub fn get_pause_state(env: Env) -> Result<PauseState, Error>
```
**Description**: Get current pause state information

**Parameters**:
- `env`: Contract environment

**Returns**: `PauseState` struct

**Errors**:
- (Pausable module specific errors)

---

#### get_remaining_pause_signatures
```rust
pub fn get_remaining_pause_signatures(env: Env) -> Result<u32, Error>
```
**Description**: Get remaining signatures needed for pause activation

**Parameters**:
- `env`: Contract environment

**Returns**: Number of remaining signatures as `u32`

**Errors**:
- (Pausable module specific errors)

---

#### get_pause_signers
```rust
pub fn get_pause_signers(env: Env) -> Result<Vec<Address>, Error>
```
**Description**: Get addresses that have signed for pause

**Parameters**:
- `env`: Contract environment

**Returns**: Vector of signer addresses

**Errors**:
- (Pausable module specific errors)

---

#### get_pause_timelock_remaining
```rust
pub fn get_pause_timelock_remaining(env: Env) -> Result<u64, Error>
```
**Description**: Get timelock remaining time in seconds

**Parameters**:
- `env`: Contract environment

**Returns**: Remaining timelock in seconds as `u64`

**Errors**:
- (Pausable module specific errors)

---

#### get_grace_period_remaining
```rust
pub fn get_grace_period_remaining(env: Env) -> Result<u64, Error>
```
**Description**: Get grace period remaining for emergency withdrawals

**Parameters**:
- `env`: Contract environment

**Returns**: Remaining grace period in seconds as `u64`

**Errors**:
- (Pausable module specific errors)

---

#### update_pause_config
```rust
pub fn update_pause_config(
    env: Env,
    admin: Address,
    timelock_delay: Option<u64>,
    required_signatures: Option<u32>,
    grace_period: Option<u64>,
) -> Result<(), Error>
```
**Description**: Update pause configuration (admin only)

**Parameters**:
- `env`: Contract environment
- `admin`: Admin address (must be authenticated)
- `timelock_delay`: New timelock delay (optional)
- `required_signatures`: New required signatures (optional)
- `grace_period`: New grace period (optional)

**Returns**: `Ok(())` on success

**Errors**:
- (Pausable module specific errors)

---

#### emergency_withdraw
```rust
pub fn emergency_withdraw(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error>
```
**Description**: Emergency withdrawal from paused contract (during grace period). Allows users to withdraw their escrowed funds during emergency pause.

**Parameters**:
- `env`: Contract environment
- `quest_id`: Quest identifier
- `creator`: Quest creator address (must be authenticated)

**Returns**: Withdrawn amount as `i128`

**Errors**:
- `EmergencyWindowClosed`: Emergency grace period has closed
- (Escrow module specific errors)

---
