const JSDOMEnvironment = require('jest-environment-jsdom');
const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');
const config = require("../config.json");

class FirebaseEnvironment extends JSDOMEnvironment {
    async setup() {
        await super.setup();

        // TODO: Call FirebaseAdapter.init
        console.log(`env setup: config = ${JSON.stringify(config)}`);
        var app = firebase.initializeApp(config);
        // this.global.firebase = firebase;
        console.log(`env setup: app = ${typeof app}, firestore = ${typeof firebase.firebase}`);
    }
    async teardown() {
        delete this.global.firebase;
        await super.teardown();
    }
}


module.exports = FirebaseEnvironment;
