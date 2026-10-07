import requests
import json
import sys
import time
import base64
import hmac
import hashlib
import struct

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:18080/api/v1"

def generate_totp(secret_base32):
    key = base64.b32decode(secret_base32, casefold=True)
    counter = int(time.time() // 30)
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[19] & 0x0F
    code = (struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000
    return f"{code:06d}"

def login():
    totp = generate_totp("STOCKAIADMINMFA2")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "usernameOrEmail": "admin",
        "password": "admin123",
        "totpCode": totp
    })
    print(f"Login status: {res.status_code}")
    data = res.json()
    token = data.get("token") or data.get("accessToken")
    return token

def run_tests():
    token = login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print("\n--- 1. Testing Storage Tree initial state & Over-Capacity Discovery ---")
    res = requests.get(f"{BASE_URL}/warehouses/1/storage-tree", headers=headers)
    print("Storage tree status:", res.status_code)
    tree = res.json()
    bin1 = tree["racks"][0]["shelves"][0]["bins"][0] # BIN-U1-01
    bin2 = tree["racks"][0]["shelves"][0]["bins"][1] # BIN-U1-02
    
    print(f"Discovered Bin 1: {bin1['binCode']} (ID: {bin1['binId']}), Capacity: {bin1['capacityKg']} KG, Stock: {bin1['currentStockKg']} KG, Status: {bin1['status']}")
    if bin1["status"] == "OVER CAPACITY":
        print(f"--> Confirmed existing over-capacity data correctly identified: {bin1['currentStockKg']} KG in {bin1['capacityKg']} KG bin.")
        # Verify that new intake into over-capacity bin is strictly REJECTED
        over_res = requests.post(f"{BASE_URL}/inventory/raw-materials", headers=headers, json={
            "materialId": 1,
            "binId": bin1["binId"],
            "batchNo": "RM-2026-OVER-REJECT",
            "quantityKg": 500.0,
            "unitCost": 108.50,
            "qualityStatus": "Available"
        })
        print(f"--> Rejection on over-capacity bin status: {over_res.status_code}")
        assert over_res.status_code == 400, "Intake into over-capacity bin MUST be rejected"

    # Reset/clear stock on BIN-U1-02 to have a clean benchmark bin
    print(f"\nTarget Clean Test Bin: {bin2['binCode']} (ID: {bin2['binId']})")
    requests.post(f"{BASE_URL}/warehouses/bins/{bin2['binId']}/clear-stock", headers=headers)
    
    bin_id = bin2["binId"]
    bin_code = bin2["binCode"]
    
    ts = int(time.time())
    batch1 = f"RM-2026-T1-{ts}"
    batch2 = f"RM-2026-T2-{ts}"
    batch_rej = f"RM-2026-TR-{ts}"
    
    print(f"\n--- 2. Performing Raw Material Intake into Empty Bin (1500 KG) ---")
    intake_res = requests.post(f"{BASE_URL}/inventory/raw-materials", headers=headers, json={
        "materialId": 1,
        "binId": bin_id,
        "batchNo": batch1,
        "lotNumber": f"LOT-{ts}-01",
        "quantityKg": 1500.0,
        "unitCost": 108.50,
        "qualityStatus": "Available"
    })
    print("Intake 1 status:", intake_res.status_code, intake_res.json())
    assert intake_res.status_code == 201, f"Expected 201, got {intake_res.status_code}"
    
    print("\n--- 3. Verifying Material is in Assigned Bin ---")
    occ_res = requests.get(f"{BASE_URL}/warehouses/bins/{bin_id}/occupancy", headers=headers)
    print("Bin occupancy status:", occ_res.status_code)
    occ = occ_res.json()
    print(f"Bin: {occ['binCode']}, Capacity: {occ['capacityKg']} KG, Stored: {occ['currentStockKg']} KG, Avail: {occ['availableCapacityKg']} KG, Status: {occ['status']}")
    print(f"Batches inside bin: {json.dumps(occ['batches'], indent=2)}")
    assert occ["currentStockKg"] == 1500.0, f"Expected 1500.0 KG, got {occ['currentStockKg']}"
    assert occ["status"] == "PARTIALLY OCCUPIED"
    
    print("\n--- 4. Performing Second Intake to Same Bin (2000 KG) ---")
    intake_res2 = requests.post(f"{BASE_URL}/inventory/raw-materials", headers=headers, json={
        "materialId": 1,
        "binId": bin_id,
        "batchNo": batch2,
        "lotNumber": f"LOT-{ts}-02",
        "quantityKg": 2000.0,
        "unitCost": 108.50,
        "qualityStatus": "Available"
    })
    print("Intake 2 status:", intake_res2.status_code, intake_res2.json())
    assert intake_res2.status_code == 201
    
    occ_res2 = requests.get(f"{BASE_URL}/warehouses/bins/{bin_id}/occupancy", headers=headers)
    occ2 = occ_res2.json()
    print(f"Bin occupancy after 2nd intake: Stored = {occ2['currentStockKg']} KG, Remaining = {occ2['availableCapacityKg']} KG")
    assert occ2["currentStockKg"] == 3500.0
    
    print("\n--- 5. Testing Bin Capacity Rejection (Incoming 2000 KG > Remaining 1500 KG) ---")
    reject_res = requests.post(f"{BASE_URL}/inventory/raw-materials", headers=headers, json={
        "materialId": 1,
        "binId": bin_id,
        "batchNo": batch_rej,
        "lotNumber": f"LOT-{ts}-REJ",
        "quantityKg": 2000.0,
        "unitCost": 108.50,
        "qualityStatus": "Available"
    })
    print("Reject status:", reject_res.status_code, reject_res.text)
    assert reject_res.status_code == 400, f"Expected 400 Bad Request, got {reject_res.status_code}"
    
    print("\n--- 6. Testing Batch Location Search Endpoint ---")
    batch_res = requests.get(f"{BASE_URL}/warehouses/batch-location", headers=headers, params={"batchNo": batch1})
    print("Batch search status:", batch_res.status_code)
    b_data = batch_res.json()
    print(f"Search Result:\nBatch: {b_data['batchNo']}\nMaterial: {b_data['materialName']}\nQuantity: {b_data['quantityKg']} KG\nExact Location: {b_data['exactLocation']}\nBin Capacity: {b_data['binCapacityKg']} KG, Occupied: {b_data['binOccupiedKg']} KG, Status: {b_data['binStatus']}")
    assert b_data["batchNo"] == batch1
    assert b_data["binCode"] == bin_code
    assert "Warehouse" in b_data["exactLocation"] and "Rack" in b_data["exactLocation"] and "Shelf" in b_data["exactLocation"] and "Bin" in b_data["exactLocation"]
    
    print("\n--- 7. Testing Batch Location Search for Non-Existent Batch ---")
    nf_res = requests.get(f"{BASE_URL}/warehouses/batch-location", headers=headers, params={"batchNo": "NON-EXISTENT-999"})
    print("Non-existent batch search status:", nf_res.status_code)
    assert nf_res.status_code == 404
    
    print("\n--- 8. Testing Edit Bin Capacity (5000 -> 8000 KG) ---")
    edit_res = requests.put(f"{BASE_URL}/warehouses/bins/{bin_id}", headers=headers, json={
        "binCode": bin_code,
        "capacityKg": 8000.0
    })
    print("Edit capacity status:", edit_res.status_code, edit_res.json())
    assert edit_res.status_code == 200
    assert edit_res.json()["capacityKg"] == 8000.0
    
    # Verify persistence via get occupancy
    occ_res3 = requests.get(f"{BASE_URL}/warehouses/bins/{bin_id}/occupancy", headers=headers)
    print(f"Persisted capacity: {occ_res3.json()['capacityKg']} KG")
    assert occ_res3.json()["capacityKg"] == 8000.0
    
    print("\n--- 9. Testing Rejection when Reducing Capacity Below Occupancy (Occupied: 3500 KG, Requested: 3000 KG) ---")
    red_res = requests.put(f"{BASE_URL}/warehouses/bins/{bin_id}", headers=headers, json={
        "binCode": bin_code,
        "capacityKg": 3000.0
    })
    print("Reduce capacity status:", red_res.status_code, red_res.text)
    assert red_res.status_code == 400
    
    print("\n==============================================")
    print(" ALL 9 WAREHOUSE FLOW VALIDATION TESTS PASSED! ")
    print("==============================================")

if __name__ == "__main__":
    run_tests()
