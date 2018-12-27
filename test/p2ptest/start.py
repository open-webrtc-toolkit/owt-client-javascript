import subprocess
import os
import argparse

HOME_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__)))
KARMA_PATH = os.path.join(HOME_PATH, 'node_modules/karma/bin/karma')
CHROME_CONFIG_PATH = os.path.join(HOME_PATH, 'karma_config/chrome.config.js')
FIREFOX_CONFIG_PATH = os.path.join(HOME_PATH, 'karma_config/firefox.config.js')
SAFARI_CONFIG_PATH = os.path.join(HOME_PATH, 'karma_config/safari.config.js')


def run(browser):
  if browser == 'chrome':
    test_config = CHROME_CONFIG_PATH
  elif browser == 'firefox':
    test_config = FIREFOX_CONFIG_PATH
  elif browser == 'safari':
    test_config = SAFARI_CONFIG_PATH
  cmd = [KARMA_PATH, 'start', test_config]
  subprocess.call(cmd, cwd=HOME_PATH)


if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument("--browsers", dest='browsers', required=True, nargs='+',
                      choices=('chrome', 'firefox', 'safari'),
                      help="Which browsers will be test.")
  args = parser.parse_args()

  for browser in args.browsers:
    run(browser)
