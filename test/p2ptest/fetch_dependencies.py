import os
import argparse

try:
  import urllib2 as u
except:
  import urllib.request as u


URLS = {'q.js': 'https://raw.githubusercontent.com/kriskowal/q/c2f5a6f35456389a806acca50bfd929cbe30c4cb/q.js',
        'jquery.min.js': 'https://code.jquery.com/jquery-1.10.2.min.js',
        'socket.io.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js'
        }

DEPS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dependencies'))


def download(file_name, url):
  req = u.Request(url)
  res_data = u.urlopen(req)
  with open(os.path.join(DEPS_PATH, file_name), 'wb') as f:
    f.write(res_data.read())


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Download some files into ./dependencies')
  parser.parse_args()
  if not os.path.exists(DEPS_PATH):
    os.makedirs(DEPS_PATH)
  for name, url in URLS.items():
    download(name, url)
