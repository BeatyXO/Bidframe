import hashlib
import json

CONTRACT = "contracts/Bidframe.py"
GEN = 10**18
HASH_A = "a" * 64
HASH_B = "b" * 64


def create_draft(contract, direct_vm, landlord, tenant):
    direct_vm.sender = landlord
    agreement_id = contract.create_agreement(
        "Atlas Lofts · Unit 4B",
        "LAG-ATL-4B-0926",
        str(tenant),
        3 * GEN,
        HASH_A,
    )
    contract.add_item(
        agreement_id,
        "Kitchen worktop",
        "Quartz surface beside sink",
        "https://evidence.example/before.jpg",
        HASH_B,
        GEN // 10,
        GEN // 2,
        GEN,
        2 * GEN,
    )
    return agreement_id


def test_create_agreement_and_inventory(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.check_pickling = True
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)

    agreement = contract.get_agreement(agreement_id)
    item = contract.get_item(agreement_id, 1)
    assert agreement["status"] == "DRAFT"
    assert agreement["item_count"] == 1
    assert item["label"] == "Kitchen worktop"
    assert item["moderate_wei"] == GEN // 2


def test_only_landlord_can_add_items(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only the landlord"):
            contract.add_item(
                agreement_id,
                "Unauthorized",
                "Should never be stored",
                "https://evidence.example/x.jpg",
                "c" * 64,
                0,
                0,
                0,
                0,
            )


def test_damage_schedule_must_be_monotonic(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    agreement_id = contract.create_agreement(
        "Test lease", "P-1", str(direct_bob), GEN, HASH_A
    )
    with direct_vm.expect_revert("non-decreasing"):
        contract.add_item(
            agreement_id,
            "Wall",
            "North wall finish",
            "https://evidence.example/wall.jpg",
            HASH_B,
            GEN,
            GEN // 2,
            GEN // 4,
            GEN,
        )


def test_visual_assessment_uses_exact_hashed_bytes(direct_vm, direct_deploy, direct_alice, direct_bob):
    # This exercises the nondeterministic path without pretending that a real
    # StudioNet validator set has been tested. Direct mode mocks web + LLM.
    before = b"baseline-image-bytes"
    after = b"checkout-image-bytes"
    before_hash = hashlib.sha256(before).hexdigest()
    after_hash = hashlib.sha256(after).hexdigest()

    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    agreement_id = contract.create_agreement(
        "Visual test", "V-1", str(direct_bob), GEN, HASH_A
    )
    contract.add_item(
        agreement_id,
        "Worktop",
        "Quartz surface",
        "https://evidence.example/before.jpg",
        before_hash,
        GEN // 10,
        GEN // 4,
        GEN // 2,
        GEN,
    )

    # Funding/value transfer semantics should be covered on Studio/localnet;
    # force the state here so this direct test stays focused on consensus.
    contract.agreement_status[agreement_id] = "CHECKOUT"
    direct_vm.sender = direct_bob
    contract.submit_checkout_evidence(
        agreement_id,
        1,
        "https://evidence.example/after.jpg",
        after_hash,
    )

    direct_vm.mock_web(
        r"evidence\.example/before\.jpg",
        {"status": 200, "body": before},
    )
    direct_vm.mock_web(
        r"evidence\.example/after\.jpg",
        {"status": 200, "body": after},
    )
    direct_vm.mock_llm(
        r"security-deposit settlement",
        json.dumps({
            "verdict": "NEW_DAMAGE",
            "severity": 2,
            "reasoning": "New moderate chip visible on the move-out surface.",
        }),
    )

    contract.assess_item(agreement_id, 1)
    item = contract.get_item(agreement_id, 1)
    assert item["verdict"] == "NEW_DAMAGE"
    assert item["severity"] == 2
    assert item["deduction_wei"] == GEN // 4


def test_challenged_evidence_fails_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    agreement_id = create_draft(contract, direct_vm, direct_alice, direct_bob)
    contract.agreement_status[agreement_id] = "CHECKOUT"

    direct_vm.sender = direct_alice
    contract.submit_checkout_evidence(
        agreement_id, 1, "https://evidence.example/checkout.jpg", "c" * 64
    )
    with direct_vm.prank(direct_bob):
        contract.challenge_checkout_evidence(agreement_id, 1)
        with direct_vm.expect_revert("Resolve the evidence challenge"):
            contract.assess_item(agreement_id, 1)
