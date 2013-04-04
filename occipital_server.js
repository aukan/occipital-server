var Ne = require('neon');
var Occipital = require('occipital');

Ne.Class(Occipital, 'Server')({
    prototype        : {
        path         : require('path'),
        fs           : require('fs'),
        exec         : require('child_process').exec,
        occipital    : require('occipital'),
        express      : require('express'),
        http         : require('http'),
        app          : null,
        port         : 3001,
        paramsPattern : RegExp([
          '\\/(',                                         // full_file_name
              '([^\\/\\.]+)',                             // file_name
              '(?:\\.(\\d*x\\d*))?',                      // expectedSize, e.g 20x30, 40x, x100 - optional
              '(?:\\.([\\-\\d]+_[\\-\\d]+_\\d+_\\d+))?',  // crop, e.g 50-50-100-200 - optional
              '(?:\\.(\\w+=\\w+(?:&\\w+=\\w+)*))?',       // format options, e.g bgcolor=f7f7f7&fit=true - optional
              '\\.(\\w+)',                                // extension
              ')$',
        ].join(''), 'i'),

        init    : function init (config) {
            Object.keys(config).forEach(function (property) {
                this[property] = config[property];
            }, this);

            console.log('Initializing Occipital Server.');
            this.setConfiguration();

            // Set configuration variables
            this.storagePath = this.config.storage.basePath;

            this.app = this.express();
            this.lobe = new this.occipital.Lobe({ 'utilityWrapper' : this.config.occipitalUtilityWrapper });
            this.server = new this.http.createServer(this.app);
            this.initRack();
            this.initRoutes();
            this.server.listen(this.port);
            console.log('Occipital Server is now listening on port ' + this.port);
        },

        setConfiguration : function setConfiguration () {
            this.config = require( this.path.join(__dirname, 'config/occipital_server.json') );
            this.config.storage.basePath = this.config.storage.basePath.replace(/{app_root}/, __dirname);
        },

        initRack : function initRack () {
            this.app.use(this.express.logger());
            this.app.use(this.express.compress());
            this.app.use(this.express.bodyParser());
            this.app.use(this.express.static(this.storagePath));
        },

        initRoutes : function initRoutes () {
            var occs = this;

            this.app.get('*', function (req, res) {
                var params = occs._getOccipitalParams(req);
                var originalImagePath, requestedImagePath;

                if (params) {
                    originalImagePath = occs.path.join(occs.config.storage.basePath, occs.path.dirname(req.url), '/' + params.fileName + '.' + params.extension );
                    requestedImagePath = occs.path.join(occs.config.storage.basePath, occs.path.dirname(req.url), '/' + params.fullFileName );

                    occs.fs.exists(originalImagePath, function(originalExists) {

                        if (originalExists ) {
                            // Generate new image based on parameters.
                            occs._generateNewImage(originalImagePath, requestedImagePath, params);
                            res.sendfile(requestedImagePath);

                        } else {
                            originalImageUrl = occs.path.join('/', occs.path.dirname(req.url), '/' + params.fileName + '.' + params.extension);

                            // Fetch for original image if there is a fallbackServer.
                            if (occs.config.fallbackServer) {
                                occs.exec('mkdir -p ' + occs.path.dirname(originalImagePath), function (error, stdout, stderr) {
                                    occs.exec('curl ' + occs.config.fallbackServer + originalImageUrl + ' -o ' + originalImagePath + ' --retry 2 -m 5 -f -s', function (error, stdout, stderr) {

                                        if (error !== null) {
                                            occs.exec('rmdir -p ' + occs.path.dirname(originalImagePath), function (error, stdout, stderr) {
                                                res.send(404, 'Not found');
                                            });
                                        } else {
                                            // Generate new image based on parameters.
                                            occs._generateNewImage(originalImagePath, requestedImagePath, params);
                                            res.sendfile(requestedImagePath);
                                        }
                                    });
                                });

                            } else {
                                res.send(404, 'Not found');
                            }
                        }
                    });
                } else {
                    res.send(500, 'This request cannot be handled by this server. Are you sure you are requesting an image?');
                }

            });

            this.app.post('*', function (req, res) {
                if (req.body.destiny) {
                    occs._moveImage(req, res);
                } else if (req.body) {
                    occs._uploadImage(req, res);
                } else {
                    res.send(500, 'This request cannot be handled by this server.');
                }
            });
        },

        _generateNewImage : function _generateNewImage (originalImagePath, requestedImagePath, params) {
            var occs = this;
            var options;

            options = {
                outputOptions : []
            };

            // Transform app options to imagemagick options.
            // This might be removable later if we update our APIs.
            if (params.crop) {
                params.crop = params.crop.replace(/([0-9]+)_/, '$1x').replace(/_([0-9]+)_([0-9]+)$/, '+$1+$2');
                options.outputOptions.push({ crop     : params.crop });
            }

            if (params.expectedSize) {
                if (params.crop) {
                    options.outputOptions.push({ geometry   : params.expectedSize + "!" });
                } else {
                    options.outputOptions.push({ geometry   : params.expectedSize + "^" });
                    options.outputOptions.push({ gravity    : 'center' });
                    options.outputOptions.push({ crop   : params.expectedSize + '+0+0' });
                }
            }

            return occs.lobe.processSync(originalImagePath, requestedImagePath, options);
        },

        _moveImage : function _moveImage (req, res) {
            var occs = this;
            var sourcePath, destinyPath;

            sourcePath = this.path.join(this.storagePath, req.url);
            destinyPath = this.path.join(this.storagePath, req.body.destiny);

            occs.fs.exists(sourcePath, function(exists) {
                if (exists) {
                    occs.exec('mkdir -p ' + occs.path.dirname(destinyPath) + ' && mv ' + sourcePath + ' ' + destinyPath, function (error, stdout, stderr) {
                        if (error !== null) {
                            res.send(500, 'Move Error.');
                        } else {
                            occs.exec('rmdir -p ' + occs.path.dirname(sourcePath));
                            res.send(req.body.destiny);
                        }
                    });
                } else {
                    res.send(500, 'Source file does not exist.');
                }
            });
        },

        _uploadImage : function _uploadImage (req, res) {
            var occs = this;
            var fileName;
            var destinationFolder = occs.path.dirname(req.url);

            // Set filename
            if (req.url.match(/\/[^\/]+\.[^\/]+$/)) {
                fileName = occs.path.basename(req.url);
            } else {
                fileName = req.files.file.name.replace(/\..*\./,'.').replace(/ /,'_').replace(/[^a-zA-Z0-9\._]/,'');
            }

            // Moving file to its new location
            newFilePath = occs.path.join(occs.storagePath, destinationFolder, fileName);
            occs.exec('mkdir -p ' + occs.path.join(occs.storagePath, destinationFolder) + ' && mv ' + req.files.file.path + ' ' + newFilePath, function (error, stdout, stderr) {
                if (error !== null) {
                    req.send(500, 'Upload Error ' + req.url);
                } else {
                    // Resize image to its maximum
                    occs.lobe.processSync(newFilePath, newFilePath, {
                        outputOptions : [
                            { geometry : '4000000@' },
                        ]
                    });

                    res.send(occs.path.join('/', occs.path.dirname(req.url), fileName));
                }
            });
        },

        _getOccipitalParams : function _getOccipitalParams (req) {
            var matches;
            var occipital = this;

            matches = req.url.match(occipital.paramsPattern);

            return (matches) ? {
                fullFileName  : matches[1],
                fileName      : matches[2],
                expectedSize  : matches[3],
                crop          : matches[4],
                formatOptions : matches[5],
                extension     : matches[6]
            } : null;
        },

        notFound : function notFound (request, response) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write('Original image not found.');
            response.end();
        }
    }
});

new Occipital.Server({
    port : process.argv[2] || 3001,
});
