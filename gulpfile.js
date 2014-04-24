'use strict';

var gulp = require('gulp');
var $    = require('gulp-load-plugins')();

// port number dev server runs on
var port = 8008;

// temporary solution till https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

// file locations
var SRC_DIR   = 'app';
var SERVE_DIR = '.tmp';
var BUILD_DIR = 'dist';
var OUTPUT_DIR = SERVE_DIR;

// Less
gulp.task('less', function () {
  return gulp.src(SRC_DIR + '/less/main.less')
    .pipe($.plumber())
    .pipe($.newer(OUTPUT_DIR + '/css/main.css'))
    .pipe($.less())
    .on("error", $.notify.onError('Less failed…'))
    .on('error', $.util.log)
    .pipe($.autoprefixer())
    .pipe(gulp.dest(OUTPUT_DIR + '/css'));
})

// JS
gulp.task('js', function(){
  return gulp.src(SRC_DIR + '/js/main.js')
    .pipe($.plumber())
    .pipe($.newer(OUTPUT_DIR + '/js/main.js'))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.browserify({
      debug: true
    }))
    .on("error", $.notify.onError('Browserify failed…'))
    .on('error', $.util.log)
    .pipe(gulp.dest(OUTPUT_DIR + '/js'));
})

// HTML
gulp.task('html', function () {
  return gulp.src([SRC_DIR + '/**/*.html', '!SRC_DIR/fragments/**/*'])
    .pipe($.plumber())
    .pipe($.newer(OUTPUT_DIR))
    .pipe($.fileInclude())
    .on("error", $.notify.onError('HTML include failed…'))
    .on('error', $.util.log)
    .pipe(gulp.dest(OUTPUT_DIR));
});

gulp.task('images', function(){
  return gulp.src(SRC_DIR + '/images/**/*')
    .pipe($.plumber())
    .pipe($.newer(OUTPUT_DIR))
    .pipe(gulp.dest(OUTPUT_DIR + '/images/'));
})

// Clean
gulp.task('clean', function () {
  return gulp.src([OUTPUT_DIR], { read: false }).pipe($.rimraf());
});

// Run all the compile tasks
gulp.task('compile', ['less', 'js', 'html', 'images']);

// Minify all assets
gulp.task('minify', function(){
  var filter = {
    html: $.filter('**/*.html'),
    js: $.filter('**/*.js'),
    css: $.filter('**/*.css'),
    svg: $.filter('**/*.svg'),
    raster: $.filter('**/*.{png,gif,jpg}')
  };
  return gulp.src(OUTPUT_DIR + '/**')
    .pipe($.plumber())

    // minify HTML
    .pipe(filter.html)
    .pipe($.htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      caseSensitive: true,
      minifyJS: true
    }))
    .on("error", $.notify.onError('HTML minify failed…'))
    .on('error', $.util.log)
    .pipe(filter.html.restore())

    // minify JS
    .pipe(filter.js)
    .pipe($.uglify())
    .on("error", $.notify.onError('Uglify failed…'))
    .on('error', $.util.log)
    .pipe(filter.js.restore())

    // minify CSS
    .pipe(filter.css)
    .pipe($.csso())
    .on("error", $.notify.onError('Csso failed…'))
    .on('error', $.util.log)
    .pipe(filter.css.restore())

    // minify SVGs
    .pipe(filter.svg)
    .pipe($.svgmin())
    .pipe(filter.svg.restore())

    // compress images
    .pipe(filter.raster)
    .pipe($.imagemin())
    .pipe(filter.raster.restore())

    // save it all
    .pipe(gulp.dest(OUTPUT_DIR))
    .pipe($.size({showFiles: true}));
});

// watch dev files for recompilation and livereload when OUTPUT_DIR updates
gulp.task('watch', function(){
  gulp.watch(SRC_DIR + '/less/**/*.less', ['less']);
  gulp.watch(SRC_DIR + '/js/**/*.js', ['js']);
  gulp.watch(SRC_DIR + '/**/*.html', ['html']);
  gulp.watch(SRC_DIR + '/**/*.svg', ['images']);

  var server = $.livereload();
  gulp.watch(OUTPUT_DIR + '/**/*').on('change', function (file) {
    server.changed(file.path);
    console.log(file.path + ' changed.');
  });
})

// Run a dev server
gulp.task('connect', function() {
  var connect = require('connect'),
  server = connect()
    .use(require('connect-livereload')({port: 35729}))
    .use(connect.static(OUTPUT_DIR));
  require('http').createServer(server)
    .listen(port)
    .on('listening', function () {
      console.log('Started connect web server on http://localhost:' + port);
    })
    .on('close', function(){
      console.log('stopped server');
      gulp.start('clean');
    });
})

// Dev mode
gulp.task('dev', ['clean'], function(){
  // livereload needs the rebuild files before starting, so use runSequence till gulp 4.
  runSequence('compile', ['watch', 'connect']);
});

// Perform a build
gulp.task('build', function () {
  OUTPUT_DIR = BUILD_DIR;
  runSequence('clean', 'compile', 'minify');
});