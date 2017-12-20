module.exports = function(grunt) {
    //noinspection JSUnresolvedFunction
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        copy: {
            default: {
                files: [
                    {
                        cwd: './app',
                        src: ['**/*', '!**/*.js', 'lib/**/*.js', '!lib/**/*.min.js', 'initmap.js', 'js/*.js'],
                        dest: './dist',
                        expand: true,
                        flatten: false
                    }
                ]
            },
            deploy: {
                files: [
                    {
                        cwd: './src',
                        src: ['**/*', '!build.txt', '!lib/idsmap.js'],
                        dest: '../../deploy/web/idsWeiXin',
                        expand: true,
                        flattern: false
                    }
                ]
            },
            removeDistConfig: {
                cwd: './dist',
                src: ['main.js', 'lib/idsmap.js', 'lib/idsmap.min.js'],
                dest: './dist',
                expand: true,
                flatten: false,
                options: {
                    process: function(content) {
                        "use strict";
                        return content.replace(/_STARTHASHTAG([\s\S]*?)_ENDHASHTAG:1,/g, "");
                    }
                }
            },
            removeLibraryConfig: {
                cwd: './app',
                src: ['lib/idsmap.js', 'lib/idsmap.min.js'],
                dest: './app',
                expand: true,
                flatten: false,
                options: {
                    process: function(content) {
                        "use strict";
                        return content.replace(/_STARTHASHTAG([\s\S]*?)_ENDHASHTAG:1,/g, "");
                    }
                }
            },
            updateRequireAnchor: {
                src: "./dist/index.html",
                dest: "./dist/index.html",
                options: {
                    process: function(content) {
                        "use strict";
                        return content.replace(/src="lib\/require.js"/g, 'src="main.js"');
                    }
                }
            },
            updateLibraryExample: {
                src: "./dist/library_example.html",
                dest: "./dist/library_example.html",
                options: {
                    process: function(content) {
                        "use strict";
                        return content.replace(/src=".\/lib\/idsmap.js"/g, 'src="./lib/idsmap.min.js"');
                    }
                }
            }
        },
        replace: {},
        clean: {
            clearDist: {
                options: {
                    force: true
                },
                src: ['./dist/**/*']
            },
            clearDeploy: {
                options: {
                    force: true
                },
                src: ['../../deploy/web/IDSWebSMap/**/*']
            }
        },
        uglify: {
            main: {
                options: {
                    preserveComments: false,
                    mangle: false,
                    max_line_length: 300,
                    no_mangle: true
                },
                expand: true,
                flatten: false,
                cwd: './src/Common/JS',
                src: ['**/*.js'],
                dest: './dist/'
            }
        },
        requirejs: {
            release: {
                options: {
                    name: './lib/almond',
                    baseUrl: './app',
                    include: ['./main'],
                    out: './dist/main.js',
                    mainConfigFile: './app/main.js',
                    removeCombined: true,
                    preserveLicenseComments: false,
                    wrap: {
                        start: "(function() {'use strict';",
                        end: "}.call(this));"
                    },
                    generateSourceMaps: false,
                    writeBuildTxt: false
                }
            },
            pack: {
                options: {
                    name: './lib/almond',
                    baseUrl: './app',
                    include: ['./pack'],
                    out: './app/lib/idsmap.min.js',
                    mainConfigFile: './app/pack.js',
                    removeCombined: true,
                    preserveLicenseComments: false,
                    wrap: {
                        start: "(function() {'use strict';",
                        end: "}.call(this));"
                    },
                    generateSourceMaps: false,
                    writeBuildTxt: false
                }
            },
            dev: {
                options: {
                    optimize: 'none',
                    name: './lib/almond',
                    baseUrl: './app',
                    include: ['./main'],
                    out: './dist/main.js',
                    mainConfigFile: './app/main.js',
                    removeCombined: true,
                    preserveLicenseComments: false,
                    wrap: {
                        start: "(function() {'use strict';",
                        end: "}.call(this));"
                    }
                }
            },
            packDev: {
                options: {
                    optimize: 'none',
                    name: './lib/almond',
                    baseUrl: './app',
                    include: ['./pack'],
                    out: './app/lib/idsmap.js',
                    mainConfigFile: './app/pack.js',
                    removeCombined: true,
                    preserveLicenseComments: false,
                    wrap: {
                        start: "(function() {'use strict';",
                        end: "}.call(this));"
                    },
                    // error: function(done, err) {
                    //     grunt.log.warn(err);
                    //     done();
                    // }
                }
            },
            copyOthers: {
                options: {
                    appDir: './app',
                    dir: './dist',
                    optimize: 'none',
                    name: 'main',
                    baseUrl: '.',
                    mainConfigFile: './app/main.js',
                    removeCombined: true,
                    preserveLicenseComments: false,
                    wrap: {
                        start: "(function() {'use strict';",
                        end: "}.call(this));"
                    }
                }
            }
        },
        purifycss: {
            options: {},
            library: {
                src: ['app/**/*.html', 'app/**/*.js'],
                css: ['app/lib/common.css', 'app/lib/clipped.css'],
                dest: 'app/lib/idsmap.css'
            },
            example: {
                src: ['dist/**/*.html', 'dist/**/*.js'],
                css: ['dist/lib/common.css', 'dist/lib/bootstrap.min.css', 'dist/lib/clipped.css'],
                dest: 'dist/lib/combined.css'
            }
        },
        cssmin: {
            options: {
                mergeIntoShorthands: false,
                roundingPrecision: -1
            },
            target: {
                files: {
                    'dist/lib/combined.css': ['dist/lib/combined.css']
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-purifycss');

    grunt.registerTask("deployWebSMap", [
        'buildWebSMap',
        'clean:clearDeploy',
        'copy:deploy'
    ]);

    grunt.registerTask("deployWebSMapDev", [
        'buildWebSMapDev',
        'clean:clearDeploy',
        'copy:deploy'
    ]);

    grunt.registerTask("copyToDeploy", [
        'clean:clearDeploy',
        'copy:deploy'
    ]);

    grunt.registerTask("buildWebSMap", [
        'clean:clearDist',
        'requirejs:pack',
        'copy:default',
        'requirejs:release',
        'postProcessDeployFiles',
        'purifycss:example',
        'purifycss:library',
        'cssmin'
    ]);

    grunt.registerTask("buildWebSMapDev", [
        'clean:clearDist',
        'requirejs:packDev',
        'copy:default',
        'requirejs:dev',
        'postProcessDeployFiles'
    ]);

    grunt.registerTask('buildSMapLibrary', [
        'purifycss:library',
        'requirejs:pack',
        'copy:removeLibraryConfig'
    ]);

    grunt.registerTask('buildSMapLibraryDev', [
        'purifycss:library',
        'requirejs:packDev',
        'copy:removeLibraryConfig'
    ]);

    grunt.registerTask('postProcessDeployFiles', [
        'copy:removeLibraryConfig',
        'copy:removeDistConfig',
        'copy:updateRequireAnchor',
        'copy:updateLibraryExample'
    ]);

    grunt.registerTask('buildWeiXinProkect',{

    });

};