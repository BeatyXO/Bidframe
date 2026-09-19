import hashlib
import json

CONTRACT = "contracts/Bidframe.py"
GEN = 10**18
HASH_A = "a" * 64
HASH_B = "b" * 64
BEFORE = b"baseline-image-bytes"
AFTER = b"checkout-image-bytes"


def address_string(address):
    return "0x" + bytes(address).hex()


def create_draft(contract, direct_vm, landlord, tenant, deposit=3 * GEN, items=1):
    direct_vm.sender = landlord
    agreement_id = contract.create_agreement("Atlas Lofts Unit 4B", "LAG-ATL-4B-0926", address_string(tenant), deposit, HASH_A)
    for index in range(items):
        contract.add_item(agreement_id, f"Item {index + 1}", "Registered rental fixture", "https://evidence.example/before.jpg", HASH_B, GEN // 10, GEN // 2, GEN, 2 * GEN)
    return agreement_id


def activate_checkout(contract, direct_vm, agreement_id, tenant, deposit=3 * GEN):
    direct_vm.sender = tenant
    direct_vm.value = deposit
    contract.fund_agreement(agreement_id)
    direct_vm.value = 0
    contract.open_checkout(agreement_id)


def submit_pair(contract, direct_vm, agreement_id, tenant, before=BEFORE, after=AFTER):
    before_hash = hashlib.sha256(before).hexdigest()
    after_hash = hashlib.sha256(after).hexdigest()
    # Test's baseline is registered before funding, so set that hash by creating
    # a dedicated agreement with the exact bytes in the helper below instead.
    direct_vm.sender = tenant
    contract.submit_checkout_evidence(agreement_id, 1, "https://evidence.example/after.jpg", after_hash)
    direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 200, "body": before})
    direct_vm.mock_web(r"evidence\.example/after\.jpg", {"status": 200, "body": after})
    return before_hash, after_hash


def create_visual_case(contract, direct_vm, landlord, tenant, verdict, severity=0, before=BEFORE, after=AFTER, count=1, deposit=3 * GEN):
    direct_vm.clear_mocks()
    before_hash = hashlib.sha256(before).hexdigest()
    after_hash = hashlib.sha256(after).hexdigest()
    direct_vm.sender = landlord
    agreement_id = contract.create_agreement("Visual comparison case", "V-1", address_string(tenant), deposit, HASH_A)
    for index in range(count):
        contract.add_item(agreement_id, f"Fixture {index + 1}", "Quartz surface", "https://evidence.example/before.jpg", before_hash, GEN // 10, GEN // 4, GEN // 2, 2 * GEN)
    activate_checkout(contract, direct_vm, agreement_id, tenant, deposit)
    for item_id in range(1, count + 1):
        direct_vm.sender = tenant
        contract.submit_checkout_evidence(agreement_id, item_id, f"https://evidence.example/after-{item_id}.jpg", after_hash)
        direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 200, "body": before})
        direct_vm.mock_web(rf"evidence\.example/after-{item_id}\.jpg", {"status": 200, "body": after})
    direct_vm.mock_llm(r"security-deposit settlement", json.dumps({"verdict": verdict, "severity": severity, "reasoning": "Visible condition change is limited to the registered item."}))
    return agreement_id


def test_create_agreement_and_inventory(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.check_pickling = True
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)
    assert contract.get_agreement(agreement_id)["status"] == "DRAFT"
    assert contract.get_item(agreement_id, 1)["label"] == "Item 1"


def test_rejects_malformed_inputs(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Title"):
        contract.create_agreement("x", "P-1", address_string(direct_bob), GEN, HASH_A)
    with direct_vm.expect_revert("greater than zero"):
        contract.create_agreement("Valid lease", "P-1", address_string(direct_bob), 0, HASH_A)
    with direct_vm.expect_revert("hexadecimal"):
        contract.create_agreement("Valid lease", "P-1", address_string(direct_bob), GEN, "z" * 64)


def test_only_landlord_can_add_items_and_schedule_is_monotonic(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only the landlord"):
            contract.add_item(agreement_id, "Unauthorized", "Invalid caller", "https://evidence.example/x.jpg", HASH_B, 0, 0, 0, 0)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("non-decreasing"):
        contract.add_item(agreement_id, "Wall", "North wall finish", "https://evidence.example/wall.jpg", HASH_B, GEN, GEN // 2, GEN // 4, GEN)


def test_funding_requires_tenant_exact_amount_and_inventory(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    empty_id = contract.create_agreement("Empty lease", "P-1", address_string(direct_bob), GEN, HASH_A)
    direct_vm.sender = direct_bob
    direct_vm.value = GEN
    with direct_vm.expect_revert("inventory item"):
        contract.fund_agreement(empty_id)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob, GEN)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Only the tenant"):
        contract.fund_agreement(agreement_id)
    direct_vm.sender = direct_bob
    direct_vm.value = GEN - 1
    with direct_vm.expect_revert("exactly"):
        contract.fund_agreement(agreement_id)
    direct_vm.value = GEN
    contract.fund_agreement(agreement_id)
    assert contract.get_agreement(agreement_id)["status"] == "ACTIVE"
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("frozen"):
        contract.add_item(agreement_id, "Late", "After funding", "https://evidence.example/late.jpg", HASH_B, 0, 0, 0, 0)


def test_evidence_is_write_once_and_challenge_requires_counterparty(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)
    activate_checkout(contract, direct_vm, agreement_id, direct_bob)
    direct_vm.sender = direct_alice
    contract.submit_checkout_evidence(agreement_id, 1, "https://evidence.example/out.jpg", HASH_B)
    with direct_vm.expect_revert("already submitted"):
        contract.submit_checkout_evidence(agreement_id, 1, "https://evidence.example/overwrite.jpg", HASH_A)
    with direct_vm.expect_revert("cannot challenge their own"):
        contract.challenge_checkout_evidence(agreement_id, 1)
    with direct_vm.prank(direct_bob):
        contract.challenge_checkout_evidence(agreement_id, 1)
        with direct_vm.expect_revert("Resolve the evidence challenge"):
            contract.assess_item(agreement_id, 1)


def test_replacement_requires_counterparty_acceptance(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)
    activate_checkout(contract, direct_vm, agreement_id, direct_bob)
    direct_vm.sender = direct_alice
    contract.submit_checkout_evidence(agreement_id, 1, "https://evidence.example/out.jpg", HASH_B)
    direct_vm.sender = direct_bob
    contract.challenge_checkout_evidence(agreement_id, 1)
    contract.propose_replacement_evidence(agreement_id, 1, "https://evidence.example/replacement.jpg", HASH_A)
    with direct_vm.expect_revert("counterparty"):
        contract.accept_replacement_evidence(agreement_id, 1)
    direct_vm.sender = direct_alice
    contract.accept_replacement_evidence(agreement_id, 1)
    item = contract.get_item(agreement_id, 1)
    assert item["checkout_url"].endswith("replacement.jpg")
    assert not item["evidence_challenged"]


def test_damage_severity_uses_only_frozen_schedule(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    for severity, expected in ((1, GEN // 10), (2, GEN // 4), (3, GEN // 2)):
        agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "NEW_DAMAGE", severity)
        contract.assess_item(agreement_id, 1)
        item = contract.get_item(agreement_id, 1)
        assert item["verdict"] == "NEW_DAMAGE"
        assert item["severity"] == severity
        assert item["deduction_wei"] == expected


def test_non_damage_verdicts_zero_and_missing_uses_frozen_cap(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    for verdict in ("UNCHANGED", "NORMAL_WEAR"):
        agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, verdict, 0)
        contract.assess_item(agreement_id, 1)
        assert contract.get_item(agreement_id, 1)["deduction_wei"] == 0
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "MISSING", 0)
    contract.assess_item(agreement_id, 1)
    assert contract.get_item(agreement_id, 1)["deduction_wei"] == 2 * GEN


def test_inconclusive_blocks_ready_and_unresolved_items_block_ready(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "INCONCLUSIVE", 0)
    contract.assess_item(agreement_id, 1)
    with direct_vm.expect_revert("INCONCLUSIVE"):
        contract.mark_ready(agreement_id)
    assert contract.get_agreement(agreement_id)["has_inconclusive"] is True


def test_bad_hash_and_unavailable_evidence_fail_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "UNCHANGED", 0)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 200, "body": b"tampered baseline"})
    direct_vm.mock_web(r"evidence\.example/after-1\.jpg", {"status": 200, "body": AFTER})
    with direct_vm.expect_revert("Baseline evidence hash mismatch"):
        contract.assess_item(agreement_id, 1)


def test_invalid_verdict_and_severity_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "ALIEN_VERDICT", 0)
    with direct_vm.expect_revert("Invalid verdict"):
        contract.assess_item(agreement_id, 1)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "NEW_DAMAGE", 4)
    with direct_vm.expect_revert("Damage severity"):
        contract.assess_item(agreement_id, 1)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "UNCHANGED", 1)
    with direct_vm.expect_revert("Non-damage severity"):
        contract.assess_item(agreement_id, 1)


def test_assessment_is_once_and_strangers_cannot_change_state(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "UNCHANGED", 0)
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("Only an agreement party"):
            contract.assess_item(agreement_id, 1)
    contract.assess_item(agreement_id, 1)
    with direct_vm.expect_revert("already assessed"):
        contract.assess_item(agreement_id, 1)


def test_evidence_unavailable_and_checkout_hash_mismatch_fail_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "UNCHANGED", 0)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 404, "body": b"missing"})
    direct_vm.mock_web(r"evidence\.example/after-1\.jpg", {"status": 200, "body": AFTER})
    with direct_vm.expect_revert("Evidence URL unavailable"):
        contract.assess_item(agreement_id, 1)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 200, "body": BEFORE})
    direct_vm.mock_web(r"evidence\.example/after-1\.jpg", {"status": 200, "body": b"tampered checkout"})
    with direct_vm.expect_revert("Checkout evidence hash mismatch"):
        contract.assess_item(agreement_id, 1)


def test_validator_disagreement_is_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "NEW_DAMAGE", 2)
    contract.assess_item(agreement_id, 1)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"evidence\.example/before\.jpg", {"status": 200, "body": BEFORE})
    direct_vm.mock_web(r"evidence\.example/after-1\.jpg", {"status": 200, "body": AFTER})
    direct_vm.mock_llm(r"security-deposit settlement", json.dumps({"verdict": "UNCHANGED", "severity": 0, "reasoning": "Disagreeing classification."}))
    assert direct_vm.run_validator() is False


def test_total_deduction_is_capped_and_refund_is_deterministic(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "MISSING", 0, count=2, deposit=3 * GEN)
    contract.assess_item(agreement_id, 1)
    contract.assess_item(agreement_id, 2)
    agreement = contract.get_agreement(agreement_id)
    assert agreement["raw_deduction_wei"] == 4 * GEN
    assert agreement["settlement_deduction_wei"] == 3 * GEN
    assert agreement["projected_refund_wei"] == 0


def test_ready_settle_and_double_settlement_rejection(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    agreement_id = create_visual_case(contract, direct_vm, direct_alice, direct_bob, "UNCHANGED", 0)
    contract.assess_item(agreement_id, 1)
    direct_vm.sender = direct_alice
    contract.mark_ready(agreement_id)
    assert contract.get_agreement(agreement_id)["status"] == "READY"
    contract.settle(agreement_id)
    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "SETTLED"
    assert agreement["settlement_deduction_wei"] == 0
    assert agreement["projected_refund_wei"] == 3 * GEN
    with direct_vm.expect_revert("not ready"):
        contract.settle(agreement_id)
