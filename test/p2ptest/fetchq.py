import os
import argparse
try:
  import urllib2 as u
except:
  import urllib.request as u

URL = "https://raw.githubusercontent.com/kriskowal/q/c2f5a6f35456389a806acca50bfd929cbe30c4cb/q.js"
HOME_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__)))


def download():
  req = u.Request(URL)
  res_data = u.urlopen(req)
  with open(os.path.join(HOME_PATH, 'js/q.js'), 'wb') as f:
    f.write(res_data.read())


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description="Download q.js into ./js")
  parser.parse_args()
  download()
