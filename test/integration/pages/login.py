from pypom import Page
from selenium.webdriver.common.by import By

from pages.home import Home


class Login(Page):

    _password_locator = (By.NAME, 'password')
    _confirm_password_locator = (By.NAME, 'confirmPassword')
    _continue_locator = (By.CLASS_NAME, 'button__button___267m4')

    def login(self, password):
        self.find_element(*self._password_locator).send_keys(password)
        self.find_element(*self._confirm_password_locator).send_keys(password)
        window_handles = self.selenium.window_handles
        self.find_element(*self._continue_locator).click()
        # FIXME: after logging in a new tab is opened with the home pages
        # and the tab with the login page is closed. This waits for the window
        # handles to change and for the number of windows (tabs) to revert.
        # We should do something smarter here, or Lockbox should reuse the same
        # tab (arguably a better user experience too).
        self.wait.until(
            lambda s: s.window_handles != window_handles and
            len(s.window_handles) == len(window_handles))
        self.selenium.switch_to.window(self.selenium.window_handles[-1])
        return Home(self.selenium, self.base_url).wait_for_page_to_load()
