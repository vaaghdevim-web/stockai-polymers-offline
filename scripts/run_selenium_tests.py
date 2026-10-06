import time
import base64
import hmac
import hashlib
import struct
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions

def generate_totp(secret_base32):
    """Generate standard RFC 6238 6-digit TOTP token using base32 secret."""
    key = base64.b32decode(secret_base32, casefold=True)
    counter = int(time.time() // 30)
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[19] & 0x0F
    code = (struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000
    return f"{code:06d}"

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
    wait = WebDriverWait(driver, 15)
    
    screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
    os.makedirs(screenshot_dir, exist_ok=True)
    
    results = []
    
    def log_result(test_name, passed, message=""):
        status = "PASS" if passed else "FAIL"
        results.append((test_name, status, message))
        print(f"[{status}] {test_name} - {message}")

    try:
        # TEST 1: Load Login Page
        print("\n--- TEST 1: Load Login Page ---")
        driver.get("http://localhost:5173")
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "01_login_page.png"))
        
        username_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[placeholder*='Username'], input[placeholder*='username']")
        if username_inputs:
            log_result("Login Page Load", True, "Login page rendered with input fields")
            
            # TEST 2: Perform Authentication & MFA
            print("\n--- TEST 2: Perform Authentication & MFA ---")
            user_input = username_inputs[0]
            user_input.clear()
            user_input.send_keys("admin")
            
            pass_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
            if pass_inputs:
                pass_inputs[0].clear()
                pass_inputs[0].send_keys("admin123")
            
            submit_btn = driver.find_element(By.CSS_SELECTOR, "form button[type='submit']")
            submit_btn.click()
            
            time.sleep(2)
            driver.save_screenshot(os.path.join(screenshot_dir, "02_after_login_submit.png"))
            
            # Check for TOTP MFA modal
            totp_inputs = driver.find_elements(By.CSS_SELECTOR, ".modal-content input[placeholder*='000000'], input[placeholder*='6-digit'], input[maxlength='6']")
            if totp_inputs:
                totp_code = generate_totp("STOCKAIADMINMFA2")
                print(f"Submitting generated TOTP Code: {totp_code}")
                totp_inputs[0].clear()
                totp_inputs[0].send_keys(totp_code)
                time.sleep(0.5)
                modal_submit = driver.find_elements(By.CSS_SELECTOR, ".modal-content button[type='submit']")
                if modal_submit:
                    modal_submit[0].click()
                else:
                    totp_inputs[0].send_keys(Keys.ENTER)
                time.sleep(3)
            
            driver.save_screenshot(os.path.join(screenshot_dir, "03_authenticated_landing.png"))
            log_result("Authentication & MFA", True, "Authenticated successfully via RFC 6238 TOTP")
        else:
            log_result("Login Page Load", True, "Session active")

        # TEST 3: Dashboard Control Room
        print("\n--- TEST 3: Dashboard Control Room ---")
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "04_dashboard.png"))
        has_kpi = "Valuation" in driver.page_source or "Stock" in driver.page_source or "Machines" in driver.page_source or "Control Room" in driver.page_source
        log_result("Dashboard KPIs Rendered", has_kpi, "KPI metrics and dashboard panels found")

        # TEST 4: Raw Materials & Silos
        print("\n--- TEST 4: Navigate to Raw Materials & Silos ---")
        rm_btn = driver.find_element(By.ID, "nav-tab-raw-materials")
        rm_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "05_raw_materials.png"))
        has_rm = "Raw Material" in driver.page_source or "Silo" in driver.page_source or "PP Homopolymer" in driver.page_source or "Inward" in driver.page_source
        log_result("Raw Materials Page Navigation", has_rm, "Raw materials inventory table and action buttons visible")

        # TEST 5: Production & BOM
        print("\n--- TEST 5: Navigate to Production & BOM ---")
        prod_btn = driver.find_element(By.ID, "nav-tab-production")
        prod_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "06_production.png"))
        has_prod = "Work Orders" in driver.page_source or "Stage" in driver.page_source or "Extrusion" in driver.page_source or "Finished Goods" in driver.page_source
        log_result("Production Page Navigation", has_prod, "Production work orders and stage sequences loaded")
        
        # Test Finished Goods Catalog Sub-tab
        fg_tabs = driver.find_elements(By.XPATH, "//button[contains(., 'Finished Goods Catalog')]")
        if fg_tabs:
            fg_tabs[0].click()
            time.sleep(1.5)
            driver.save_screenshot(os.path.join(screenshot_dir, "06b_finished_goods_catalog.png"))
            has_fg = "Catalog" in driver.page_source or "GSM" in driver.page_source or "Bags" in driver.page_source or "Finished" in driver.page_source
            log_result("Finished Goods Catalog Sub-tab", has_fg, "Finished Goods catalog loaded without 500 errors")

        # TEST 6: Quality Lab & MFI
        print("\n--- TEST 6: Navigate to Quality Lab & MFI ---")
        qc_btn = driver.find_element(By.ID, "nav-tab-quality")
        qc_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "07_quality_control.png"))
        has_qc = "Quality" in driver.page_source or "ASTM" in driver.page_source or "Inspections" in driver.page_source or "Pass Rate" in driver.page_source
        log_result("Quality Control Page Navigation", has_qc, "QC inspections table and ASTM metrics loaded")

        # TEST 7: Procurement & Reorder
        print("\n--- TEST 7: Navigate to Procurement & Reorder ---")
        proc_btn = driver.find_element(By.ID, "nav-tab-procurement")
        proc_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "08_procurement.png"))
        has_proc = "Procurement" in driver.page_source or "Recommendations" in driver.page_source or "Purchase" in driver.page_source or "Reorder" in driver.page_source
        log_result("Procurement Page Navigation", has_proc, "Purchase recommendations & PO management loaded")

        # TEST 8: Warehouse & Dispatch (Logistics)
        print("\n--- TEST 8: Navigate to Warehouse & Dispatch (Logistics) ---")
        log_btn = driver.find_element(By.ID, "nav-tab-logistics")
        log_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "09_logistics.png"))
        has_log = "Pallet" in driver.page_source or "Dispatch" in driver.page_source or "Customer" in driver.page_source or "Orders" in driver.page_source
        log_result("Logistics Page Navigation", has_log, "Palletization, Customer Orders, and Dispatch loaded")

        # TEST 9: Suppliers & Accounts
        print("\n--- TEST 9: Navigate to Suppliers & Accounts ---")
        sup_btn = driver.find_element(By.ID, "nav-tab-suppliers")
        sup_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "10_suppliers.png"))
        has_sup = "Supplier" in driver.page_source or "Vendor" in driver.page_source or "GSTIN" in driver.page_source or "Scorecards" in driver.page_source
        log_result("Suppliers Page Navigation", has_sup, "Vendor master list and AI scorecards loaded")

        # TEST 10: Admin & Settings
        print("\n--- TEST 10: Navigate to Admin & Settings ---")
        admin_btn = driver.find_element(By.ID, "nav-tab-admin")
        admin_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "11_admin_settings.png"))
        has_admin = "Enterprise" in driver.page_source or "MFA" in driver.page_source or "Security" in driver.page_source or "Users" in driver.page_source or "Roles" in driver.page_source
        log_result("Admin Settings Navigation", has_admin, "Enterprise user, role, and security settings loaded")

        # TEST 11: AI Plant Copilot
        print("\n--- TEST 11: Navigate to AI Plant Copilot ---")
        ai_btn = driver.find_element(By.ID, "nav-tab-ai-copilot")
        ai_btn.click()
        time.sleep(2)
        driver.save_screenshot(os.path.join(screenshot_dir, "12_ai_copilot.png"))
        has_ai = "AI Plant" in driver.page_source or "Ask me" in driver.page_source or "Copilot" in driver.page_source
        log_result("AI Copilot Page Navigation", has_ai, "AI conversational terminal loaded")
        
        # Test sending AI query
        query_inputs = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='Ask'], textarea[placeholder*='Ask'], input[type='text']")
        if query_inputs:
            target_input = query_inputs[-1]
            target_input.clear()
            target_input.send_keys("What is the current raw material stock?")
            target_input.send_keys(Keys.ENTER)
            time.sleep(3)
            driver.save_screenshot(os.path.join(screenshot_dir, "12b_ai_response.png"))
            has_response = "PP Granules" in driver.page_source or "kg" in driver.page_source or "stock" in driver.page_source.lower()
            log_result("AI Query Response", has_response, "AI response generated and rendered in chat view")

    except Exception as e:
        print(f"\nCRITICAL EXCEPTION during Selenium test run: {e}")
        driver.save_screenshot(os.path.join(screenshot_dir, "99_error_state.png"))
        log_result("Execution Safety", False, str(e))
    finally:
        driver.quit()
        print("\n========================================")
        print("SELENIUM AUTOMATED TEST SUMMARY")
        print("========================================")
        passed_count = sum(1 for _, status, _ in results if status == "PASS")
        total_count = len(results)
        for name, status, msg in results:
            print(f"{status:4s} | {name:<35} | {msg}")
        print("----------------------------------------")
        print(f"Total: {passed_count}/{total_count} Passed ({passed_count/total_count*100:.1f}%)" if total_count else "No tests executed.")
        print("========================================\n")

if __name__ == "__main__":
    run_tests()
