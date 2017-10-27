def test_login(login_page):
    """Log into Lockbox."""
    home_page = login_page.login('password')
    assert 'Welcome to Lockbox!' in home_page.lockie


def test_add_entry(home_page):
    """Add a new entry"""
    home_page.add_entry()
    assert len(home_page.entries) == 1
    assert home_page.entries[0].name == '(No Entry Name)'
