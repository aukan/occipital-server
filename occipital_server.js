var Ne = require('neon');
var Occipital = require('occipital');

Occipital.Server = {};

Ne.Class(Occipital, 'Server')({
    prototype : {
        http : require('http'),
        init : function init (config) {
            Object.keys(config).forEach(function (property) {
                this[property] = config[property];
            }, this);

            this.server = this.http.createServer(this.handleRequest);
        },

        listen : function listen (port) {
            this.server.listen(port);
        },

        handleRequest : function handleRequest (request, response) {
            console.log('request received');
            response.writeHead(200, {"Content-Type": "text/plain"});
            console.log('hola');
            response.write('hola');
            response.end();
        }
    }
});

new Occipital.Server({}).listen(3000);
