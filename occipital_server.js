var Ne = require('neon');
var Occipital = require('occipital');

Occipital.Server = {};

Ne.Class(Occipital, 'Server')({
    prototype : {
        http : require('http'),
        init : function init (config) {
            var app = this;

            Object.keys(config).forEach(function (property) {
                this[property] = config[property];
            }, this);

            this.server = this.http.createServer(function (request, response) {
                app.handleRequest.call(this, app, request, response);
            });
        },

        listen : function listen (port) {
            this.server.listen(port);
        },

        handleRequest : function handleRequest (app, request, response) {
            console.log(request.body);
            if (request.method === "POST") {

            }
            return app.notFound(request, response);
        },

        notFound : function notFound (request, response) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write('Original image not found.');
            response.end();
        }
    }
});

new Occipital.Server({}).listen(3000);
