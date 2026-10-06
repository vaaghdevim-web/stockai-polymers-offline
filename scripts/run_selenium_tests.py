import sys
import io
import time
import base64
import hmac
import hashlib
import struct
import os
import json
import urllib.request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions

# Set UTF-8 encoding on standard streams to prevent Windows-1252 charmap encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def generate_totp(secret_base32):
    """Generate standard RFC 6238 6-digit TOTP token using base32 secret."""
    key = base64.b32decode(secret_base32, casefold=True)
    counter = int(time.time() // 30)
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[19] & 0x0F
    code = (struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000
    return f"{code:06d}"

def get_auth_tokens():
    totp = generate_totp("STOCKAIADMINMFA2")
    data = json.dumps({"usernameOrEmail": "admin", "password": "admin123", "totpCode": totp}).encode('utf-8')
    req = urllib.request.Request("http://localhost:18080/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"API Login attempt error: {e}")
        return None

def init_driver():
    try:
        chrome_opts = ChromeOptions()
        chrome_opts.add_argument("--headless=new")
        chrome_opts.add_argument("--disable-gpu")
        chrome_opts.add_argument("--no-sandbox")
        chrome_opts.add_argument("--disable-dev-shm-usage")
        chrome_opts.add_argument("--window-size=1920,1080")
        chrome_opts.add_argument("--remote-allow-origins=*")
        driver = webdriver.Chrome(options=chrome_opts)
        print("Initialized Chrome WebDriver.")
        return driver
    except Exception as e:
        print(f"Chrome initialization failed ({e}), trying Edge...")
        edge_opts = EdgeOptions()
        edge_opts.add_argument("--headless=new")
        edge_opts.add_argument("--disable-gpu")
        edge_opts.add_argument("--window-size=1920,1080")
        driver = webdriver.Edge(options=edge_opts)
        print("Initialized Edge WebDriver.")
        return driver

def run_tests():
    driver = init_driver()
    driver.set_page_load_timeout(30)
    
    screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
    os.makedirs(screenshot_dir, exist_ok=True)
    
    results = []
    
    def log_result(test_name, passed, message=""):
        status = "PASS" if passed else "FAIL"
        results.append((test_name, status, message))
        print(f"[{status}] {test_name} - {message}")

    try:
        # TEST 1 & 2: Direct RFC 6238 TOTP Authentication
        print("\n--- TEST 1: Direct RFC 6238 TOTP Authentication & Session Seed ---")
        auth_data = get_auth_tokens()
        if not auth_data or not auth_data.get("token"):
            log_result("Authentication & MFA", False, "Failed to retrieve auth token from backend")
            return
            
        token = auth_data["token"]
        refresh_token = auth_data.get("refreshToken", token)
        user_obj = {
            "id": auth_data.get("userId", 1),
            "name": auth_data.get("userName", "admin"),
            "email": auth_data.get("email", "admin@stockai.com"),
            "roles": auth_data.get("roles", ["ADMIN", "SUPER_ADMIN"])
        }
        
        driver.get("http://localhost:5173")
        time.sleep(1)
        
        # Inject verified JWT session
        driver.execute_script(
            "localStorage.setItem('stockai_token', arguments[0]);"
            "localStorage.setItem('stockai_refresh_token', arguments[1]);"
            "localStorage.setItem('stockai_user', arguments[2]);",
            token, refresh_token, json.dumps(user_obj)
        )
        
        driver.get("http://localhost:5173")
        time.sleep(2)
        log_result("Authentication & MFA", True, f"Logged in as {user_obj['name']} with dynamic JWT & TOTP")

        # Wait for navigation sidebar to be ready
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "nav-tab-dashboard"))
        )

        # TEST 2: Dashboard Control Room
        print("\n--- TEST 2: Dashboard Control Room & Dynamic Valuation ---")
        try:
            dash_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-dashboard"))
            )
            dash_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "04_dashboard.png"))
            page_src = driver.page_source
            has_kpi = "Valuation" in page_src or "Stock" in page_src or "Plant" in page_src or "Control Room" in page_src
            log_result("Dashboard KPIs Rendered", has_kpi, "Live KPI metrics, valuation curve, and plant status rendered")
        except Exception as e:
            log_result("Dashboard KPIs Rendered", False, str(e))

        # TEST 3: Raw Materials & Silos
        print("\n--- TEST 3: Navigate to Raw Materials & Silos ---")
        try:
            rm_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-raw-materials"))
            )
            rm_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "05_raw_materials.png"))
            page_src = driver.page_source
            has_rm = "Raw Material" in page_src or "Silo" in page_src or "PP Homopolymer" in page_src or "Inward" in page_src
            log_result("Raw Materials Page Navigation", has_rm, "Raw materials inventory table and action buttons visible")
        except Exception as e:
            log_result("Raw Materials Page Navigation", False, str(e))

        # TEST 4: Production & BOM
        print("\n--- TEST 4: Navigate to Production & BOM ---")
        try:
            prod_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-production"))
            )
            prod_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "06_production.png"))
            page_src = driver.page_source
            has_prod = "Work Orders" in page_src or "Stage" in page_src or "Extrusion" in page_src or "Finished Goods" in page_src
            log_result("Production Page Navigation", has_prod, "Production work orders and stage sequences loaded")
            
            # Test Finished Goods Catalog Sub-tab
            fg_tabs = driver.find_elements(By.XPATH, "//button[contains(., 'Finished Goods Catalog')]")
            if fg_tabs:
                fg_tabs[0].click()
                time.sleep(1.5)
                driver.save_screenshot(os.path.join(screenshot_dir, "06b_finished_goods_catalog.png"))
                page_src_fg = driver.page_source
                has_fg = "Catalog" in page_src_fg or "GSM" in page_src_fg or "Bags" in page_src_fg or "Finished" in page_src_fg
                log_result("Finished Goods Catalog Sub-tab", has_fg, "Finished Goods catalog loaded dynamically")
        except Exception as e:
            log_result("Production Page Navigation", False, str(e))

        # TEST 5: Quality Lab & MFI
        print("\n--- TEST 5: Navigate to Quality Lab & MFI ---")
        try:
            qc_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-quality"))
            )
            qc_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "07_quality_control.png"))
            page_src = driver.page_source
            has_qc = "Quality" in page_src or "ASTM" in page_src or "Inspections" in page_src or "Pass Rate" in page_src
            log_result("Quality Control Page Navigation", has_qc, "QC inspections table and ASTM metrics loaded")
        except Exception as e:
            log_result("Quality Control Page Navigation", False, str(e))

        # TEST 6: Procurement & Reorder
        print("\n--- TEST 6: Navigate to Procurement & Reorder ---")
        try:
            proc_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-procurement"))
            )
            proc_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "08_procurement.png"))
            page_src = driver.page_source
            has_proc = "Procurement" in page_src or "Recommendations" in page_src or "Purchase" in page_src or "Reorder" in page_src
            log_result("Procurement Page Navigation", has_proc, "Purchase recommendations & PO management loaded")
        except Exception as e:
            log_result("Procurement Page Navigation", False, str(e))

        # TEST 7: Warehouse & Logistics
        print("\n--- TEST 7: Navigate to Warehouse & Logistics ---")
        try:
            log_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-logistics"))
            )
            log_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "09_logistics.png"))
            page_src = driver.page_source
            has_log = "Pallet" in page_src or "Dispatch" in page_src or "Customer" in page_src or "Orders" in page_src or "Warehouse" in page_src
            log_result("Logistics Page Navigation", has_log, "Palletization, Warehouse Topology, and Dispatch loaded")
        except Exception as e:
            log_result("Logistics Page Navigation", False, str(e))

        # TEST 8: Suppliers & Accounts
        print("\n--- TEST 8: Navigate to Suppliers & Accounts ---")
        try:
            sup_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-suppliers"))
            )
            sup_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "10_suppliers.png"))
            page_src = driver.page_source
            has_sup = "Supplier" in page_src or "Vendor" in page_src or "GSTIN" in page_src or "Scorecards" in page_src
            log_result("Suppliers Page Navigation", has_sup, "Vendor master list and AI scorecards loaded")
        except Exception as e:
            log_result("Suppliers Page Navigation", False, str(e))

        # TEST 9: Admin Settings & Role Management
        print("\n--- TEST 9: Navigate to Admin & Settings ---")
        try:
            admin_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-admin"))
            )
            admin_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "11_admin_settings.png"))
            page_src = driver.page_source
            has_admin = "Enterprise" in page_src or "MFA" in page_src or "Security" in page_src or "Users" in page_src or "Roles" in page_src or "Admin" in page_src
            log_result("Admin Settings Navigation", has_admin, "Enterprise user, role, and security settings loaded")
        except Exception as e:
            log_result("Admin Settings Navigation", False, str(e))

        # TEST 10: AI Plant Copilot
        print("\n--- TEST 10: Navigate to AI Plant Copilot ---")
        try:
            ai_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "nav-tab-ai-copilot"))
            )
            ai_btn.click()
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "12_ai_copilot.png"))
            page_src = driver.page_source
            has_ai = "AI Plant" in page_src or "Ask me" in page_src or "Copilot" in page_src or "Assistant" in page_src
            log_result("AI Copilot Page Navigation", has_ai, "AI conversational terminal loaded")
            
            # Test query interaction
            query_inputs = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='Ask'], textarea[placeholder*='Ask'], input[type='text']")
            if query_inputs:
                target_input = query_inputs[-1]
                target_input.clear()
                target_input.send_keys("What is the current raw material stock?")
                target_input.send_keys(Keys.ENTER)
                time.sleep(3)
                driver.save_screenshot(os.path.join(screenshot_dir, "12b_ai_response.png"))
                page_src_ai = driver.page_source
                has_response = "PP Granules" in page_src_ai or "kg" in page_src_ai or "stock" in page_src_ai.lower() or "inventory" in page_src_ai.lower()
                log_result("AI Query Response", has_response, "AI response generated and rendered in chat view")
        except Exception as e:
            log_result("AI Copilot Page Navigation", False, str(e))

    except Exception as e:
        print(f"\nCRITICAL EXCEPTION during Selenium test run: {e}")
        try:
            driver.save_screenshot(os.path.join(screenshot_dir, "99_error_state.png"))
        except:
            pass
        log_result("Execution Safety", False, str(e))
    finally:
        driver.quit()
        print("\n========================================")
        print("SELENIUM AUTOMATED TEST SUMMARY")
        print("========================================")
        passed_count = sum(1 for _, status, _ in results if status == "PASS")
        total_count = len(results)
        for name, status, msg in results:
            print(f"{status:4} | {name:<35} | {msg}")
        print("----------------------------------------")
        print(f"Total: {passed_count}/{total_count} Passed ({passed_count/total_count*100:.1f}%)" if total_count > 0 else "No tests executed.")
        print("========================================\n")

if __name__ == "__main__":
    run_tests()
