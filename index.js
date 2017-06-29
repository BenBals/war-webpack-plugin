'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _archiver = require('archiver');

var _archiver2 = _interopRequireDefault(_archiver);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _download = require('download');

var _download2 = _interopRequireDefault(_download);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WarPlugin = function () {
    function WarPlugin(options) {
        _classCallCheck(this, WarPlugin);

        this.outputFile = options.outputFile || './example.war';
        this.files = options.files || [];
        this.html5 = options.html5 || null;
        if (this.html5 !== null) {
            this.html5.jarUrl = this.html5.jarUrl || 'http://central.maven.org/maven2/org/tuckey/urlrewritefilter/4.0.3/urlrewritefilter-4.0.3.jar';
            this.html5.paths = this.html5.paths || [];
            this.html5.description = this.html5.description || 'Deployment of static files.';
            this.html5.displayName = this.html5.displayName || 'StaticFileWar';
        }
    }

    _createClass(WarPlugin, [{
        key: 'apply',
        value: function apply(compiler) {
            var _this = this;

            var zipOptions = {
                zlib: { level: 0 },
                store: true
            };

            compiler.plugin('emit', function (compilation, callback) {
                // assets from child compilers will be included in the parent so we should not run in child compilers
                if (compiler.isChild()) {
                    callback();
                    return;
                }

                var archive = (0, _archiver2.default)('zip', zipOptions);

                var output = _fs2.default.createWriteStream(_this.outputFile);
                output.on('close', function () {
                    callback();
                });

                archive.on('error', function (err) {
                    throw err;
                });

                archive.pipe(output);

                // Append each asset from webpack to the archive
                Object.keys(compilation.assets).forEach(function (key) {
                    var source = compilation.assets[key].source();
                    source = Buffer.isBuffer(source) ? source : new Buffer(source);
                    archive.append(source, { name: key });
                });

                // Append additional files to the archive
                _this.files.forEach(function (file) {
                    archive.file(_path2.default.resolve(file), { name: _path2.default.basename(_path2.default.resolve(file)) });
                });

                if (_this.html5 === null) {
                    archive.finalize();
                } else {
                    archive.append(_this._generateWebXmlBuffer(), { name: 'WEB-INF/web.xml' });
                    archive.append(_this._generateUrlRewriteXmlBuffer(), { name: 'WEB-INF/urlrewrite.xml' });

                    // Download the url rewrite jar and finish the archive when ready
                    (0, _download2.default)(_this.html5.jarUrl).then(function (data) {
                        archive.append(data, { name: 'WEB-INF/lib/urlrewritefilter.jar' });
                        archive.finalize();
                    });
                }
            });
        }
    }, {
        key: '_generateUrlRewriteXmlBuffer',
        value: function _generateUrlRewriteXmlBuffer() {
            var urlrewriteXml = '<urlrewrite default-match-type="wildcard">';
            this.html5.paths.forEach(function (p) {
                urlrewriteXml += '<rule><from>' + p + '</from><to>/index.html</to></rule>';
            });
            urlrewriteXml += '</urlrewrite>';
            return Buffer.from(urlrewriteXml, 'utf8');
        }
    }, {
        key: '_generateWebXmlBuffer',
        value: function _generateWebXmlBuffer() {
            // Careful, no blank space before <?xml
            var webXml = '<?xml version="1.0" encoding="UTF-8"?>\n            <web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd" version="4.0" metadata-complete="true">\n                <description>' + this.html5.description + '</description>\n                <display-name>' + this.html5.displayName + '</display-name>\n                <filter>\n                    <filter-name>UrlRewriteFilter</filter-name>\n                    <filter-class>org.tuckey.web.filters.urlrewrite.UrlRewriteFilter</filter-class>\n                </filter>\n                <filter-mapping>\n                    <filter-name>UrlRewriteFilter</filter-name>\n                    <url-pattern>/*</url-pattern>\n                    <dispatcher>REQUEST</dispatcher>\n                    <dispatcher>FORWARD</dispatcher>\n                </filter-mapping>\n            </web-app>';
            return Buffer.from(webXml, 'utf8');
        }
    }]);

    return WarPlugin;
}();

exports.default = WarPlugin;
