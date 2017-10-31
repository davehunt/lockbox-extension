from pypom import Page
from selenium.webdriver.common.by import By

from pages.home import Home


class Login(Page):

    _password_locator = (By.NAME, 'password')
    _confirm_password_locator = (By.NAME, 'confirmPassword')
    _continue_locator = (By.CLASS_NAME, 'button__button___267m4')

    def wait_for_page_to_load(self):
        self.wait.until(lambda s: any(s.find_elements(*self._password_locator)))
        return self

    def login(self, password):
        self.find_element(*self._password_locator).send_keys(password)
        self.find_element(*self._confirm_password_locator).send_keys(password)
        window_handles = self.selenium.window_handles
        self.find_element(*self._continue_locator).click()
        # FIXME: after logging in a new tab is opened with the home page. This
        # waits for the new tab and then switches focus to the last handle.
        # We should do something smarter here, or Lockbox should reuse the same
        # tab (arguably a better user experience too).
        self.wait.until(lambda s: len(s.window_handles) > len(window_handles))
        self.selenium.switch_to.window(self.selenium.window_handles[-1])
        return Home(self.selenium).wait_for_page_to_load()