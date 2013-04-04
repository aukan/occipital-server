var exec = require('child_process').exec;

exec('curl --data-urlencode \'destiny=/image2.png\' http://localhost:3001/image3.png', function (error, stdout, stderr) {
    if (error !== null) {
        console.error('Couldn\'t move file');
    } else {
        console.log('Moved image correctly.');
    }
});
