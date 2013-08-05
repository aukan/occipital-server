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

#### NodeJS and npm.

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

### Updating to the latest occipital version.

Remove node_modules and install packages again:

```sh
rm -r node_modules
npm install
```

## Configuration

Occipital has a configuration file (by default on {app_root}/config/occipital_server.json) that has the following options:

* occipitalUtilityWrapper.
  This option allows you to choose a different image processing library for the server. As for now, there is only one utility wrapper: imagemagick.

* fallbackServer. 
  If this options exists, when an original image is not found on the current occipital server, then a request to the fallback server is done to try to retrieve it.
  The value can be something like 'http://google.com'.

* storage#basePath. 
  With this you set the path where occipital-server will look for the images. You can see this as the public folder of the server.

This is an example of the configuration file:

```js
{
    "occipitalUtilityWrapper" : "imagemagick",
    "fallbackServer" : "http://google.com",
    "storage" : {
        "basePath" : "{app_root}/storage"
    }
}
```

## Usage.

### Starting the server.

#### As an executable.

To start the occipital server:

```sh
./occipital_server [options]
```

```
OPTIONS  
  -c, --config  
      Path to the configuration file.  
  -p, --port  
      Port on where the server will listen to requests.  
```

#### As a module.

You can also use occipital-server as a module on node. The following is an example on how to do so:

package.json
```js
{
    ...
    "dependencies" : {
        "occipital-server" : "git+ssh://git@github.com:aukan/occipital-server.git"
    }
}
```

occipital-custom-server
```js
#!/usr/bin/env node

# occipital-server
var Occipital = require('occipital-server');

new Occipital.Server({
    port : 3001,
    configFile : 'config/occipital-server.json'
});
```

To start the server:
```sh
./occipital-custom-server
```

### API

The API is all HTTP based.

#### Get an image.

GET /some/path/image.png

Returns the image.

PARAMETERS:  
No parameters are needed.

#### Transform and Get an image.

GET /some/path/image[.geometry][.crop][.extra_options].(extension)

PARAMETERS

```
geometry (width)x(height)  
    This is the spected size of the result after the transformation. No matter what other options you give, like cropping, at the end the size of the image will be the one you give on geometry. 
    If only the geometry is given, then the original aspect ratio is preserved.

    Example:  
      GET /some/path/image.100x100.png  
      This will resize the image to 100x100 preserving the aspect ratio.  

crop (width)_(height)_(top)_(left)   
    Crop the image with a square of width x height starting at (top, left). The result might be resized depending on geometry, 
    but if only crop is given then the result will have width x height of size.

    Examples:   
      GET /some/path/image.150_150_10_20  
      Crop the image with a square of 150x150 starting at the (10,20) pixel.  

      GET /some/path/image.150_150_10_20.100x100.png  
      Same as above, but rezise the result to 100x100.

extra_options key=value&key=value  
    Extra options right now includes blend, colorize and opacity.

    blend color  
      Blend the original image with the specified background color (hex color). The opacity aplies to the original image.

    colorize color  
      Merges the original image with a color layer with the specified color (hex color). The opacity aplies to the color layer.

    opacity percentage  
      Indicates the opacity of a layer depending on the selected option, either blend or colorize. Its a number between 0 to 100.

    Examples:  
      GET /some/path/image.blend=00ffff&opacity=80.png  
      Blend the image with a background with color #00ffff, giving the original image an opacity of 80%

      GET /some/path/image.colorize=ffaa00&opacity=50.png  
      Colorize the image with the color #00ffff, the color will have an opacity of 50%
```

#### Upload an image.

##### Uploading an image with multipart/form-data:

POST /some/path/[image.png]  
Content-Type: multipart/form-data  
Parameters: file

PARAMETERS:

```
url  
    The url that you make the request to, indicates the path where the image will be saved. The path is required, the image filename is taken from the file, in case that it wasn't specified on the url.

file  
    This is the name of the field where the file comes on the request.

EXAMPLE:

    POST /some/path/image.png  
    PARAMETERS: file = <someimage.png>

    This will upload someimage.png to /some/path/image.png. It will also resize it to a maximum of 2000x2000 preserving the aspect ratio.
```

##### Uploading an image with base64.

POST /some/path/image.png  
Parameters: file64

PARAMETERS:

```
url  
    The url that you make the request to, indicates the path where the image will be saved. The path and image filename are required for this case.

file64  
    The image encoded on base64.

EXAMPLE:

    POST /some/path/image.png  
    PARAMETERS: file64 = ewogICAgIm5hbWUi...
```

#### Move a file to a different path.

POST /source/path/image.png  
Parameters: destination = /destination/path

PARAMETERS:

```
url  
    The url where the request is made indicates the source path of the image that will be moved.

destination  
    The path where the image will be moved.

EXAMPLE:  
    POST /some/path/image.png  
    destination = /image2.png

    This will move the image from /some/path/image.png to /image2.png
```

#### Copy a file to a different path.

POST /source/path/image.png  
Parameters: destination = /destination/path

PARAMETERS:

```
url  
    The url where the request is made indicates the source path of the image that will be moved.

destination  
    The path where the image will be moved.

action
    Whether this is a copy action, or a move action. In this case it has to be equal to "copy".

EXAMPLE:  
    POST /some/path/image.png  
    destination = /image2.png

    This will move the image from /some/path/image.png to /image2.png
```

#### Bulk file movement.

POST /api
Parameters: movements = array

PARAMETERS:

```
movements
  Array containing the movements that are going to be performed. The format goes like the following:
  
  movements = [
    {
      source : /source/path,
      destination : /destination/path
    },
    ...
  ]

  In html format, it would be something like:

  movements[0][source] = /source/path/0
  movements[0][destination] = /destination/path/0
  movements[1][source] = /source/path/1
  movements[1][destination] = /destination/path/1
```
