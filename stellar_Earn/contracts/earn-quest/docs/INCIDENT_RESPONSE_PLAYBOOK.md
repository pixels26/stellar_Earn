# Incident Response Playbook — EarnQuest Contract

This playbook covers how to respond to emergency states in the EarnQuest contract. It assumes you have access to an authorized admin wallet and the Stellar CLI or equivalent tooling.

---

## Severity Levels

| Severity | Condition | Example |
|---|---|---|
| SEV-1 | Reward claims or payout flows broadly failing | Exploit draining escrow, `TransferFailed` spike |
| SEV-2 | Quest creation, submissions, or escrow funding degraded | Validation errors blocking new quests |
| SEV-3 | Read queries degraded, writes healthy | RPC node issues, indexer lag |

Response targets are defined in `SLA_SLO.md`.

---

## Contract Emergency States

The contract has two pause scopes:

- **Global pause** — blocks all write operations platform-wide. Triggered via `emergency_pause`.
- **Quest-level pause** — blocks operations on a single quest. Triggered via `pause_quest`.

Emergency withdrawal is only available while the contract is globally paused and requires SuperAdmin.

---

## Playbook 1: Global Emergency Pause

Use when you need to halt all contract activity immediately (exploit, critical bug, token vulnerability).

**Who can act:** Pauser, Admin, or SuperAdmin

**Step 1 — Pause the contract**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <PAUSER_SECRET_KEY> \
  --network mainnet \
  -- emergency_pause \
  --caller <PAUSER_ADDRESS>
```

Confirm the `epause` event is emitted on-chain before proceeding.

**Step 2 — Communicate**

Post a status update to the team channel. Include:
- Time of pause
- Reason / what was observed
- Who paused it

**Step 3 — Investigate**

While paused, no user funds can move and no new state changes occur. Use this window to:
- Review recent transactions on the explorer
- Check for unexpected `ewdraw`, `esc_pay`, or `claimed` events
- Identify the affected quest IDs or addresses

---

## Playbook 2: Unpause After Incident Resolution

Unpausing requires multiple admin approvals plus a timelock. This is intentional — it prevents a single compromised key from unpausing.

**Who can act:** Pauser, Admin, or SuperAdmin (each must approve separately)

**Step 1 — Each admin approves unpause**

Each authorized admin runs this independently:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network mainnet \
  -- emergency_approve_unpause \
  --caller <ADMIN_ADDRESS>
```

Each approval emits a `uappr` event. Once the approval count reaches the configured threshold, a `tl_sched` event is emitted with the scheduled unpause timestamp.

**Step 2 — Wait for timelock**

Check the `tl_sched` event data for the scheduled timestamp. Do not attempt to unpause before it.

**Step 3 — Execute unpause**

After the timelock expires:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network mainnet \
  -- emergency_unpause \
  --caller <ADMIN_ADDRESS>
```

Confirm the `eunpause` event is emitted.

**Step 4 — Verify**

Run a read query to confirm the contract is accepting operations:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_ADDRESS> \
  --network mainnet \
  -- is_paused
```

Should return `false`.

---

## Playbook 3: Emergency Withdrawal

Use only when funds need to be moved out of the contract during an active pause (e.g., token contract being deprecated, critical escrow recovery).

**Who can act:** SuperAdmin only  
**Requirement:** Contract must be paused first (see Playbook 1)

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <SUPER_ADMIN_SECRET_KEY> \
  --network mainnet \
  -- emergency_withdraw \
  --caller <SUPER_ADMIN_ADDRESS> \
  --asset <TOKEN_CONTRACT_ADDRESS> \
  --to <RECIPIENT_ADDRESS> \
  --amount <AMOUNT_IN_STROOPS>
```

Confirm the `ewdraw` event is emitted with the correct asset, recipient, and amount.

Document every withdrawal with:
- Timestamp
- Asset and amount
- Recipient address
- Reason

---

## Playbook 4: Isolate a Single Quest

Use when a specific quest is behaving unexpectedly but the rest of the platform is healthy.

**Who can act:** Admin or SuperAdmin

**Pause the quest:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network mainnet \
  -- pause_quest \
  --caller <ADMIN_ADDRESS> \
  --quest_id <QUEST_ID>
```

Emits `q_pause`. The quest status moves to `Paused`. No new submissions or claims are accepted for that quest.

**Resume when resolved:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network mainnet \
  -- resume_quest \
  --caller <ADMIN_ADDRESS> \
  --quest_id <QUEST_ID>
```

Emits `q_resume`.

---

## Playbook 5: Reentrancy Alert

If you see `ReentrantCall` errors (error code 80) in transaction results, treat it as a potential exploit attempt.

1. Immediately trigger a global pause (Playbook 1).
2. Identify the calling address from the failed transaction.
3. Review the call chain — look for a token contract calling back into EarnQuest during a transfer.
4. Do not unpause until the source of the reentrant call is identified and blocked.

---

## Monitoring Checklist

Events to watch in production:

| Event | Topic | Action |
|---|---|---|
| Emergency pause | `epause` | Page on-call immediately |
| Emergency withdrawal | `ewdraw` | Page on-call, log amount and recipient |
| Unpause approved | `uappr` | Notify team, track approval count |
| Timelock scheduled | `tl_sched` | Note scheduled time, prepare for unpause |
| Reentrancy error | error code 80 | Treat as SEV-1, pause immediately |

---

## Admin Role Reference

| Role | Can Pause | Can Approve Unpause | Can Withdraw | Can Manage Roles |
|---|---|---|---|---|
| Pauser | Yes | Yes | No | No |
| Admin | Yes | Yes | No | No |
| SuperAdmin | Yes | Yes | Yes | Yes |

To check current admins and roles:

```bash
stellar contract invoke --id <CONTRACT_ID> --network mainnet -- is_admin --address <ADDRESS>
stellar contract invoke --id <CONTRACT_ID> --network mainnet -- has_role --address <ADDRESS> --role Admin
```

---

## Post-Incident

After every SEV-1 or SEV-2 incident:

1. Write a brief post-mortem: what happened, timeline, root cause, fix applied.
2. Update the unpause threshold or timelock if the incident revealed a gap.
3. Review whether the affected quest IDs need cancellation or escrow refunds.
4. Check SLO error budget consumption against targets in `SLA_SLO.md`.
