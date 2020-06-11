module.exports = function(grunt) {
    grunt.initConfig({
        clean: ["lib"],
        ts: {
            default : {
                tsconfig: true,
                src: ["**/*.ts", "!node_modules/**/*.ts"],
                options: {
                    rootDir: "src"
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask('default', ["clean", "ts"]);
};
