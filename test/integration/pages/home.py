from pypom import Page, Region
from selenium.webdriver.common.by import By


class Home(Page):

    _entries_locator = (By.CSS_SELECTOR, '.scrolling-list__scrolling-list___1xIz3 .item-summary__item-summary___2v2KL')
    _lockie_locator = (By.CLASS_NAME, 'homepage__homepage___2CPGF')
    _new_entry_locator = (By.CLASS_NAME, 'button__button___267m4')
    _save_entry_locator = (By.CSS_SELECTOR, '.item-details__buttons___1sQEJ .button__button___267m4')

    @property
    def lockie(self):
        return self.find_element(*self._lockie_locator).text

    def add_entry(self):
        self.find_element(*self._new_entry_locator).click()
        self.find_element(*self._save_entry_locator).click()

    @property
    def entries(self):
        els = self.find_elements(*self._entries_locator)
        return [Entry(self, el) for el in els]


class Entry(Region):

    _name_locator = (By.CSS_SELECTOR, '.item-summary__title___4iGCw')

    @property
    def name(self):
        return self.find_element(*self._name_locator).text
