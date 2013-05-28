occipital-server
=====================

Occipital is a wrapper for an image processing library. Occipital Server is an image file server that performs operations over images on-demand based 
on the given parameters.

Given that you already have image.png on the root of the storage you configured occipital-server to have, you can request transformations like the following:

```sh
# This returns the original image.
GET /image.png

# This will resize image.png to fit 200x200 conserving the original aspect ratio.
GET /image.200x200.png

# This will crop image.png 200x200 starting at 265_215, then try to fit the image in a 200x200 container.
GET /image.200x200.200_200_265_215.png

# This will blend the image with a color layer, with opacity at 60%
GET /image.blend=00ffff&opacity=60.png
```

In all previous cases, you always get the processed image. In case that the image was requested before, you will get the cached version of the processed image.
This means that occipital-server just transforms the image once, after that it serves the cache.

## Getting Started

Install nodejs (http://nodejs.org) and npm (http://npmjs.org).

Clone the repo from github.com:

```sh
git clone git://github.com/aukan/occipital-server.git
```

Install npm dependencies:
```sh
cd occipital-server
npm install
```

To start the occipital server:
```sh
./occipital
```

The default configuration file is on config/occipital-server.json, also the default port is 3001.

After the server started, you should be able to see a happy face on http://localhost:3001/image.png

You can start playing with the options. Try hitting the following urls:

* http://localhost:3001/image.200x200.png
* http://localhost:3001/image.200x200.200_200_265_215.png
* http://localhost:3001/image.blend=00ffff&opacity=60.png

Try uploading an image:

```sh
curl http://www.google.com/images/srpr/logo4w.png > tempfile.png && curl -F 'file=@tempfile.png' http://localhost:3001/google.png && rm tempfile.png
```

Then open http://localhost:3001/google.png.

## Installation

### Installing Prerequisites.

#### NodeJs and npm.

You can find deeper information on how to install nodejs on http://nodejs.org. For a quick installation:

##### On Ubuntu

```sh
sudo apt-get update
sudo apt-get install python-software-properties python g++ make
sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs
```

##### On OSX

```sh
brew install node
```

### Installing the Occipital Server.

Clone the repo from github.com:

```sh
git clone git://github.com/aukan/occipital-server.git
```

Install npm dependencies:
```sh
cd occipital-server
npm install
```

## Configuration

Occipital has a configuration file (by default on {app_root}/config/occipital_server.json) that has the following options:

* occipitalUtilityWrapper. This option allows you to choose a different image processing library for the server. As for now, there is only one utility wrapper: imagemagick.
* fallbackServer. If this options exists, when an original image is not found on the current occipital server, then 
* storage#basePath
