/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const del = require('del');
const spawn = require('child_process').spawn;
const superstatic = require('superstatic').server;

/**
 * Cleans the prpl-server build in the server directory.
 */
gulp.task('prpl-server:clean', () => {
  return del('server/build');
});

/**
 * Copies the prpl-server build to the server directory while renaming the
 * node_modules directory so services like App Engine will upload it.
 */
gulp.task('prpl-server:build', () => {
  const pattern = 'node_modules';
  const replacement = 'node_assets';

  return gulp.src('build/**')
    .pipe(rename(((path) => {
      path.basename = path.basename.replace(pattern, replacement);
      path.dirname = path.dirname.replace(pattern, replacement);
    })))
    .pipe(replace(pattern, replacement))
    .pipe(gulp.dest('server/build'));
});

gulp.task('prpl-server', gulp.series(
  'prpl-server:clean',
  'prpl-server:build'
));

/**
 * Gulp task to run equivalent of `firebase serve`.
 */
gulp.task('serve', () => {
  const firebaseJson = JSON.parse(fs.readFileSync('./firebase.json', 'utf8'));

  // Customize the firebase hosting config:
  //  - Add rewrites to serve the firebase SDK scripts from node_modules. This
  //    allows local serving when offline.
  const config = { ...firebaseJson.hosting };
  config.rewrites.push({
    source: '/__/firebase/5.7.2/firebase-app.js',
    destination: `node_modules/firebase/firebase-app.js`
  });
  config.rewrites.push({
    source: '/__/firebase/5.7.2/firebase-auth.js',
    destination: `node_modules/firebase/firebase-auth.js`
  });
  config.rewrites.push({
    source: '/__/firebase/5.7.2/firebase-firestore.js',
    destination: `node_modules/firebase/firebase-firestore.js`
  });

  const options = {
    port: 5000,
    cwd: __dirname,
    config: config,
    compression: true,
    debug: true
  };

  const serve = superstatic(options);
  serve.listen(function(err) {
    if (err) { console.log(err); }
    console.log(`Superstatic now serving on port ${options.port} ...`);
  });
});
