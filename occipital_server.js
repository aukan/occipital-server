var Ne = require('neon');
var Occipital = require('occipital');
var exec = require('child_process').exec;

Occipital.Server = {};

Ne.Class(Occipital, 'Server')({
    prototype        : {
        path         : require('path'),
        fs           : require('fs'),
        express      : require('express'),
        http         : require('http'),
        app          : null,
        port         : 3001,
        paramsPattern : RegExp([
          '\\/(',                                         // full_file_name
              '([^\\/\\.]+)',                             // file_name
              '(?:\\.(\\d*x\\d*))?',                      // geometry, e.g 20x30, 40x, x100 - optional
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
            var occ = this;

            this.app.get('*', function (req, res) {
                var params = occ._getOccipitalParams(req);
                var originalImagePath, requestedImagePath;

                if (params) {
                    originalImagePath = occ.path.join(occ.config.storage.basePath, occ.path.dirname(req.url), '/' + params.fileName + '.' + params.extension );
                    requestedImagePath = occ.path.join(occ.config.storage.basePath, occ.path.dirname(req.url), '/' + params.fullFileName );

                    occ.fs.exists(originalImagePath, function(originalExists) {

                        if (originalExists ) {
                            // Generate new image based on parameters.
                            occ._generateNewImage(originalImagePath, requestedImagePath, params);
                            res.sendfile(requestedImagePath);

                        } else {
                            originalImageUrl = occ.path.join('/', occ.path.dirname(req.url), '/' + params.fileName + '.' + params.extension);

                            // Fetch for original image if there is a fallbackServer.
                            if (occ.config.fallbackServer) {
                                exec('mkdir -p ' + occ.path.dirname(originalImagePath), function (error, stdout, stderr) {
                                    exec('curl ' + occ.config.fallbackServer + originalImageUrl + ' -o ' + originalImagePath + ' --retry 2 -m 5 -f -s', function (error, stdout, stderr) {

                                        if (error !== null) {
                                            exec('rmdir -p ' + occ.path.dirname(originalImagePath), function (error, stdout, stderr) {
                                                res.send(404, 'Not found');
                                            });
                                        } else {
                                            // Generate new image based on parameters.
                                            occ._generateNewImage(originalImagePath, requestedImagePath, params);
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
                if (req.params.destiny) {
                } else if (req.params.file) {
                }

                res.send('');
            });
        },

        _generateNewImage : function _generateNewImage (originalImagePath, requestedImagePath) {
            var occ = this;

            fd = occ.fs.openSync(requestedImagePath, 'w');
            occ.fs.writeSync(fd, 'hola');
            occ.fs.closeSync(fd);
        },

        _processImage : function _processImage (req, res) {
        },

        _moveImage : function _moveImage () {
            var sourcePath, destinyPath;

            sourcePath = this.path.join(this.storagePath, req.fullPath);
        },

        _getOccipitalParams : function _getOccipitalParams (req) {
            var matches;
            var occipital = this;

            matches = req.url.match(occipital.paramsPattern);

            return (matches) ? {
                fullFileName  : matches[1],
                fileName      : matches[2],
                geometry      : matches[3],
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
