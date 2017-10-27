import os
import time

import pytest
from selenium.webdriver.support.ui import WebDriverWait

from pages.login import Login


@pytest.fixture
def firefox_options(firefox_options):
    """Configure Firefox preferences."""
    firefox_options.set_preference('extensions.legacy.enabled', True)
    return firefox_options


@pytest.fixture
def selenium(pytestconfig, selenium):
    """Install Lockbox."""
    addon = os.path.join(pytestconfig.rootdir, 'addon.xpi')
    selenium.install_addon(addon, temporary=True)
    return selenium


@pytest.fixture
def login_page(selenium, base_url):
    """Launch Lockbox."""
    window_handles = selenium.window_handles
    time.sleep(1)  # FIXME: replace with a suitable wait
    wait = WebDriverWait(selenium, timeout=10)
    with selenium.context(selenium.CONTEXT_CHROME):
        el = selenium.find_element_by_id('lockbox_mozilla_com-browser-action')
        el.click()
    wait.until(lambda s: len(s.window_handles) > len(window_handles))
    selenium.switch_to.window(selenium.window_handles[-1])
    return Login(selenium, base_url).wait_for_page_to_load()


@pytest.fixture
def home_page(login_page):
    """Login to Lockbox."""
    return login_page.login('password')
