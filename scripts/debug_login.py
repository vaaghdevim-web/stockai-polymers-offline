import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options

chrome_opts = Options()
chrome_opts.add_argument('--headless=new')
chrome_opts.add_argument('--window-size=1920,1080')
driver = webdriver.Chrome(options=chrome_opts)
driver.get('http://localhost:5173')
time.sleep(2)

print('Initial Page Text:', driver.find_element(By.TAG_NAME, 'body').text.replace('\n', ' | '))

# Fill form
user_input = driver.find_element(By.CSS_SELECTOR, "input[type='text']")
user_input.clear()
user_input.send_keys('admin')

pass_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
pass_input.clear()
pass_input.send_keys('admin123')

submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
print('Clicking submit button...')
submit_btn.click()

time.sleep(3)
print('After Submit Page Text:', driver.find_element(By.TAG_NAME, 'body').text.replace('\n', ' | '))

inputs_after = driver.find_elements(By.TAG_NAME, 'input')
for inp in inputs_after:
    print('Input After:', inp.get_attribute('type'), inp.get_attribute('placeholder'), inp.get_attribute('value'))

driver.quit()
